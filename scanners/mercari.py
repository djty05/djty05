"""Other Australian marketplaces scanner.

Covers Carousell, Locanto, and other smaller AU classifieds via
multi-engine search (Google, Bing, DuckDuckGo) with automatic fallback.
"""

import logging
import re

from .base import BaseScanner, Listing
from .search_engines import search_multi, SearchResult

logger = logging.getLogger(__name__)


class MercariScanner(BaseScanner):
    """Scans multiple smaller Australian marketplaces via search engines."""
    scanner_id = "other"
    name = "Other Marketplaces"
    min_request_delay = 5.0
    max_request_delay = 10.0

    SITES = [
        "carousell.com.au",
        "marketplace.com.au",
        "sell.com.au",
        "quicksales.com.au",
        "locanto.com.au",
        "classifiedsau.com.au",
    ]

    def scan(self) -> list[Listing]:
        """Scan with batched multi-engine queries."""
        listings = []

        batches = []
        for i in range(0, len(self.search_terms), 6):
            chunk = self.search_terms[i:i + 6]
            or_query = " OR ".join(f'"{t}"' for t in chunk)
            batches.append(or_query)

        sites_query = " OR ".join(f"site:{s}" for s in self.SITES)

        for batch_query in batches:
            try:
                found = self._search_engines(sites_query, batch_query)
                listings.extend(found)
            except Exception as e:
                logger.error(f"[{self.name}] Error searching batch: {e}")

        # Deduplicate
        seen_urls = set()
        unique = []
        for listing in listings:
            if listing.url not in seen_urls:
                seen_urls.add(listing.url)
                unique.append(listing)

        logger.info(f"[{self.name}] Total: {len(unique)} unique listings")
        return unique

    def search_open(self, query: str) -> list[Listing]:
        """Manual search across all smaller marketplaces."""
        sites_query = " OR ".join(f"site:{s}" for s in self.SITES)
        results = self._search_engines(sites_query, query)

        seen_urls = set()
        unique = []
        for listing in results:
            if listing.url not in seen_urls:
                seen_urls.add(listing.url)
                unique.append(listing)

        logger.info(f"[{self.name}] Manual search: {len(unique)} unique results")
        return unique

    def _search_engines(self, sites_query: str, terms_query: str) -> list[Listing]:
        """Search across multiple engines for listings on smaller sites."""
        query = f'({sites_query}) ({terms_query})'
        results = search_multi(query)

        listings = []
        for r in results:
            marketplace = self.name
            for site in self.SITES:
                if site in r.url:
                    marketplace = site.split(".")[0].title()
                    break

            # Skip results not from our target sites
            if marketplace == self.name:
                is_relevant = any(site in r.url for site in self.SITES)
                if not is_relevant:
                    continue

            price = "See listing"
            price_match = re.search(r'\$[\d,.]+', f"{r.title} {r.snippet}")
            if price_match:
                price = price_match.group(0)

            location = "Australia"
            loc_match = re.search(
                r'(Sydney|Melbourne|Brisbane|Perth|Adelaide|Hobart|Darwin|Canberra)',
                f"{r.title} {r.snippet}", re.IGNORECASE
            )
            if loc_match:
                location = loc_match.group(1).title()

            listings.append(Listing(
                title=r.title,
                price=price,
                url=r.url,
                location=location,
                marketplace=marketplace,
                description=r.snippet,
            ))

        logger.info(f"[{self.name}] Search engines found {len(listings)} results")
        return listings
