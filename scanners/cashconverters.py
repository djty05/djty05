"""Cash Converters Australia scanner (online shop)."""

import logging
from urllib.parse import quote_plus

from bs4 import BeautifulSoup

from .base import BaseScanner, Listing

logger = logging.getLogger(__name__)


class CashConvertersScanner(BaseScanner):
    name = "Cash Converters AU"
    base_url = "https://www.cashconverters.com.au"

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
        # Cash Converters webshop search
        url = f"{self.base_url}/shop/search"
        params = {
            "q": term,
            "view": "grid",
            "sort": "newest",
        }
        resp = self._get(url, params=params)
        if not resp:
            return []

        soup = BeautifulSoup(resp.text, "lxml")
        results = []

        # Product cards on Cash Converters
        for card in soup.select(
            "div.product-card, div.product-item, "
            "div.search-result-item, article.product"
        ):
            try:
                title_el = card.select_one(
                    "h2.product-card__title, a.product-title, "
                    "h3.product-name, span.product-card__name, "
                    "div.product-card__title"
                )
                price_el = card.select_one(
                    "span.product-card__price, span.price, "
                    "div.product-price, span.product-card__price--current"
                )
                loc_el = card.select_one(
                    "span.product-card__store, span.store-name, "
                    "div.product-store"
                )

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

        # Also try the buy/search endpoint
        alt_results = self._search_buy(term)
        results.extend(alt_results)

        logger.info(f"[{self.name}] Found {len(results)} results for '{term}'")
        return results

    def _search_buy(self, term: str) -> list[Listing]:
        """Search the /buy endpoint as well."""
        url = f"{self.base_url}/buy/search"
        params = {"q": term, "sort": "DateNewest"}
        resp = self._get(url, params=params)
        if not resp:
            return []

        soup = BeautifulSoup(resp.text, "lxml")
        results = []

        for card in soup.select("div.product-tile, div.product-list-item"):
            try:
                title_el = card.select_one("a.product-tile__title, h3, a.title")
                price_el = card.select_one("span.price, div.product-tile__price")
                loc_el = card.select_one("span.store, div.store-name")

                title = self._safe_text(title_el, "No title")
                price = self._safe_text(price_el, "No price")
                location = self._safe_text(loc_el, "Australia")

                link = title_el if title_el and title_el.name == "a" else card.select_one("a")
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
            except Exception:
                continue

        return results
