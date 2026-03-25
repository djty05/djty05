"""eBay Australia scanner.

Supports both the legacy .s-item layout and the newer .s-card layout
that eBay has been rolling out since late 2025.
"""

import logging
from urllib.parse import quote_plus

from bs4 import BeautifulSoup

from .base import BaseScanner, Listing, HTML_PARSER

logger = logging.getLogger(__name__)


class EbayAUScanner(BaseScanner):
    scanner_id = "ebay"
    name = "eBay AU"
    base_url = "https://www.ebay.com.au"
    # eBay is aggressive with bot detection — be more conservative
    min_request_delay = 3.0
    max_request_delay = 7.0

    # Keywords that a relevant listing title should contain at least one of.
    # This filters out junk like jellybean cookies or toy figurines.
    RELEVANCE_KEYWORDS = {
        "fluke", "tester", "multimeter", "meter", "clamp", "insulation",
        "rcd", "loop", "impedance", "electrical", "multifunction",
        "megger", "test", "probe", "voltage", "continuity",
    }

    def scan(self) -> list[Listing]:
        listings = []
        consecutive_failures = 0
        for term in self.search_terms:
            try:
                found = self._search(term)
                if found:
                    listings.extend(found)
                    consecutive_failures = 0
                else:
                    consecutive_failures += 1
                    if consecutive_failures >= 3 and not listings:
                        logger.info(f"[{self.name}] Site unreachable after {consecutive_failures} failures, stopping")
                        break
            except Exception as e:
                logger.error(f"[{self.name}] Error searching '{term}': {e}")
                consecutive_failures += 1
                if consecutive_failures >= 3 and not listings:
                    logger.info(f"[{self.name}] Site unreachable, stopping")
                    break
        return listings

    def _search(self, term: str) -> list[Listing]:
        url = f"{self.base_url}/sch/i.html"
        params = {
            "_nkw": term,
            "_sop": 10,       # newly listed
            "LH_ItemCondition": "4",  # used items
            "_ipg": 100,       # results per page
            "LH_PrefLoc": 1,   # items located in Australia
            "_sacat": 58277,   # Electrical Test Equipment category
            "rt": "nc",
        }
        resp = self._get(url, params=params)
        if not resp:
            return []

        soup = BeautifulSoup(resp.text, HTML_PARSER)
        results = []

        # Detect which layout eBay is serving
        s_cards = soup.select("li.s-card")
        s_items = soup.select("li.s-item, div.s-item__wrapper")

        if s_cards:
            results = self._parse_s_card(s_cards)
        if s_items:
            results.extend(self._parse_s_item(s_items))

        # Filter out irrelevant results that slipped past category filter
        results = [r for r in results if self._is_relevant(r.title)]
        logger.info(f"[{self.name}] Found {len(results)} relevant results for '{term}'")
        return results

    def _is_relevant(self, title: str) -> bool:
        """Check if a listing title contains at least one relevance keyword."""
        title_lower = title.lower()
        return any(kw in title_lower for kw in self.RELEVANCE_KEYWORDS)

    def _parse_s_card(self, cards) -> list[Listing]:
        """Parse the newer .s-card layout."""
        results = []
        for card in cards:
            try:
                title_el = card.select_one(
                    "span.s-card__title, h3.s-card__title, "
                    "div.s-card__title, h3"
                )
                price_el = card.select_one(
                    "span.s-card__price, div.s-card__price"
                )
                loc_el = card.select_one(
                    "span.s-card__location, div.s-card__location, "
                    "span.s-card__subtitle"
                )
                link_el = card.select_one("a.su-link, a")

                title = self._safe_text(title_el, "No title")
                if title.lower() in ("shop on ebay", "no title", ""):
                    continue

                price = self._safe_text(price_el, "No price")
                location = self._safe_text(loc_el, "Australia")
                item_url = link_el.get("href", "") if link_el else ""

                img_el = card.select_one("img.s-card__image, img")
                image_url = img_el.get("src", "") if img_el else ""

                if title and item_url:
                    results.append(Listing(
                        title=title,
                        price=price,
                        url=item_url,
                        location=location,
                        marketplace=self.name,
                        image_url=image_url,
                    ))
            except Exception as e:
                logger.debug(f"[{self.name}] s-card parse error: {e}")
                continue
        return results

    def _parse_s_item(self, items) -> list[Listing]:
        """Parse the legacy .s-item layout."""
        results = []
        for item in items:
            try:
                title_el = item.select_one(
                    "div.s-item__title span, h3.s-item__title, "
                    "span.s-item__title--has-tags, h3"
                )
                price_el = item.select_one(
                    "span.s-item__price, div.s-item__detail--primaryInfo"
                )
                loc_el = item.select_one(
                    "span.s-item__location, span.s-item__itemLocation"
                )
                link_el = item.select_one("a.s-item__link, a")

                title = self._safe_text(title_el, "No title")
                if title.lower() in ("shop on ebay", "no title", ""):
                    continue

                price = self._safe_text(price_el, "No price")
                location = self._safe_text(loc_el, "Australia")
                item_url = link_el.get("href", "") if link_el else ""

                img_el = item.select_one("img.s-item__image-img, img")
                image_url = img_el.get("src", "") if img_el else ""

                if title and item_url:
                    results.append(Listing(
                        title=title,
                        price=price,
                        url=item_url,
                        location=location,
                        marketplace=self.name,
                        image_url=image_url,
                    ))
            except Exception as e:
                logger.debug(f"[{self.name}] s-item parse error: {e}")
                continue
        return results
