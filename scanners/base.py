"""Base scanner class and listing data model."""

import hashlib
import logging
import random
import time
from dataclasses import dataclass, field
from datetime import datetime
from typing import Optional

import requests

try:
    from fake_useragent import UserAgent
except ImportError:
    UserAgent = None

logger = logging.getLogger(__name__)

# Prefer lxml but fall back to html.parser on Windows if not installed
try:
    import lxml  # noqa: F401
    HTML_PARSER = "lxml"
except ImportError:
    HTML_PARSER = "html.parser"


@dataclass
class Listing:
    """Represents a marketplace listing."""
    title: str
    price: str
    url: str
    location: str
    marketplace: str
    description: str = ""
    image_url: str = ""
    date_found: datetime = field(default_factory=datetime.now)
    listing_id: str = ""

    def __post_init__(self):
        if not self.listing_id:
            raw = f"{self.marketplace}:{self.url}:{self.title}"
            self.listing_id = hashlib.md5(raw.encode()).hexdigest()

    def summary(self) -> str:
        lines = [
            f"[{self.marketplace}] {self.title}",
            f"  Price: {self.price}",
            f"  Location: {self.location}",
            f"  URL: {self.url}",
        ]
        if self.description:
            desc = self.description[:200]
            lines.append(f"  Description: {desc}")
        return "\n".join(lines)


class BaseScanner:
    """Base class for marketplace scanners."""

    name: str = "Unknown"
    base_url: str = ""

    # Per-scanner rate limiting defaults (seconds between requests).
    # Subclasses can override these to be more or less aggressive.
    min_request_delay: float = 1.5   # minimum pause between requests
    max_request_delay: float = 3.5   # maximum pause (jittered)
    max_retries: int = 3             # retry count on failure / 429
    backoff_ceiling: float = 120.0   # never wait longer than this on backoff

    # Australian state/city search locations
    AU_LOCATIONS = [
        # Major cities
        "sydney", "melbourne", "brisbane", "perth", "adelaide",
        "hobart", "darwin", "canberra",
        # States / broad regions
        "new-south-wales", "victoria", "queensland",
        "western-australia", "south-australia", "tasmania",
        "northern-territory", "australian-capital-territory",
    ]

    def __init__(self, search_terms: list[str] | None = None):
        self.search_terms = search_terms or [
            "fluke 1674",
            "fluke multifunction tester",
            "fluke insulation tester",
            "fluke tester",
            "fluke multimeter",
            "fluke clamp meter",
        ]
        self.session = requests.Session()
        # Rotate user agents to avoid fingerprinting
        user_agents = [
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
            "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
            "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:132.0) Gecko/20100101 Firefox/132.0",
        ]
        try:
            ua = UserAgent() if UserAgent else None
            user_agent = ua.random if ua else None
            if not user_agent:
                raise ValueError("no UA")
        except Exception:
            user_agent = random.choice(user_agents)
        self.session.headers.update({
            "User-Agent": user_agent,
            "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8",
            "Accept-Language": "en-AU,en-GB;q=0.9,en-US;q=0.8,en;q=0.7",
            "Accept-Encoding": "gzip, deflate, br",
            "Upgrade-Insecure-Requests": "1",
        })

    def scan(self) -> list[Listing]:
        """Run the scanner and return new listings. Override in subclass."""
        raise NotImplementedError

    def _jittered_delay(self) -> float:
        """Return a randomised delay between min and max to look more human."""
        return random.uniform(self.min_request_delay, self.max_request_delay)

    def _get(self, url: str, params: dict | None = None,
             retries: int | None = None, delay: float | None = None) -> Optional[requests.Response]:
        """Make a GET request with jittered delays, retry, and 429 backoff.

        - Adds a random delay before each request to avoid burst patterns.
        - Respects the Retry-After header when the server sends 429.
        - Uses exponential backoff with jitter on failures, capped at
          ``backoff_ceiling`` seconds.
        """
        retries = retries if retries is not None else self.max_retries
        base_delay = delay if delay is not None else self.min_request_delay

        for attempt in range(retries):
            try:
                # Jittered polite delay before every request
                time.sleep(self._jittered_delay())

                # Add a contextual referer header
                extra_headers = {}
                if "google.com" in url:
                    extra_headers["Referer"] = "https://www.google.com.au/"
                elif "ebay.com" in url:
                    extra_headers["Referer"] = "https://www.ebay.com.au/"

                resp = self.session.get(
                    url, params=params, timeout=20, headers=extra_headers,
                    allow_redirects=True,
                )
                if resp.status_code == 200:
                    return resp

                if resp.status_code == 429:
                    # Honour Retry-After header if present
                    retry_after = resp.headers.get("Retry-After")
                    if retry_after:
                        try:
                            wait = min(float(retry_after), self.backoff_ceiling)
                        except ValueError:
                            wait = base_delay * (2 ** attempt)
                    else:
                        wait = base_delay * (2 ** attempt)
                    wait = min(wait, self.backoff_ceiling)
                    # Add jitter so parallel scanners don't thundering-herd
                    wait += random.uniform(0, wait * 0.25)
                    logger.warning(
                        f"[{self.name}] Rate limited (429), backing off {wait:.1f}s "
                        f"(attempt {attempt + 1}/{retries})"
                    )
                    time.sleep(wait)
                    continue

                if resp.status_code in (301, 302, 303, 307, 308):
                    logger.debug(f"[{self.name}] Redirect {resp.status_code} for {url}")
                    continue

                logger.warning(f"[{self.name}] HTTP {resp.status_code} for {url}")
                if attempt < retries - 1:
                    wait = base_delay * (2 ** attempt) + random.uniform(0, 1)
                    time.sleep(wait)
                    continue
                return None

            except requests.RequestException as e:
                logger.warning(f"[{self.name}] Request error: {e}")
                if attempt < retries - 1:
                    wait = base_delay * (2 ** attempt) + random.uniform(0, 1)
                    time.sleep(min(wait, self.backoff_ceiling))
        return None

    def _safe_text(self, element, default: str = "") -> str:
        """Safely extract text from a BS4 element."""
        if element:
            return element.get_text(strip=True)
        return default
