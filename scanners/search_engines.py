"""Shared search engine helpers for all scanners.

Provides Google, DuckDuckGo, and Bing search with automatic fallback.
Rate-limits are shared across all scanners to avoid hitting any single
search engine too hard.
"""

import logging
import random
import re
import threading
import time
from dataclasses import dataclass
from typing import Optional

import requests
from bs4 import BeautifulSoup

from .base import HTML_PARSER

logger = logging.getLogger(__name__)

# Global rate limiter — shared across ALL scanners to prevent
# Google/DDG/Bing from seeing too many requests in a short window.
_engine_locks = {
    "google": threading.Lock(),
    "duckduckgo": threading.Lock(),
    "bing": threading.Lock(),
}
_last_request_time = {
    "google": 0.0,
    "duckduckgo": 0.0,
    "bing": 0.0,
}
# Minimum seconds between requests to each engine
_min_delay = {
    "google": 8.0,
    "duckduckgo": 3.0,
    "bing": 4.0,
}


@dataclass
class SearchResult:
    """A single search engine result."""
    title: str
    url: str
    snippet: str
    image_url: str = ""


def _get_session() -> requests.Session:
    """Create a session with realistic browser headers."""
    session = requests.Session()
    session.headers.update({
        "User-Agent": (
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
            "AppleWebKit/537.36 (KHTML, like Gecko) "
            "Chrome/131.0.0.0 Safari/537.36"
        ),
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "en-AU,en;q=0.9",
        "Accept-Encoding": "gzip, deflate, br",
        "Cache-Control": "no-cache",
        "Sec-Ch-Ua": '"Chromium";v="131", "Google Chrome";v="131"',
        "Sec-Ch-Ua-Mobile": "?0",
        "Sec-Ch-Ua-Platform": '"Windows"',
        "Sec-Fetch-Dest": "document",
        "Sec-Fetch-Mode": "navigate",
        "Sec-Fetch-Site": "none",
        "Upgrade-Insecure-Requests": "1",
    })
    return session


def _rate_limit(engine: str):
    """Block until enough time has passed since the last request to this engine."""
    with _engine_locks[engine]:
        now = time.time()
        elapsed = now - _last_request_time[engine]
        needed = _min_delay[engine] + random.uniform(0, 2.0)
        if elapsed < needed:
            time.sleep(needed - elapsed)
        _last_request_time[engine] = time.time()


def search_google(query: str, num: int = 30) -> list[SearchResult]:
    """Search Google and return parsed results. Returns [] on block/failure."""
    _rate_limit("google")
    session = _get_session()
    session.headers["Referer"] = "https://www.google.com.au/"

    try:
        resp = session.get(
            "https://www.google.com.au/search",
            params={"q": query, "num": num, "gl": "au", "hl": "en"},
            timeout=15,
        )
        if resp.status_code != 200:
            logger.warning(f"[Google] HTTP {resp.status_code}")
            return []

        text = resp.text.lower()
        if "detected unusual traffic" in text or "captcha" in text or "recaptcha" in text:
            logger.warning("[Google] CAPTCHA/block detected")
            return []

        return _parse_google_html(resp.text)

    except requests.RequestException as e:
        logger.warning(f"[Google] Request failed: {e}")
        return []


def search_duckduckgo(query: str) -> list[SearchResult]:
    """Search DuckDuckGo HTML version. More lenient than Google."""
    _rate_limit("duckduckgo")
    session = _get_session()

    try:
        resp = session.get(
            "https://html.duckduckgo.com/html/",
            params={"q": query},
            timeout=15,
        )
        if resp.status_code != 200:
            logger.warning(f"[DuckDuckGo] HTTP {resp.status_code}")
            return []

        return _parse_ddg_html(resp.text)

    except requests.RequestException as e:
        logger.warning(f"[DuckDuckGo] Request failed: {e}")
        return []


def search_bing(query: str) -> list[SearchResult]:
    """Search Bing. Less aggressive blocking than Google."""
    _rate_limit("bing")
    session = _get_session()
    session.headers["Referer"] = "https://www.bing.com/"

    try:
        resp = session.get(
            "https://www.bing.com/search",
            params={"q": query, "count": 30, "setlang": "en-AU", "cc": "AU"},
            timeout=15,
        )
        if resp.status_code != 200:
            logger.warning(f"[Bing] HTTP {resp.status_code}")
            return []

        return _parse_bing_html(resp.text)

    except requests.RequestException as e:
        logger.warning(f"[Bing] Request failed: {e}")
        return []


def search_multi(query: str, engines: list[str] | None = None) -> list[SearchResult]:
    """Search across multiple engines with automatic fallback.

    Tries each engine in order, returns results from the first one that works.
    If all fail, returns empty list.
    """
    if engines is None:
        engines = ["google", "bing", "duckduckgo"]

    for engine in engines:
        try:
            if engine == "google":
                results = search_google(query)
            elif engine == "duckduckgo":
                results = search_duckduckgo(query)
            elif engine == "bing":
                results = search_bing(query)
            else:
                continue

            if results:
                logger.info(f"[SearchEngines] {engine} returned {len(results)} results")
                return results
            else:
                logger.debug(f"[SearchEngines] {engine} returned 0 results, trying next")
        except Exception as e:
            logger.warning(f"[SearchEngines] {engine} error: {e}")
            continue

    logger.warning("[SearchEngines] All engines failed")
    return []


def site_search(site_domain: str, terms: str, engines: list[str] | None = None) -> list[SearchResult]:
    """Search for terms on a specific site using search engines.

    Returns only results from the specified domain.
    """
    query = f"site:{site_domain} {terms}"
    results = search_multi(query, engines=engines)
    # Filter to only results actually from the target domain
    return [r for r in results if site_domain in r.url]


# ---- HTML parsers ----

def _parse_google_html(html: str) -> list[SearchResult]:
    """Parse Google search results HTML."""
    soup = BeautifulSoup(html, HTML_PARSER)
    results = []

    # Google uses multiple container types - try all
    for result in soup.select("div.g, div.tF2Cxc, div[data-sokoban-container]"):
        try:
            link_el = result.select_one("a[href]")
            title_el = result.select_one("h3")

            if not link_el or not title_el:
                continue

            href = link_el.get("href", "")
            if not href or href.startswith("#") or href.startswith("/search"):
                continue

            title = title_el.get_text(strip=True)
            if not title:
                continue

            # Snippet from various Google layouts
            snippet_el = result.select_one(
                "div.VwiC3b, span.aCOpRe, span.st, "
                "div[data-sncf], div.kb0PBd, div[style*='line-clamp']"
            )
            snippet = snippet_el.get_text(strip=True) if snippet_el else ""

            # Image
            image_url = ""
            img_el = result.select_one("img[src^='http']")
            if img_el:
                image_url = img_el.get("src", "")

            results.append(SearchResult(
                title=title, url=href, snippet=snippet, image_url=image_url
            ))
        except Exception:
            continue

    return results


def _parse_ddg_html(html: str) -> list[SearchResult]:
    """Parse DuckDuckGo HTML search results."""
    soup = BeautifulSoup(html, HTML_PARSER)
    results = []

    for result in soup.select("div.result, div.web-result, div.results_links"):
        try:
            link_el = result.select_one(
                "a.result__a, a.result__url, a[href]"
            )
            snippet_el = result.select_one(
                "a.result__snippet, div.result__snippet, "
                "td.result__snippet"
            )

            if not link_el:
                continue

            href = link_el.get("href", "")
            # DDG sometimes wraps URLs in a redirect
            if "duckduckgo.com" in href and "uddg=" in href:
                match = re.search(r'uddg=([^&]+)', href)
                if match:
                    from urllib.parse import unquote
                    href = unquote(match.group(1))

            title = link_el.get_text(strip=True)
            snippet = snippet_el.get_text(strip=True) if snippet_el else ""

            if title and href and href.startswith("http"):
                results.append(SearchResult(
                    title=title, url=href, snippet=snippet
                ))
        except Exception:
            continue

    return results


def _parse_bing_html(html: str) -> list[SearchResult]:
    """Parse Bing search results HTML."""
    soup = BeautifulSoup(html, HTML_PARSER)
    results = []

    for result in soup.select("li.b_algo, div.b_algo"):
        try:
            link_el = result.select_one("h2 a, a[href]")
            snippet_el = result.select_one("div.b_caption p, p")

            if not link_el:
                continue

            href = link_el.get("href", "")
            title = link_el.get_text(strip=True)
            snippet = snippet_el.get_text(strip=True) if snippet_el else ""

            if title and href and href.startswith("http"):
                results.append(SearchResult(
                    title=title, url=href, snippet=snippet
                ))
        except Exception:
            continue

    return results
