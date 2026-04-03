"""Other Australian marketplaces scanner.

Covers smaller AU classifieds via multi-engine search:
  - Carousell (au.carousell.com)
  - Locanto (locanto.com.au)
  - Marketplace.com.au
  - Other classified sites

Uses Google, Bing, DuckDuckGo with automatic fallback.
"""

import logging
import re

from .base import BaseScanner, Listing
from .search_engines import search_multi

logger = logging.getLogger(__name__)


class MercariScanner(BaseScanner):
    """Scans multiple smaller Australian marketplaces via search engines."""
    scanner_id = "other"
    name = "Other Marketplaces"
    min_request_delay = 2.0
    max_request_delay = 4.0

    # Corrected site domains (2026)
    SITES = [
        "au.carousell.com",
        "locanto.com.au",
        "marketplace.com.au",
        "sell.com.au",
        "quicksales.com.au",
    ]

    SITE_NAMES = {
        "au.carousell.com": "Carousell",
        "locanto.com.au": "Locanto",
        "marketplace.com.au": "Marketplace",
        "sell.com.au": "Sell.com.au",
        "quicksales.com.au": "QuickSales",
    }

    def scan(self) -> list[Listing]:
        """Scan with batched multi-engine queries."""
        listings = []

        # Single batched query with all terms
        all_terms = " OR ".join(f'"{t}"' for t in self.search_terms[:4])
        sites_query = " OR ".join(f"site:{s}" for s in self.SITES)

        try:
            found = self._search_engines(sites_query, all_terms)
            listings.extend(found)
        except Exception as e:
            logger.error(f"[{self.name}] Error searching batch: {e}")

        # One individual search per top site
        for site in self.SITES[:2]:
            try:
                results = search_multi(f"site:{site} fluke tester multimeter")
                for r in results:
                    if site in r.url:
                        listings.append(self._result_to_listing(r, site))
            except Exception:
                continue

        return self._deduplicate(listings)

    def search_open(self, query: str) -> list[Listing]:
        """Manual search across all smaller marketplaces."""
        listings = []

        # Search each site individually for better results
        for site in self.SITES:
            try:
                results = search_multi(f"site:{site} {query}")
                for r in results:
                    if site in r.url:
                        listings.append(self._result_to_listing(r, site))
                if results:
                    logger.info(f"[{self.name}] {self.SITE_NAMES.get(site, site)}: {len([r for r in results if site in r.url])} results")
            except Exception as e:
                logger.debug(f"[{self.name}] Error searching {site}: {e}")

        # Also try a broad search
        results = search_multi(f'{query} australia classifieds buy sell')
        for r in results:
            for site in self.SITES:
                if site in r.url:
                    listings.append(self._result_to_listing(r, site))
                    break

        unique = self._deduplicate(listings)
        logger.info(f"[{self.name}] Manual search: {len(unique)} unique results")
        return unique

    def _search_engines(self, sites_query: str, terms_query: str) -> list[Listing]:
        """Search across multiple engines for listings on smaller sites."""
        query = f'({sites_query}) ({terms_query})'
        results = search_multi(query)

        listings = []
        for r in results:
            matched_site = None
            for site in self.SITES:
                if site in r.url:
                    matched_site = site
                    break

            if not matched_site:
                continue

            listings.append(self._result_to_listing(r, matched_site))

        logger.info(f"[{self.name}] Search engines found {len(listings)} results")
        return listings

    def _result_to_listing(self, r, site: str) -> Listing:
        """Convert a search result to a Listing."""
        marketplace = self.SITE_NAMES.get(site, site.split(".")[0].title())

        price = "See listing"
        price_match = re.search(r'\$[\d,.]+', f"{r.title} {r.snippet}")
        if price_match:
            price = price_match.group(0)

        location = "Australia"
        loc_match = re.search(
            r'(Sydney|Melbourne|Brisbane|Perth|Adelaide|Hobart|Darwin|Canberra|Gold Coast|Newcastle)',
            f"{r.title} {r.snippet}", re.IGNORECASE
        )
        if loc_match:
            location = loc_match.group(1).title()

        return Listing(
            title=r.title,
            price=price,
            url=r.url,
            location=location,
            marketplace=marketplace,
            description=r.snippet,
            image_url=getattr(r, 'image_url', ''),
        )

    def _deduplicate(self, listings: list[Listing]) -> list[Listing]:
        seen = set()
        unique = []
        for l in listings:
            key = l.url.split("?")[0]
            if key not in seen:
                seen.add(key)
                unique.append(l)
        return unique
