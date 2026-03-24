"""Other Australian marketplaces scanner.

Covers Carousell, Locanto, and other smaller AU classifieds via
batched Google dorking to avoid rate limiting.
"""

import logging
import re

from bs4 import BeautifulSoup

from .base import BaseScanner, Listing

logger = logging.getLogger(__name__)


class MercariScanner(BaseScanner):
    """Scans multiple smaller Australian marketplaces via Google indexing."""
    scanner_id = "other"

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
        """Scan with batched Google queries to minimise request count."""
        listings = []

        # Batch search terms into groups of 6
        batches = []
        for i in range(0, len(self.search_terms), 6):
            chunk = self.search_terms[i:i + 6]
            or_query = " OR ".join(f'"{t}"' for t in chunk)
            batches.append(or_query)

        sites_query = " OR ".join(f"site:{s}" for s in self.SITES)

        for batch_query in batches:
            try:
                found = self._google_search(sites_query, batch_query)
                listings.extend(found)
            except Exception as e:
                logger.error(f"[{self.name}] Error searching batch: {e}")

        # Deduplicate by URL
        seen_urls = set()
        unique = []
        for listing in listings:
            if listing.url not in seen_urls:
                seen_urls.add(listing.url)
                unique.append(listing)

        logger.info(f"[{self.name}] Total: {len(unique)} unique listings")
        return unique

    def _google_search(self, sites_query: str, terms_query: str) -> list[Listing]:
        """Search Google for listings across multiple marketplace sites."""
        results = []
        query = f'({sites_query}) ({terms_query})'

        url = "https://www.google.com.au/search"
        params = {"q": query, "num": 50, "gl": "au"}

        # Single attempt, no retry on 429
        resp = self._get(url, params=params, retries=1, delay=5.0)
        if not resp:
            logger.warning(f"[{self.name}] Google query failed, skipping batch")
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

        logger.info(f"[{self.name}] Google found {len(results)} results for batch")
        return results
