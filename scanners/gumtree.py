"""Gumtree Australia scanner - uses search API to avoid 403 blocks."""

import json
import logging
import time
from urllib.parse import quote_plus

import requests
from bs4 import BeautifulSoup

from .base import BaseScanner, Listing

logger = logging.getLogger(__name__)


class GumtreeScanner(BaseScanner):
    name = "Gumtree AU"
    base_url = "https://www.gumtree.com.au"

    def _init_session(self):
        """Set up a session that mimics a real browser visiting Gumtree."""
        self.session.headers.update({
            "Referer": "https://www.gumtree.com.au/",
            "Origin": "https://www.gumtree.com.au",
        })
        # Hit the homepage first to pick up cookies (CloudFlare etc)
        try:
            self.session.get(
                self.base_url,
                timeout=15,
                allow_redirects=True,
            )
            time.sleep(1)
        except Exception as e:
            logger.debug(f"[{self.name}] Homepage prefetch failed: {e}")

    def scan(self) -> list[Listing]:
        self._init_session()
        listings = []
        for term in self.search_terms:
            try:
                found = self._search(term)
                listings.extend(found)
                # Polite delay between searches
                time.sleep(2)
            except Exception as e:
                logger.error(f"[{self.name}] Error searching '{term}': {e}")
        return listings

    def _search(self, term: str) -> list[Listing]:
        """Search Gumtree for a single term (all of Australia)."""
        encoded = quote_plus(term)
        url = f"{self.base_url}/s-{encoded}/k0"

        # Update referer to look like organic navigation
        self.session.headers.update({
            "Referer": f"{self.base_url}/",
            "Sec-Fetch-Site": "same-origin",
        })

        resp = self._get(url)
        if not resp:
            # Try alternate URL pattern
            url = f"{self.base_url}/s/k0?q={encoded}&sort=date"
            resp = self._get(url)
        if not resp:
            return []

        # Try to extract JSON-LD structured data first (more reliable)
        results = self._parse_json_ld(resp.text, term)
        if results:
            return results

        # Fall back to HTML parsing
        return self._parse_html(resp.text, term)

    def _parse_json_ld(self, html: str, term: str) -> list[Listing]:
        """Try to extract listings from JSON-LD or embedded __NEXT_DATA__."""
        soup = BeautifulSoup(html, "lxml")
        results = []

        # Look for Next.js data blob
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
                logger.debug(f"[{self.name}] JSON-LD parse error: {e}")

        # Look for JSON-LD schema
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
        """Navigate the __NEXT_DATA__ structure to find ad listings."""
        ads = []
        try:
            props = data.get("props", {}).get("pageProps", {})
            # Try common Gumtree data paths
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
                        # URL
                        slug = item.get("url", item.get("seoUrl", ""))
                        ad_id = item.get("id", item.get("adId", ""))
                        if slug:
                            ad["url"] = f"{self.base_url}{slug}" if not slug.startswith("http") else slug
                        elif ad_id:
                            ad["url"] = f"{self.base_url}/s-ad/{ad_id}"
                        # Image
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

        # Try multiple selector patterns (Gumtree changes their HTML often)
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
