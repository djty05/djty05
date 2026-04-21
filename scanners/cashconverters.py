"""Cash Converters Australia scanner.

Cash Converters has a public API at webapi.cashconverters.com.au that
actually works even from cloud IPs.
"""

import json
import logging
import re
from urllib.parse import quote_plus

import requests
from bs4 import BeautifulSoup

from .base import BaseScanner, Listing, HTML_PARSER, random_ua
from .search_engines import site_search

logger = logging.getLogger(__name__)


class CashConvertersScanner(BaseScanner):
    scanner_id = "cashconverters"
    name = "Cash Converters"
    base_url = "https://www.cashconverters.com.au"
    api_url = "https://webapi.cashconverters.com.au"

    def scan(self) -> list[Listing]:
        listings = self._scan_api()
        if listings:
            return listings

        listings = self._scan_http()
        if listings:
            return listings

        logger.info(f"[{self.name}] Falling back to search engines")
        listings = self._scan_search_engine_fallback()
        if listings:
            return listings

        return self._generate_direct_links()

    def search_open(self, term: str) -> list[Listing]:
        results = self._search_api(term)
        if results:
            return results
        results = self._search_http(term)
        if results:
            return results
        return self._search_engine_term(term)

    def _scan_api(self) -> list[Listing]:
        all_listings = []
        for term in self.search_terms:
            try:
                found = self._search_api(term)
                if found:
                    all_listings.extend(found)
            except Exception as e:
                logger.debug(f"[{self.name}] API error for '{term}': {e}")
        if all_listings:
            logger.info(f"[{self.name}] API found {len(all_listings)} total")
        return all_listings

    def _search_api(self, term: str) -> list[Listing]:
        encoded = quote_plus(term)
        api_urls = [
            f"{self.api_url}/api/products/search?q={encoded}&limit=20&sort=newest",
            f"{self.api_url}/api/search?keyword={encoded}&limit=20",
        ]

        for url in api_urls:
            try:
                resp = requests.get(url, headers={
                    "User-Agent": random_ua(),
                    "Accept": "application/json",
                    "Origin": self.base_url,
                    "Referer": f"{self.base_url}/",
                }, timeout=10)

                if resp.status_code != 200:
                    continue

                data = resp.json()
                items = []
                if isinstance(data, dict):
                    items = (data.get("results", []) or data.get("products", [])
                             or data.get("items", []) or data.get("data", []))
                elif isinstance(data, list):
                    items = data

                results = []
                for item in items:
                    title = item.get("title", item.get("name", ""))
                    if not title:
                        continue
                    price = item.get("price", item.get("salePrice", ""))
                    if isinstance(price, (int, float)):
                        price = f"${price:.2f}"
                    elif not price:
                        price = "See listing"

                    item_url = item.get("url", item.get("link", ""))
                    if item_url and not item_url.startswith("http"):
                        item_url = f"{self.base_url}{item_url}"

                    slug = item.get("slug", item.get("id", ""))
                    if not item_url and slug:
                        item_url = f"{self.base_url}/shop/product/{slug}"

                    location = item.get("storeName", item.get("store", {}).get("name", "Australia"))

                    images = item.get("images", item.get("image", []))
                    image_url = ""
                    if isinstance(images, list) and images:
                        image_url = images[0].get("url", str(images[0])) if isinstance(images[0], dict) else str(images[0])
                    elif isinstance(images, str):
                        image_url = images

                    results.append(Listing(
                        title=title, price=str(price), url=item_url,
                        location=str(location), marketplace=self.name,
                        description=item.get("description", ""),
                        image_url=image_url,
                    ))

                if results:
                    logger.info(f"[{self.name}] API found {len(results)} for '{term}'")
                    return results
            except Exception as e:
                logger.debug(f"[{self.name}] API request error: {e}")

        return []

    def _scan_http(self) -> list[Listing]:
        all_listings = []
        for term in self.search_terms:
            try:
                found = self._search_http(term)
                if found:
                    all_listings.extend(found)
            except Exception as e:
                logger.debug(f"[{self.name}] HTTP error for '{term}': {e}")
        return all_listings

    def _search_http(self, term: str) -> list[Listing]:
        encoded = quote_plus(term)
        search_urls = [
            f"{self.base_url}/shop/search?q={encoded}",
            f"{self.base_url}/shopping/search?q={encoded}",
            f"{self.base_url}/shop?search={encoded}",
        ]

        for url in search_urls:
            resp = self._get(url, retries=1, delay=2.0)
            if not resp:
                continue
            html = resp.text
            if len(html) < 500 or "Access Denied" in html:
                continue
            results = self._parse_html(html, term)
            if results:
                return results

        return []

    def _parse_html(self, html: str, term: str) -> list[Listing]:
        soup = BeautifulSoup(html, HTML_PARSER)
        results = []

        card_selectors = [
            "div.product-card", "div.product-tile", "article.product",
            "div[class*='product']", "div[class*='item']",
            "a[class*='product']",
        ]

        cards = []
        for sel in card_selectors:
            cards = soup.select(sel)
            if cards:
                break

        for card in cards:
            try:
                title_el = card.select_one("h2, h3, h4, .title, .name, [class*='title']")
                price_el = card.select_one("[class*='price'], .price")
                loc_el = card.select_one("[class*='store'], [class*='location']")

                title = self._safe_text(title_el, "")
                if not title:
                    continue

                price = self._safe_text(price_el, "See listing")
                location = self._safe_text(loc_el, "Australia")

                link = card.select_one("a[href]") if card.name != "a" else card
                href = link.get("href", "") if link else ""
                if href and not href.startswith("http"):
                    href = f"{self.base_url}{href}"

                img_el = card.select_one("img")
                image_url = ""
                if img_el:
                    image_url = img_el.get("src", "") or img_el.get("data-src", "")

                if title and href:
                    results.append(Listing(
                        title=title, price=price, url=href,
                        location=location, marketplace=self.name,
                        image_url=image_url,
                    ))
            except Exception:
                continue

        if results:
            logger.info(f"[{self.name}] HTML found {len(results)} for '{term}'")
        return results

    def _scan_search_engine_fallback(self) -> list[Listing]:
        all_results = []
        for i in range(0, len(self.search_terms), 6):
            chunk = self.search_terms[i:i + 6]
            or_query = " OR ".join(f'"{t}"' for t in chunk)
            results = site_search("cashconverters.com.au", or_query)
            for r in results:
                price = "See listing"
                price_match = re.search(r'\$[\d,.]+', f"{r.title} {r.snippet}")
                if price_match:
                    price = price_match.group(0)
                all_results.append(Listing(
                    title=r.title, price=price, url=r.url,
                    location="Australia", marketplace=self.name,
                    description=r.snippet, image_url=r.image_url,
                ))
        return all_results

    def _generate_direct_links(self) -> list[Listing]:
        links = []
        for term in self.search_terms[:3]:
            encoded = quote_plus(term)
            url = f"{self.base_url}/shop/search?q={encoded}"
            links.append(Listing(
                title=f"Cash Converters: {term}", price="Open Cash Converters",
                url=url, location="Australia", marketplace=self.name,
                description=f"Click to search Cash Converters for '{term}'",
            ))
        return links

    def _search_engine_term(self, term: str) -> list[Listing]:
        results = site_search("cashconverters.com.au", term)
        listings = []
        for r in results:
            price = "See listing"
            price_match = re.search(r'\$[\d,.]+', f"{r.title} {r.snippet}")
            if price_match:
                price = price_match.group(0)
            listings.append(Listing(
                title=r.title, price=price, url=r.url,
                location="Australia", marketplace=self.name,
                description=r.snippet, image_url=r.image_url,
            ))
        return listings
