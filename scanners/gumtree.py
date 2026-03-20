"""Gumtree Australia scanner - uses curl_cffi to bypass CloudFlare."""

import json
import logging
import time
from urllib.parse import quote_plus

from bs4 import BeautifulSoup
from curl_cffi import requests as cf_requests

from .base import BaseScanner, Listing

logger = logging.getLogger(__name__)


class GumtreeScanner(BaseScanner):
    name = "Gumtree AU"
    base_url = "https://www.gumtree.com.au"

    def _init_cf_session(self):
        """Create a curl_cffi session that impersonates Chrome's TLS fingerprint."""
        self._cf = cf_requests.Session(impersonate="chrome124")
        # Warm up: visit homepage to get cookies
        try:
            self._cf.get(self.base_url, timeout=15)
            time.sleep(1)
        except Exception as e:
            logger.debug(f"[{self.name}] Homepage warmup failed: {e}")

    def _cf_get(self, url: str, retries: int = 3, delay: float = 2.0):
        """GET with curl_cffi session (bypasses TLS fingerprinting)."""
        for attempt in range(retries):
            try:
                time.sleep(delay)
                resp = self._cf.get(url, timeout=15, allow_redirects=True)
                if resp.status_code == 200:
                    return resp
                elif resp.status_code == 429:
                    wait = delay * (2 ** attempt)
                    logger.warning(f"[{self.name}] Rate limited, waiting {wait}s")
                    time.sleep(wait)
                else:
                    logger.warning(f"[{self.name}] HTTP {resp.status_code} for {url}")
                    return None
            except Exception as e:
                logger.warning(f"[{self.name}] Request error: {e}")
                if attempt < retries - 1:
                    time.sleep(delay * (2 ** attempt))
        return None

    def scan(self) -> list[Listing]:
        self._init_cf_session()
        listings = []
        for term in self.search_terms:
            try:
                found = self._search(term)
                listings.extend(found)
                time.sleep(2)
            except Exception as e:
                logger.error(f"[{self.name}] Error searching '{term}': {e}")
        return listings

    def _search(self, term: str) -> list[Listing]:
        """Search Gumtree for a single term (all of Australia)."""
        encoded = quote_plus(term)
        url = f"{self.base_url}/s-{encoded}/k0"

        resp = self._cf_get(url)
        if not resp:
            url = f"{self.base_url}/s/k0?q={encoded}&sort=date"
            resp = self._cf_get(url)
        if not resp:
            return []

        # Try JSON extraction first, fall back to HTML
        results = self._parse_json_ld(resp.text, term)
        if results:
            return results
        return self._parse_html(resp.text, term)

    def _parse_json_ld(self, html: str, term: str) -> list[Listing]:
        """Extract listings from embedded JSON data."""
        soup = BeautifulSoup(html, "lxml")
        results = []

        # Next.js data blob
        script = soup.select_one("script#__NEXT_DATA__")
        if script and script.string:
            try:
                data = json.loads(script.string)
                ads = self._extract_ads_from_next_data(data)
                for ad in ads:
                    results.append(Listing(
                        title=ad.get("title", "No title"),
                        price=ad.get("price", "No price"),
                        url=ad.get("url", ""),
                        location=ad.get("location", "Australia"),
                        marketplace=self.name,
                        description=ad.get("description", ""),
                        image_url=ad.get("image", ""),
                    ))
                if results:
                    logger.info(f"[{self.name}] Found {len(results)} results for '{term}' via JSON")
                    return results
            except (json.JSONDecodeError, KeyError) as e:
                logger.debug(f"[{self.name}] JSON parse error: {e}")

        # JSON-LD schema
        for script in soup.select('script[type="application/ld+json"]'):
            try:
                data = json.loads(script.string)
                if isinstance(data, dict) and data.get("@type") == "ItemList":
                    for item in data.get("itemListElement", []):
                        obj = item.get("item", item)
                        url = obj.get("url", "")
                        if url and not url.startswith("http"):
                            url = f"{self.base_url}{url}"
                        results.append(Listing(
                            title=obj.get("name", "No title"),
                            price=self._extract_price(obj),
                            url=url,
                            location="Australia",
                            marketplace=self.name,
                        ))
            except (json.JSONDecodeError, KeyError):
                continue

        if results:
            logger.info(f"[{self.name}] Found {len(results)} results for '{term}' via JSON-LD")
        return results

    def _extract_ads_from_next_data(self, data: dict) -> list[dict]:
        """Navigate __NEXT_DATA__ to find ad listings."""
        ads = []
        try:
            props = data.get("props", {}).get("pageProps", {})
            for key in ("searchResult", "results", "ads", "data"):
                if key in props:
                    container = props[key]
                    items = []
                    if isinstance(container, dict):
                        items = container.get("results", container.get("ads", []))
                    elif isinstance(container, list):
                        items = container

                    for item in items:
                        ad = {
                            "title": item.get("title", item.get("adTitle", "")),
                            "price": item.get("priceText", item.get("price", {}).get("display", "No price")),
                            "location": item.get("locationName", item.get("location", {}).get("name", "Australia")),
                            "description": item.get("description", ""),
                            "image": "",
                        }
                        slug = item.get("url", item.get("seoUrl", ""))
                        ad_id = item.get("id", item.get("adId", ""))
                        if slug:
                            ad["url"] = f"{self.base_url}{slug}" if not slug.startswith("http") else slug
                        elif ad_id:
                            ad["url"] = f"{self.base_url}/s-ad/{ad_id}"
                        images = item.get("images", item.get("mainImage", []))
                        if isinstance(images, list) and images:
                            ad["image"] = images[0].get("url", "") if isinstance(images[0], dict) else str(images[0])
                        elif isinstance(images, str):
                            ad["image"] = images
                        if ad["title"]:
                            ads.append(ad)
        except Exception as e:
            logger.debug(f"[{self.name}] Error extracting NEXT_DATA: {e}")
        return ads

    def _parse_html(self, html: str, term: str) -> list[Listing]:
        """Fall back to HTML parsing."""
        soup = BeautifulSoup(html, "lxml")
        results = []

        selectors = [
            "a.user-ad-row",
            "a.listing-link",
            "div.user-ad-row",
            "a[data-testid='listing-card']",
            "div[data-testid='listing-card']",
            "article a",
            "div.srp-item a",
        ]

        cards = []
        for sel in selectors:
            cards = soup.select(sel)
            if cards:
                break

        for card in cards:
            try:
                title_el = card.select_one(
                    "span.user-ad-row__title, h3.listing-title, "
                    "p.tempo-title, div.user-ad-row__title, "
                    "h2, h3, [data-testid='listing-title']"
                )
                price_el = card.select_one(
                    "span.user-ad-price, div.listing-price, "
                    "p.tempo-price, div.user-ad-row__price, "
                    "[data-testid='listing-price']"
                )
                loc_el = card.select_one(
                    "span.user-ad-row__location, div.listing-location, "
                    "p.tempo-location, [data-testid='listing-location']"
                )

                title = self._safe_text(title_el, "No title")
                price = self._safe_text(price_el, "No price")
                location = self._safe_text(loc_el, "Australia")

                href = card.get("href", "")
                if not href and card.name != "a":
                    link = card.select_one("a")
                    href = link.get("href", "") if link else ""
                if href and not href.startswith("http"):
                    href = f"{self.base_url}{href}"

                if title and href:
                    results.append(Listing(
                        title=title,
                        price=price,
                        url=href,
                        location=location,
                        marketplace=self.name,
                    ))
            except Exception as e:
                logger.debug(f"[{self.name}] Parse error: {e}")
                continue

        if results:
            logger.info(f"[{self.name}] Found {len(results)} results for '{term}' via HTML")
        return results

    def _extract_price(self, obj: dict) -> str:
        offers = obj.get("offers", {})
        if isinstance(offers, dict):
            price = offers.get("price", "")
            currency = offers.get("priceCurrency", "AUD")
            if price:
                return f"${price} {currency}"
        return "No price"
