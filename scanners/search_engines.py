"""Shared search engine helpers for all scanners.

Provides DuckDuckGo, Bing, and Google search with automatic fallback.
DuckDuckGo is tried first since it's least likely to block cloud IPs.
Rate-limits are shared across all scanners.
"""

import logging
import random
import re
import threading
import time
from dataclasses import dataclass
from typing import Optional
from urllib.parse import unquote, quote_plus

import requests
from bs4 import BeautifulSoup

from .base import HTML_PARSER

logger = logging.getLogger(__name__)

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
_min_delay = {
    "google": 5.0,
    "duckduckgo": 2.0,
    "bing": 3.0,
}

# Rotate user agents to reduce fingerprinting
_USER_AGENTS = [
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
    "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:132.0) Gecko/20100101 Firefox/132.0",
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.1 Safari/605.1.15",
]


@dataclass
class SearchResult:
    title: str
    url: str
    snippet: str
    image_url: str = ""


def _get_session() -> requests.Session:
    session = requests.Session()
    ua = random.choice(_USER_AGENTS)
    session.headers.update({
        "User-Agent": ua,
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "en-AU,en;q=0.9",
        "Accept-Encoding": "gzip, deflate, br",
        "Cache-Control": "no-cache",
        "Upgrade-Insecure-Requests": "1",
    })
    return session


def _rate_limit(engine: str):
    with _engine_locks[engine]:
        now = time.time()
        elapsed = now - _last_request_time[engine]
        needed = _min_delay[engine] + random.uniform(0, 1.5)
        if elapsed < needed:
            time.sleep(needed - elapsed)
        _last_request_time[engine] = time.time()


def search_duckduckgo(query: str) -> list[SearchResult]:
    """Search DuckDuckGo HTML version. Most lenient for cloud IPs."""
    _rate_limit("duckduckgo")
    session = _get_session()

    # Try POST to html.duckduckgo.com (often works better from cloud)
    try:
        resp = session.post(
            "https://html.duckduckgo.com/html/",
            data={"q": query, "b": ""},
            timeout=15,
        )
        if resp.status_code == 200:
            results = _parse_ddg_html(resp.text)
            if results:
                return results
    except requests.RequestException as e:
        logger.debug(f"[DuckDuckGo] POST failed: {e}")

    # Fallback: GET to lite.duckduckgo.com
    try:
        resp = session.get(
            "https://lite.duckduckgo.com/lite/",
            params={"q": query},
            timeout=15,
        )
        if resp.status_code == 200:
            results = _parse_ddg_lite(resp.text)
            if results:
                return results
    except requests.RequestException as e:
        logger.debug(f"[DuckDuckGo Lite] GET failed: {e}")

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


def search_google(query: str, num: int = 30) -> list[SearchResult]:
    """Search Google. Most likely to block cloud IPs."""
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


def search_multi(query: str, engines: list[str] | None = None) -> list[SearchResult]:
    """Search across multiple engines. DuckDuckGo first (most cloud-friendly)."""
    if engines is None:
        engines = ["duckduckgo", "bing", "google"]

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
                logger.info(f"[SearchEngines] {engine} returned {len(results)} results for: {query[:50]}")
                return results
            else:
                logger.debug(f"[SearchEngines] {engine} returned 0 results")
        except Exception as e:
            logger.warning(f"[SearchEngines] {engine} error: {e}")
            continue

    logger.warning(f"[SearchEngines] All engines failed for: {query[:50]}")
    return []


def site_search(site_domain: str, terms: str, engines: list[str] | None = None) -> list[SearchResult]:
    """Search for terms on a specific site using search engines."""
    query = f"site:{site_domain} {terms}"
    results = search_multi(query, engines=engines)
    return [r for r in results if site_domain in r.url]


# ---- HTML parsers ----

def _parse_google_html(html: str) -> list[SearchResult]:
    soup = BeautifulSoup(html, HTML_PARSER)
    results = []
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
            snippet_el = result.select_one(
                "div.VwiC3b, span.aCOpRe, span.st, "
                "div[data-sncf], div.kb0PBd, div[style*='line-clamp']"
            )
            snippet = snippet_el.get_text(strip=True) if snippet_el else ""
            image_url = ""
            img_el = result.select_one("img[src^='http']")
            if img_el:
                image_url = img_el.get("src", "")
            results.append(SearchResult(title=title, url=href, snippet=snippet, image_url=image_url))
        except Exception:
            continue
    return results


def _parse_ddg_html(html: str) -> list[SearchResult]:
    soup = BeautifulSoup(html, HTML_PARSER)
    results = []
    for result in soup.select("div.result, div.web-result, div.results_links"):
        try:
            link_el = result.select_one("a.result__a, a.result__url, a[href]")
            snippet_el = result.select_one(
                "a.result__snippet, div.result__snippet, td.result__snippet"
            )
            if not link_el:
                continue
            href = link_el.get("href", "")
            if "duckduckgo.com" in href and "uddg=" in href:
                match = re.search(r'uddg=([^&]+)', href)
                if match:
                    href = unquote(match.group(1))
            title = link_el.get_text(strip=True)
            snippet = snippet_el.get_text(strip=True) if snippet_el else ""
            if title and href and href.startswith("http"):
                results.append(SearchResult(title=title, url=href, snippet=snippet))
        except Exception:
            continue
    return results


def _parse_ddg_lite(html: str) -> list[SearchResult]:
    """Parse DuckDuckGo Lite results page."""
    soup = BeautifulSoup(html, HTML_PARSER)
    results = []

    # DDG Lite uses a table layout with links
    for link in soup.select("a.result-link, td a[href]"):
        try:
            href = link.get("href", "")
            if not href or not href.startswith("http"):
                continue
            if "duckduckgo.com" in href:
                # Extract real URL from DDG redirect
                match = re.search(r'uddg=([^&]+)', href)
                if match:
                    href = unquote(match.group(1))
                else:
                    continue
            title = link.get_text(strip=True)
            if not title or len(title) < 3:
                continue
            # Try to get snippet from next sibling or parent
            snippet = ""
            parent = link.find_parent("tr")
            if parent:
                next_row = parent.find_next_sibling("tr")
                if next_row:
                    snippet_td = next_row.select_one("td.result-snippet, td")
                    if snippet_td:
                        snippet = snippet_td.get_text(strip=True)
            results.append(SearchResult(title=title, url=href, snippet=snippet))
        except Exception:
            continue
    return results


def _parse_bing_html(html: str) -> list[SearchResult]:
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
                results.append(SearchResult(title=title, url=href, snippet=snippet))
        except Exception:
            continue
    return results
