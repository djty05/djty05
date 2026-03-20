"""Gumtree Australia scanner."""

import logging
from urllib.parse import quote_plus

from bs4 import BeautifulSoup

from .base import BaseScanner, Listing

logger = logging.getLogger(__name__)


class GumtreeScanner(BaseScanner):
    name = "Gumtree AU"
    base_url = "https://www.gumtree.com.au"

    # Gumtree region codes for all of Australia
    REGIONS = [
        "",  # all of Australia (default)
        "s-sydney/", "s-melbourne/", "s-brisbane/", "s-perth/",
        "s-adelaide/", "s-hobart/", "s-darwin/", "s-canberra/",
        "s-gold+coast/", "s-newcastle/", "s-wollongong/",
        "s-geelong/", "s-cairns/", "s-townsville/",
        "s-toowoomba/", "s-ballarat/", "s-bendigo/",
    ]

    def scan(self) -> list[Listing]:
        listings = []
        for term in self.search_terms:
            for region in self.REGIONS:
                try:
                    found = self._search(term, region)
                    listings.extend(found)
                except Exception as e:
                    logger.error(f"[{self.name}] Error searching '{term}' in '{region}': {e}")
        return listings

    def _search(self, term: str, region: str) -> list[Listing]:
        url = f"{self.base_url}/{region}k0"
        params = {"q": term, "sort": "date"}
        resp = self._get(url, params=params)
        if not resp:
            return []

        soup = BeautifulSoup(resp.text, "lxml")
        results = []

        # Gumtree listing cards
        for card in soup.select("a.user-ad-row, a.listing-link, div.user-ad-row"):
            try:
                title_el = card.select_one(
                    "span.user-ad-row__title, h3.listing-title, "
                    "p.tempo-title, div.user-ad-row__title"
                )
                price_el = card.select_one(
                    "span.user-ad-price, div.listing-price, "
                    "p.tempo-price, div.user-ad-row__price"
                )
                loc_el = card.select_one(
                    "span.user-ad-row__location, div.listing-location, "
                    "p.tempo-location"
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

                desc_el = card.select_one(
                    "span.user-ad-row__description, p.listing-description"
                )
                description = self._safe_text(desc_el)

                img_el = card.select_one("img")
                image_url = img_el.get("src", "") if img_el else ""

                if title and href:
                    results.append(Listing(
                        title=title,
                        price=price,
                        url=href,
                        location=location,
                        marketplace=self.name,
                        description=description,
                        image_url=image_url,
                    ))
            except Exception as e:
                logger.debug(f"[{self.name}] Parse error: {e}")
                continue

        logger.info(f"[{self.name}] Found {len(results)} results for '{term}' in '{region}'")
        return results
