"""Trading Post Australia scanner."""

import logging

from bs4 import BeautifulSoup

from .base import BaseScanner, Listing

logger = logging.getLogger(__name__)


class TradingPostScanner(BaseScanner):
    name = "Trading Post AU"
    base_url = "https://www.tradingpost.com.au"

    def scan(self) -> list[Listing]:
        listings = []
        for term in self.search_terms:
            try:
                found = self._search(term)
                listings.extend(found)
            except Exception as e:
                logger.error(f"[{self.name}] Error searching '{term}': {e}")
        return listings

    def _search(self, term: str) -> list[Listing]:
        url = f"{self.base_url}/search"
        params = {"q": term, "sort": "date"}
        resp = self._get(url, params=params)
        if not resp:
            return []

        soup = BeautifulSoup(resp.text, "lxml")
        results = []

        for card in soup.select(
            "div.listing-card, div.search-result, "
            "article.listing, div.ad-card"
        ):
            try:
                title_el = card.select_one("h2, h3, a.title, span.title")
                price_el = card.select_one("span.price, div.price")
                loc_el = card.select_one("span.location, div.location")

                title = self._safe_text(title_el, "No title")
                price = self._safe_text(price_el, "No price")
                location = self._safe_text(loc_el, "Australia")

                link = card.select_one("a")
                href = link.get("href", "") if link else ""
                if href and not href.startswith("http"):
                    href = f"{self.base_url}{href}"

                img_el = card.select_one("img")
                image_url = img_el.get("src", "") if img_el else ""

                if title and href:
                    results.append(Listing(
                        title=title,
                        price=price,
                        url=href,
                        location=location,
                        marketplace=self.name,
                        image_url=image_url,
                    ))
            except Exception as e:
                logger.debug(f"[{self.name}] Parse error: {e}")
                continue

        logger.info(f"[{self.name}] Found {len(results)} results for '{term}'")
        return results
