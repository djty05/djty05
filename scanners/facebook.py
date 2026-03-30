"""Facebook Marketplace scanner.

Facebook Marketplace requires JS rendering and login to scrape directly.
This scanner uses multi-engine search (Google, Bing, DuckDuckGo) to find
indexed FB Marketplace listings.

To work around Facebook's 402km distance limit, it searches from multiple
Australian cities to achieve national coverage.
"""

import logging
import re

from .base import BaseScanner, Listing
from .search_engines import search_google, search_bing, search_duckduckgo, SearchResult

logger = logging.getLogger(__name__)

AU_SEARCH_CITIES = [
    "Sydney", "Melbourne", "Brisbane", "Perth", "Adelaide",
    "Hobart", "Darwin", "Cairns", "Townsville", "Gold Coast",
    "Newcastle", "Canberra",
]


class FacebookMarketplaceScanner(BaseScanner):
    scanner_id = "facebook"
    name = "Facebook Marketplace"
    base_url = "https://www.facebook.com/marketplace"
    min_request_delay = 5.0
    max_request_delay = 10.0

    QUICK_CITIES = ["Sydney", "Melbourne", "Brisbane", "Perth", "Adelaide"]

    def scan(self, quick: bool = False) -> list[Listing]:
        """Scan via search-engine-indexed FB Marketplace queries."""
        batches = self._batch_terms(self.search_terms, batch_size=6)
        listings = []

        for batch_query in batches:
            try:
                found = self._multi_engine_national(batch_query, quick=quick)
                listings.extend(found)
            except Exception as e:
                logger.error(f"[{self.name}] Error searching batch: {e}")

        return self._deduplicate(listings)

    def search_open(self, query: str) -> list[Listing]:
        """Manual search — uses all three search engines for best coverage."""
        logger.info(f"[{self.name}] Manual search for '{query}'")
        listings = []

        # Try all three engines for national search
        fb_query = f'site:facebook.com/marketplace {query}'

        for engine_name, engine_fn in [("Google", search_google), ("Bing", search_bing), ("DuckDuckGo", search_duckduckgo)]:
            try:
                results = engine_fn(fb_query)
                if results:
                    parsed = self._results_to_listings(results)
                    listings.extend(parsed)
                    logger.info(f"[{self.name}] {engine_name}: {len(parsed)} results")
                else:
                    logger.info(f"[{self.name}] {engine_name}: 0 results")
            except Exception as e:
                logger.warning(f"[{self.name}] {engine_name} error: {e}")

        # Also try city-specific searches on whichever engine works
        for city in self.QUICK_CITIES:
            city_query = f'site:facebook.com/marketplace {query} "{city}"'
            for engine_fn in [search_bing, search_duckduckgo, search_google]:
                try:
                    results = engine_fn(city_query)
                    if results:
                        parsed = self._results_to_listings(results, default_location=city)
                        listings.extend(parsed)
                        logger.info(f"[{self.name}] {city}: {len(parsed)} results")
                        break  # Got results for this city, move on
                except Exception:
                    continue

        unique = self._deduplicate(listings)
        logger.info(f"[{self.name}] Manual search total: {len(unique)} unique listings")
        return unique

    def _multi_engine_national(self, terms_query: str, quick: bool = False) -> list[Listing]:
        """Search multiple engines for FB Marketplace listings across AU."""
        all_results = []

        # National search — try engines in order
        national_query = f'site:facebook.com/marketplace ({terms_query})'
        for engine_fn in [search_google, search_bing, search_duckduckgo]:
            try:
                results = engine_fn(national_query)
                if results:
                    all_results.extend(self._results_to_listings(results))
                    break
            except Exception:
                continue

        # City-specific searches
        cities = self.QUICK_CITIES if quick else AU_SEARCH_CITIES
        consecutive_failures = 0
        max_failures = 2 if quick else 3

        for city in cities:
            if consecutive_failures >= max_failures:
                logger.info(f"[{self.name}] Too many failures, stopping city searches")
                break

            city_query = f'site:facebook.com/marketplace ({terms_query}) "{city}"'
            found = False
            for engine_fn in [search_bing, search_duckduckgo, search_google]:
                try:
                    results = engine_fn(city_query)
                    if results:
                        all_results.extend(self._results_to_listings(results, default_location=city))
                        found = True
                        consecutive_failures = 0
                        break
                except Exception:
                    continue

            if not found:
                consecutive_failures += 1

        return all_results

    def _results_to_listings(self, results: list[SearchResult], default_location: str = "Australia") -> list[Listing]:
        """Convert SearchResult objects to Listings, filtering to FB Marketplace URLs."""
        listings = []
        for r in results:
            if "facebook.com/marketplace" not in r.url:
                continue

            price = "See listing"
            price_match = re.search(r'\$[\d,.]+', f"{r.title} {r.snippet}")
            if price_match:
                price = price_match.group(0)

            detected_location = default_location
            for city in AU_SEARCH_CITIES:
                if city.lower() in f"{r.title} {r.snippet}".lower():
                    detected_location = city
                    break

            listings.append(Listing(
                title=r.title,
                price=price,
                url=r.url,
                location=detected_location,
                marketplace=self.name,
                description=r.snippet,
                image_url=r.image_url,
            ))
        return listings

    def _batch_terms(self, terms: list[str], batch_size: int = 6) -> list[str]:
        batches = []
        for i in range(0, len(terms), batch_size):
            chunk = terms[i:i + batch_size]
            or_query = " OR ".join(f'"{t}"' for t in chunk)
            batches.append(or_query)
        return batches

    def _deduplicate(self, listings: list[Listing]) -> list[Listing]:
        seen_urls = set()
        unique = []
        for listing in listings:
            if listing.url not in seen_urls:
                seen_urls.add(listing.url)
                unique.append(listing)
        logger.info(f"[{self.name}] Total: {len(unique)} unique listings")
        return unique
