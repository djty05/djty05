"""eBay Australia scanner."""

import logging
from urllib.parse import quote_plus

from bs4 import BeautifulSoup

from .base import BaseScanner, Listing

logger = logging.getLogger(__name__)


class EbayAUScanner(BaseScanner):
    name = "eBay AU"
    base_url = "https://www.ebay.com.au"

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
        url = f"{self.base_url}/sch/i.html"
        params = {
            "_nkw": term,
            "_sop": 10,       # newly listed
            "LH_ItemCondition": "4",  # used items (more likely stolen goods resold)
            "_ipg": 100,       # results per page
            "LH_PrefLoc": 1,   # items located in Australia
            "rt": "nc",
        }
        resp = self._get(url, params=params)
        if not resp:
            return []

        soup = BeautifulSoup(resp.text, "lxml")
        results = []

        for item in soup.select("li.s-item, div.s-item__wrapper"):
            try:
                title_el = item.select_one(
                    "div.s-item__title span, h3.s-item__title, "
                    "span.s-item__title--has-tags"
                )
                price_el = item.select_one(
                    "span.s-item__price, div.s-item__detail--primaryInfo"
                )
                loc_el = item.select_one(
                    "span.s-item__location, span.s-item__itemLocation"
                )
                link_el = item.select_one("a.s-item__link")

                title = self._safe_text(title_el, "No title")
                if title.lower() in ("shop on ebay", "no title"):
                    continue

                price = self._safe_text(price_el, "No price")
                location = self._safe_text(loc_el, "Australia")
                url = link_el.get("href", "") if link_el else ""

                img_el = item.select_one("img.s-item__image-img")
                image_url = img_el.get("src", "") if img_el else ""

                if title and url:
                    results.append(Listing(
                        title=title,
                        price=price,
                        url=url,
                        location=location,
                        marketplace=self.name,
                        image_url=image_url,
                    ))
            except Exception as e:
                logger.debug(f"[{self.name}] Parse error: {e}")
                continue

        logger.info(f"[{self.name}] Found {len(results)} results for '{term}'")
        return results
