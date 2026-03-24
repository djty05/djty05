"""Facebook Marketplace scanner.

Facebook Marketplace requires JS rendering and login to scrape directly.
This scanner uses a small number of consolidated Google dork queries to
find indexed FB Marketplace listings, avoiding the rate limiting caused
by sending one query per search term.
"""

import logging
import re

from bs4 import BeautifulSoup

from .base import BaseScanner, Listing

logger = logging.getLogger(__name__)


class FacebookMarketplaceScanner(BaseScanner):
    scanner_id = "facebook"
    name = "Facebook Marketplace"
    base_url = "https://www.facebook.com/marketplace"
    # Google dorking — be very conservative to avoid captchas
    min_request_delay = 5.0
    max_request_delay = 10.0

    def scan(self) -> list[Listing]:
        """Scan via consolidated Google-indexed FB Marketplace queries."""
        # Group search terms into batches of ~6 using OR operator to
        # reduce the number of Google requests drastically.
        batches = self._batch_terms(self.search_terms, batch_size=6)
        listings = []

        for batch_query in batches:
            try:
                found = self._google_search(batch_query)
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

    def _batch_terms(self, terms: list[str], batch_size: int = 6) -> list[str]:
        """Combine search terms into OR-joined batches for fewer queries."""
        batches = []
        for i in range(0, len(terms), batch_size):
            chunk = terms[i:i + batch_size]
            # Join with OR for Google: ("term1" OR "term2" OR "term3")
            or_query = " OR ".join(f'"{t}"' for t in chunk)
            batches.append(or_query)
        return batches

    def _google_search(self, terms_query: str) -> list[Listing]:
        """Search Google for Facebook Marketplace listings in Australia."""
        results = []
        query = f'site:facebook.com/marketplace ({terms_query})'
        url = "https://www.google.com.au/search"
        params = {"q": query, "num": 50, "gl": "au"}

        # Single attempt, no retry on 429 — just skip gracefully
        resp = self._get(url, params=params, retries=1, delay=5.0)
        if not resp:
            logger.warning(f"[{self.name}] Google query failed, skipping batch")
            return []

        soup = BeautifulSoup(resp.text, "lxml")

        for result in soup.select("div.g, div.tF2Cxc"):
            try:
                link_el = result.select_one("a")
                title_el = result.select_one("h3")

                href = link_el.get("href", "") if link_el else ""
                title = self._safe_text(title_el, "No title")

                if "facebook.com/marketplace" not in href:
                    continue

                snippet_el = result.select_one(
                    "span.aCOpRe, div.VwiC3b, span.st, "
                    "div[data-sncf], div.kb0PBd"
                )
                description = self._safe_text(snippet_el)

                price = "See listing"
                price_match = re.search(r'\$[\d,.]+', f"{title} {description}")
                if price_match:
                    price = price_match.group(0)

                results.append(Listing(
                    title=title,
                    price=price,
                    url=href,
                    location="Australia",
                    marketplace=self.name,
                    description=description,
                ))
            except Exception as e:
                logger.debug(f"[{self.name}] Google parse error: {e}")
                continue

        logger.info(f"[{self.name}] Google found {len(results)} results for batch")
        return results
