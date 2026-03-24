"""Mercari / general classifieds scanner.

Also covers Carousell (popular in AU) via Google dorking.
"""

import logging
import re

from bs4 import BeautifulSoup

from .base import BaseScanner, Listing

logger = logging.getLogger(__name__)


class MercariScanner(BaseScanner):
    """Scans multiple smaller Australian marketplaces via Google indexing."""

    name = "Other Marketplaces"
    # Google dorking — be very conservative to avoid captchas
    min_request_delay = 5.0
    max_request_delay = 10.0

    # Sites to search via Google
    SITES = [
        "carousell.com.au",
        "marketplace.com.au",
        "sell.com.au",
        "quicksales.com.au",
        "locanto.com.au",
        "classifiedsau.com.au",
    ]

    def scan(self) -> list[Listing]:
        listings = []
        for term in self.search_terms:
            try:
                found = self._google_multi_search(term)
                listings.extend(found)
            except Exception as e:
                logger.error(f"[{self.name}] Error searching '{term}': {e}")
        return listings

    def _google_multi_search(self, term: str) -> list[Listing]:
        """Search Google for listings across multiple marketplace sites."""
        results = []

        sites_query = " OR ".join(f"site:{s}" for s in self.SITES)
        query = f'({sites_query}) "{term}"'

        url = "https://www.google.com.au/search"
        params = {"q": query, "num": 50, "gl": "au"}

        resp = self._get(url, params=params, delay=3.0)
        if not resp:
            return []

        soup = BeautifulSoup(resp.text, "lxml")

        for result in soup.select("div.g, div.tF2Cxc"):
            try:
                link_el = result.select_one("a")
                title_el = result.select_one("h3")
                snippet_el = result.select_one(
                    "span.aCOpRe, div.VwiC3b, span.st, "
                    "div[data-sncf], div.kb0PBd"
                )

                href = link_el.get("href", "") if link_el else ""
                title = self._safe_text(title_el, "No title")
                description = self._safe_text(snippet_el)

                # Identify which marketplace
                marketplace = self.name
                for site in self.SITES:
                    if site in href:
                        marketplace = site.split(".")[0].title()
                        break

                price = "See listing"
                price_match = re.search(r'\$[\d,.]+', f"{title} {description}")
                if price_match:
                    price = price_match.group(0)

                if title and href:
                    results.append(Listing(
                        title=title,
                        price=price,
                        url=href,
                        location="Australia",
                        marketplace=marketplace,
                        description=description,
                    ))
            except Exception as e:
                logger.debug(f"[{self.name}] Parse error: {e}")
                continue

        logger.info(f"[{self.name}] Found {len(results)} results for '{term}'")
        return results
