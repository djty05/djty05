"""Multi-engine search fallback: DuckDuckGo -> Bing -> Google."""

import logging
import random
import re
import time
from dataclasses import dataclass
from urllib.parse import quote_plus, urljoin

import requests
from bs4 import BeautifulSoup

from .base import HTML_PARSER, USER_AGENTS

logger = logging.getLogger(__name__)


@dataclass
class SearchResult:
    title: str
    url: str
    snippet: str = ""
    image_url: str = ""


def site_search(domain: str, query: str, max_results: int = 15) -> list[SearchResult]:
    full_query = f"site:{domain} {query}"

    for engine in ["duckduckgo", "bing", "google"]:
        try:
            results = _ENGINES[engine](full_query, max_results)
            if results:
                logger.info(f"[SearchEngines] {engine} returned {len(results)} for '{query}'")
                return results
        except Exception as e:
            logger.debug(f"[SearchEngines] {engine} failed: {e}")
        time.sleep(random.uniform(1, 2))

    return []


def _search_duckduckgo(query: str, max_results: int) -> list[SearchResult]:
    results = _ddg_html(query, max_results)
    if results:
        return results
    return _ddg_lite(query, max_results)


def _ddg_html(query: str, max_results: int) -> list[SearchResult]:
    session = requests.Session()
    ua = random.choice(USER_AGENTS)
    session.headers.update({
        "User-Agent": ua,
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "en-AU,en;q=0.9",
    })

    resp = session.post(
        "https://html.duckduckgo.com/html/",
        data={"q": query, "b": ""},
        timeout=10,
    )
    if resp.status_code != 200:
        return []

    soup = BeautifulSoup(resp.text, HTML_PARSER)
    results = []

    for item in soup.select("div.result, div.web-result"):
        link = item.select_one("a.result__a, a.result__url, a")
        snippet_el = item.select_one("a.result__snippet, div.result__snippet")
        if not link:
            continue
        href = link.get("href", "")
        if "duckduckgo.com" in href:
            match = re.search(r'uddg=([^&]+)', href)
            if match:
                from urllib.parse import unquote
                href = unquote(match.group(1))
        if not href.startswith("http"):
            continue
        results.append(SearchResult(
            title=link.get_text(strip=True),
            url=href,
            snippet=snippet_el.get_text(strip=True) if snippet_el else "",
        ))
        if len(results) >= max_results:
            break

    return results


def _ddg_lite(query: str, max_results: int) -> list[SearchResult]:
    resp = requests.get(
        "https://lite.duckduckgo.com/lite/",
        params={"q": query},
        headers={"User-Agent": random.choice(USER_AGENTS)},
        timeout=10,
    )
    if resp.status_code != 200:
        return []

    soup = BeautifulSoup(resp.text, HTML_PARSER)
    results = []

    for link in soup.select("a.result-link, td a[href^='http']"):
        href = link.get("href", "")
        if not href.startswith("http") or "duckduckgo" in href:
            continue
        results.append(SearchResult(
            title=link.get_text(strip=True),
            url=href,
        ))
        if len(results) >= max_results:
            break

    return results


def _search_bing(query: str, max_results: int) -> list[SearchResult]:
    encoded = quote_plus(query)
    resp = requests.get(
        f"https://www.bing.com/search?q={encoded}&count={max_results}",
        headers={
            "User-Agent": random.choice(USER_AGENTS),
            "Accept": "text/html,application/xhtml+xml",
            "Accept-Language": "en-AU,en;q=0.9",
        },
        timeout=10,
    )
    if resp.status_code != 200:
        return []

    soup = BeautifulSoup(resp.text, HTML_PARSER)
    results = []

    for item in soup.select("li.b_algo"):
        link = item.select_one("h2 a")
        snippet_el = item.select_one("div.b_caption p, p")
        if not link:
            continue
        href = link.get("href", "")
        if not href.startswith("http"):
            continue
        results.append(SearchResult(
            title=link.get_text(strip=True),
            url=href,
            snippet=snippet_el.get_text(strip=True) if snippet_el else "",
        ))
        if len(results) >= max_results:
            break

    return results


def _search_google(query: str, max_results: int) -> list[SearchResult]:
    encoded = quote_plus(query)
    resp = requests.get(
        f"https://www.google.com/search?q={encoded}&num={max_results}&gl=au&hl=en",
        headers={
            "User-Agent": random.choice(USER_AGENTS),
            "Accept": "text/html,application/xhtml+xml",
            "Accept-Language": "en-AU,en;q=0.9",
        },
        timeout=10,
    )
    if resp.status_code != 200:
        return []

    soup = BeautifulSoup(resp.text, HTML_PARSER)
    results = []

    for item in soup.select("div.g, div[data-hveid]"):
        link = item.select_one("a[href^='http']")
        title_el = item.select_one("h3")
        snippet_el = item.select_one("div.VwiC3b, span.st, div[data-sncf]")
        if not link or not title_el:
            continue
        href = link.get("href", "")
        if not href.startswith("http") or "google.com" in href:
            continue
        results.append(SearchResult(
            title=title_el.get_text(strip=True),
            url=href,
            snippet=snippet_el.get_text(strip=True) if snippet_el else "",
        ))
        if len(results) >= max_results:
            break

    return results


_ENGINES = {
    "duckduckgo": _search_duckduckgo,
    "bing": _search_bing,
    "google": _search_google,
}
