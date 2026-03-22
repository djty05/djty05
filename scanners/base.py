"""Base scanner class and listing data model."""

import hashlib
import logging
import time
from dataclasses import dataclass, field
from datetime import datetime
from typing import Optional

import requests
from fake_useragent import UserAgent

logger = logging.getLogger(__name__)


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
            "fluke tester",
            "fluke multimeter",
            "fluke meter",
            "fluke 117",
            "fluke 115",
            "fluke 116",
            "fluke 175",
            "fluke 177",
            "fluke 179",
            "fluke 87",
            "fluke 87V",
            "fluke 289",
            "fluke 287",
            "fluke 376",
            "fluke 381",
            "fluke t5",
            "fluke t6",
            "fluke 1587",
            "fluke 1577",
            "fluke insulation tester",
            "fluke clamp meter",
            "fluke network tester",
            "fluke cable tester",
        ]
        self.session = requests.Session()
        try:
            ua = UserAgent()
            user_agent = ua.random
        except Exception:
            user_agent = (
                "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
                "AppleWebKit/537.36 (KHTML, like Gecko) "
                "Chrome/124.0.0.0 Safari/537.36"
            )
        self.session.headers.update({
            "User-Agent": user_agent,
            "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8",
            "Accept-Language": "en-AU,en-GB;q=0.9,en-US;q=0.8,en;q=0.7",
            "Accept-Encoding": "gzip, deflate, br",
            "Cache-Control": "no-cache",
            "Pragma": "no-cache",
            "Sec-Ch-Ua": '"Chromium";v="124", "Google Chrome";v="124", "Not-A.Brand";v="99"',
            "Sec-Ch-Ua-Mobile": "?0",
            "Sec-Ch-Ua-Platform": '"Windows"',
            "Sec-Fetch-Dest": "document",
            "Sec-Fetch-Mode": "navigate",
            "Sec-Fetch-Site": "none",
            "Sec-Fetch-User": "?1",
            "Upgrade-Insecure-Requests": "1",
        })

    def scan(self) -> list[Listing]:
        """Run the scanner and return new listings. Override in subclass."""
        raise NotImplementedError

    def _get(self, url: str, params: dict | None = None,
             retries: int = 3, delay: float = 2.0) -> Optional[requests.Response]:
        """Make a GET request with retries and rate limiting."""
        for attempt in range(retries):
            try:
                time.sleep(delay)  # rate limiting

                # Add a contextual referer header
                extra_headers = {}
                if "google.com" in url:
                    extra_headers["Referer"] = "https://www.google.com.au/"
                elif "ebay.com" in url:
                    extra_headers["Referer"] = "https://www.ebay.com.au/"

                resp = self.session.get(
                    url, params=params, timeout=15, headers=extra_headers,
                    allow_redirects=True,
                )
                if resp.status_code == 200:
                    return resp
                elif resp.status_code == 429:
                    wait = delay * (2 ** attempt)
                    logger.warning(f"[{self.name}] Rate limited, waiting {wait}s")
                    time.sleep(wait)
                elif resp.status_code in (301, 302, 303, 307, 308):
                    # Follow redirects (requests usually handles this, but log it)
                    logger.debug(f"[{self.name}] Redirect {resp.status_code} for {url}")
                    continue
                else:
                    logger.warning(
                        f"[{self.name}] HTTP {resp.status_code} for {url}"
                    )
                    if attempt < retries - 1:
                        time.sleep(delay)
                        continue
                    return None
            except requests.RequestException as e:
                logger.warning(f"[{self.name}] Request error: {e}")
                if attempt < retries - 1:
                    time.sleep(delay * (2 ** attempt))
        return None

    def _safe_text(self, element, default: str = "") -> str:
        """Safely extract text from a BS4 element."""
        if element:
            return element.get_text(strip=True)
        return default
