"""Base scanner class and Listing dataclass."""

import logging
import random
import time
from dataclasses import dataclass, field
from typing import Optional

import requests
from fake_useragent import UserAgent

logger = logging.getLogger(__name__)

HTML_PARSER = "lxml"

try:
    _ua = UserAgent(fallback="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36")
except Exception:
    _ua = None

USER_AGENTS = [
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:132.0) Gecko/20100101 Firefox/132.0",
    "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.1 Safari/605.1.15",
]


def random_ua() -> str:
    if _ua:
        try:
            return _ua.random
        except Exception:
            pass
    return random.choice(USER_AGENTS)


@dataclass
class Listing:
    title: str
    price: str
    url: str
    location: str = "Australia"
    marketplace: str = ""
    description: str = ""
    image_url: str = ""
    date_found: str = ""

    def to_dict(self) -> dict:
        return {
            "title": self.title,
            "price": self.price,
            "url": self.url,
            "location": self.location,
            "marketplace": self.marketplace,
            "description": self.description,
            "image_url": self.image_url,
            "date_found": self.date_found,
        }


class BaseScanner:
    scanner_id: str = "base"
    name: str = "Base"
    base_url: str = ""
    min_request_delay: float = 1.0
    max_request_delay: float = 3.0

    def __init__(self, search_terms: list[str] = None, location: dict = None, **kwargs):
        self.search_terms = search_terms or []
        self.location = location or {}
        self.session = requests.Session()
        self.session.headers.update({
            "User-Agent": random_ua(),
            "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
            "Accept-Language": "en-AU,en;q=0.9",
            "Accept-Encoding": "gzip, deflate, br",
            "Connection": "keep-alive",
            "DNT": "1",
        })

    def scan(self) -> list[Listing]:
        raise NotImplementedError

    def search_open(self, term: str) -> list[Listing]:
        raise NotImplementedError

    def _get(self, url: str, params: dict = None, retries: int = 2,
             delay: float = 2.0, timeout: int = 15) -> Optional[requests.Response]:
        for attempt in range(retries + 1):
            try:
                if attempt > 0:
                    self.session.headers["User-Agent"] = random_ua()
                resp = self.session.get(url, params=params, timeout=timeout)
                if resp.status_code == 200:
                    return resp
                if resp.status_code == 403:
                    logger.debug(f"[{self.name}] 403 on {url}")
                    return None
                if resp.status_code == 429:
                    time.sleep(delay * (attempt + 1))
                    continue
            except requests.RequestException as e:
                logger.debug(f"[{self.name}] Request error: {e}")
                if attempt < retries:
                    time.sleep(delay)
        return None

    def _delay(self):
        time.sleep(random.uniform(self.min_request_delay, self.max_request_delay))

    @staticmethod
    def _safe_text(el, default: str = "") -> str:
        if el is None:
            return default
        text = el.get_text(strip=True)
        return text if text else default
