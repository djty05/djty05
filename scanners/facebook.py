"""Facebook Marketplace scanner.

Facebook Marketplace requires JS rendering and login to scrape directly.
This scanner uses Google dork queries to find indexed FB Marketplace listings.

To work around Facebook's 402km distance limit, it searches from multiple
Australian cities to achieve national coverage.
"""

import logging
import re

from bs4 import BeautifulSoup

from .base import BaseScanner, Listing, HTML_PARSER

logger = logging.getLogger(__name__)

# Major Australian cities spread across the country for national coverage.
# Facebook Marketplace limits search to ~402km radius, so searching from
# these cities covers all of Australia.
AU_SEARCH_CITIES = [
    "Sydney",
    "Melbourne",
    "Brisbane",
    "Perth",
    "Adelaide",
    "Hobart",
    "Darwin",
    "Cairns",
    "Townsville",
    "Gold Coast",
    "Newcastle",
    "Canberra",
]


class FacebookMarketplaceScanner(BaseScanner):
    scanner_id = "facebook"
    name = "Facebook Marketplace"
    base_url = "https://www.facebook.com/marketplace"
    # Google dorking — be very conservative to avoid captchas
    min_request_delay = 5.0
    max_request_delay = 10.0

    def scan(self) -> list[Listing]:
        """Scan via Google-indexed FB Marketplace queries across multiple cities."""
        # Group search terms into batches of ~6 using OR operator
        batches = self._batch_terms(self.search_terms, batch_size=6)
        listings = []

        for batch_query in batches:
            try:
                # National search: query Google with city-specific terms
                found = self._google_search_national(batch_query)
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
            or_query = " OR ".join(f'"{t}"' for t in chunk)
            batches.append(or_query)
        return batches

    def _google_search_national(self, terms_query: str) -> list[Listing]:
        """Search Google for FB Marketplace listings across multiple AU cities.
        Stops early if Google starts blocking requests.
        """
        all_results = []
        consecutive_failures = 0

        # General Australia-wide search first
        results = self._google_search(terms_query, location_hint=None)
        if results:
            all_results.extend(results)
            consecutive_failures = 0
        else:
            consecutive_failures += 1

        # City-specific searches for national coverage
        for city in AU_SEARCH_CITIES:
            if consecutive_failures >= 3:
                logger.info(f"[{self.name}] Google rate-limiting, stopping city searches")
                break
            results = self._google_search(terms_query, location_hint=city)
            if results:
                all_results.extend(results)
                consecutive_failures = 0
            else:
                consecutive_failures += 1

        return all_results

    def _google_search(self, terms_query: str, location_hint: str = None) -> list[Listing]:
        """Search Google for Facebook Marketplace listings."""
        results = []

        if location_hint:
            query = f'site:facebook.com/marketplace ({terms_query}) "{location_hint}"'
        else:
            query = f'site:facebook.com/marketplace ({terms_query})'

        url = "https://www.google.com.au/search"
        params = {"q": query, "num": 50, "gl": "au"}

        # Single attempt per query to stay under radar
        resp = self._get(url, params=params, retries=1, delay=5.0)
        if not resp:
            if location_hint:
                logger.debug(f"[{self.name}] Google query failed for {location_hint}")
            else:
                logger.warning(f"[{self.name}] Google query failed")
            return []

        soup = BeautifulSoup(resp.text, HTML_PARSER)

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

                # Try to get location from title/description
                detected_location = location_hint or "Australia"
                for city in AU_SEARCH_CITIES:
                    if city.lower() in f"{title} {description}".lower():
                        detected_location = city
                        break

                # Try to extract thumbnail from Google result
                image_url = ""
                img_el = result.select_one("img")
                if img_el:
                    src = img_el.get("src", "") or img_el.get("data-src", "")
                    if src and src.startswith("http"):
                        image_url = src

                results.append(Listing(
                    title=title,
                    price=price,
                    url=href,
                    location=detected_location,
                    marketplace=self.name,
                    description=description,
                    image_url=image_url,
                ))
            except Exception as e:
                logger.debug(f"[{self.name}] Google parse error: {e}")
                continue

        if results:
            loc_label = location_hint or "Australia"
            logger.info(f"[{self.name}] Google found {len(results)} results ({loc_label})")
        return results
