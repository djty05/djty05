"""eBay Australia scanner.

Supports both the legacy .s-item layout and the newer .s-card layout.
Falls back to multi-engine search if direct scraping fails.
"""

import logging
import re
from urllib.parse import quote_plus

from bs4 import BeautifulSoup

from .base import BaseScanner, Listing, HTML_PARSER
from .search_engines import site_search

logger = logging.getLogger(__name__)


class EbayAUScanner(BaseScanner):
    scanner_id = "ebay"
    name = "eBay AU"
    base_url = "https://www.ebay.com.au"
    min_request_delay = 1.5
    max_request_delay = 3.5

    RELEVANCE_KEYWORDS = {
        "fluke", "tester", "multimeter", "meter", "clamp", "insulation",
        "rcd", "loop", "impedance", "electrical", "multifunction",
        "megger", "test", "probe", "voltage", "continuity",
    }

    def scan(self) -> list[Listing]:
        listings = self._scan_direct()
        if listings:
            return listings

        logger.info(f"[{self.name}] Direct scraping failed, trying search engines")
        listings = self._scan_search_engine_fallback()
        if listings:
            return listings

        logger.info(f"[{self.name}] All methods failed, generating direct links")
        return self._generate_direct_links()

    def search_open(self, term: str) -> list[Listing]:
        results = self._search(term, open_search=True)
        if results:
            return results
        logger.info(f"[{self.name}] Direct search failed for '{term}', trying search engines")
        return self._search_engine_term(term)

    def _scan_direct(self) -> list[Listing]:
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
                        logger.info(f"[{self.name}] Site unreachable after {consecutive_failures} failures")
                        return []
            except Exception as e:
                logger.error(f"[{self.name}] Error searching '{term}': {e}")
                consecutive_failures += 1
                if consecutive_failures >= 3 and not listings:
                    return []
        return listings

    def _search(self, term: str, open_search: bool = False) -> list[Listing]:
        url = f"{self.base_url}/sch/i.html"
        params = {
            "_nkw": term,
            "_sop": 10,
            "_ipg": 100,
            "LH_PrefLoc": 1,
            "rt": "nc",
        }
        if not open_search:
            params["LH_ItemCondition"] = "4"
            params["_sacat"] = 58277

        resp = self._get(url, params=params)
        if not resp:
            return []

        soup = BeautifulSoup(resp.text, HTML_PARSER)
        results = []

        s_cards = soup.select("li.s-card")
        s_items = soup.select("li.s-item, div.s-item__wrapper")

        if s_cards:
            results = self._parse_s_card(s_cards)
        if s_items:
            results.extend(self._parse_s_item(s_items))

        if not open_search:
            results = [r for r in results if self._is_relevant(r.title)]
        logger.info(f"[{self.name}] Found {len(results)} results for '{term}'")
        return results

    def _scan_search_engine_fallback(self) -> list[Listing]:
        all_results = []
        for i in range(0, len(self.search_terms), 4):
            chunk = self.search_terms[i:i + 4]
            or_query = " OR ".join(f'"{t}"' for t in chunk)
            results = site_search("ebay.com.au", or_query)
            for r in results:
                if "/sch/" in r.url or "/itm/" not in r.url:
                    continue
                price = "See listing"
                price_match = re.search(r'\$[\d,.]+', f"{r.title} {r.snippet}")
                if price_match:
                    price = price_match.group(0)
                all_results.append(Listing(
                    title=r.title, price=price, url=r.url,
                    location="Australia", marketplace=self.name,
                    description=r.snippet, image_url=r.image_url,
                ))
        logger.info(f"[{self.name}] Search engine fallback: {len(all_results)} results")
        return all_results

    def _search_engine_term(self, term: str) -> list[Listing]:
        results = site_search("ebay.com.au", term)
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

    def _generate_direct_links(self) -> list[Listing]:
        links = []
        for term in self.search_terms[:4]:
            encoded = quote_plus(term)
            url = f"{self.base_url}/sch/i.html?_nkw={encoded}&LH_PrefLoc=1&_sop=10"
            links.append(Listing(
                title=f"eBay: {term}", price="Open eBay", url=url,
                location="Australia", marketplace=self.name,
                description=f"Click to search eBay AU for '{term}'",
            ))
        return links

    def _is_relevant(self, title: str) -> bool:
        title_lower = title.lower()
        return any(kw in title_lower for kw in self.RELEVANCE_KEYWORDS)

    def _parse_s_card(self, cards) -> list[Listing]:
        results = []
        for card in cards:
            try:
                title_el = card.select_one("span.s-card__title, h3.s-card__title, h3")
                price_el = card.select_one("span.s-card__price, div.s-card__price")
                loc_el = card.select_one("span.s-card__location, div.s-card__location, span.s-card__subtitle")
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
                        title=title, price=price, url=item_url,
                        location=location, marketplace=self.name,
                        image_url=image_url,
                    ))
            except Exception as e:
                logger.debug(f"[{self.name}] s-card parse error: {e}")
        return results

    def _parse_s_item(self, items) -> list[Listing]:
        results = []
        for item in items:
            try:
                title_el = item.select_one(
                    "div.s-item__title span, h3.s-item__title, "
                    "span.s-item__title--has-tags, h3"
                )
                price_el = item.select_one("span.s-item__price, div.s-item__detail--primaryInfo")
                loc_el = item.select_one("span.s-item__location, span.s-item__itemLocation")
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
                        title=title, price=price, url=item_url,
                        location=location, marketplace=self.name,
                        image_url=image_url,
                    ))
            except Exception as e:
                logger.debug(f"[{self.name}] s-item parse error: {e}")
        return results
