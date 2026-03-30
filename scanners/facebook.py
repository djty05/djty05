"""Facebook Marketplace scanner.

Facebook Marketplace requires JS rendering and login to scrape directly.
This scanner uses Google dork queries to find indexed FB Marketplace listings,
with DuckDuckGo as a fallback when Google blocks requests.

To work around Facebook's 402km distance limit, it searches from multiple
Australian cities to achieve national coverage.
"""

import logging
import re
from urllib.parse import quote_plus

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

    # Fewer cities for manual single-term searches (faster)
    QUICK_CITIES = ["Sydney", "Melbourne", "Brisbane", "Perth", "Adelaide"]

    def scan(self, quick: bool = False) -> list[Listing]:
        """Scan via Google-indexed FB Marketplace queries across multiple cities.

        If quick=True, only search 5 major cities (for manual search speed).
        """
        batches = self._batch_terms(self.search_terms, batch_size=6)
        listings = []

        for batch_query in batches:
            try:
                found = self._google_search_national(batch_query, quick=quick)
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

    def search_open(self, query: str) -> list[Listing]:
        """Manual search — tries Google dorking first, falls back to DuckDuckGo."""
        logger.info(f"[{self.name}] Manual search for '{query}'")
        listings = []

        # Try Google first (national, no city-specific)
        google_results = self._google_search(query, location_hint=None)
        if google_results:
            listings.extend(google_results)
            logger.info(f"[{self.name}] Google general: {len(google_results)} results")
        else:
            logger.warning(f"[{self.name}] Google general search returned 0 results")

        # Try a couple major cities via Google
        google_blocked = False
        for city in ["Sydney", "Melbourne", "Brisbane"]:
            city_results = self._google_search(query, location_hint=city)
            if city_results:
                listings.extend(city_results)
                logger.info(f"[{self.name}] Google {city}: {len(city_results)} results")
            else:
                logger.warning(f"[{self.name}] Google {city}: 0 results (possibly blocked)")
                if not listings:
                    google_blocked = True
                    break

        # If Google seems blocked, try DuckDuckGo as fallback
        if not listings or google_blocked:
            logger.info(f"[{self.name}] Google returned no results, trying DuckDuckGo fallback")
            ddg_results = self._duckduckgo_search(query)
            listings.extend(ddg_results)

        # Deduplicate
        seen_urls = set()
        unique = []
        for listing in listings:
            if listing.url not in seen_urls:
                seen_urls.add(listing.url)
                unique.append(listing)

        logger.info(f"[{self.name}] Manual search total: {len(unique)} unique listings")
        return unique

    def _batch_terms(self, terms: list[str], batch_size: int = 6) -> list[str]:
        """Combine search terms into OR-joined batches for fewer queries."""
        batches = []
        for i in range(0, len(terms), batch_size):
            chunk = terms[i:i + batch_size]
            or_query = " OR ".join(f'"{t}"' for t in chunk)
            batches.append(or_query)
        return batches

    def _google_search_national(self, terms_query: str, quick: bool = False) -> list[Listing]:
        """Search Google for FB Marketplace listings across AU cities.
        Stops early if Google starts blocking requests.

        quick=True: only 5 major cities (for manual search speed).
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

        # City-specific searches
        cities = self.QUICK_CITIES if quick else AU_SEARCH_CITIES
        max_failures = 2 if quick else 3

        for city in cities:
            if consecutive_failures >= max_failures:
                logger.info(f"[{self.name}] Google rate-limiting, stopping city searches")
                break
            results = self._google_search(terms_query, location_hint=city)
            if results:
                all_results.extend(results)
                consecutive_failures = 0
            else:
                consecutive_failures += 1

        # If Google returned nothing, try DuckDuckGo
        if not all_results:
            logger.info(f"[{self.name}] Google returned 0 results, trying DuckDuckGo")
            ddg = self._duckduckgo_search(terms_query)
            all_results.extend(ddg)

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

        resp = self._get(url, params=params, retries=1, delay=5.0)
        if not resp:
            if location_hint:
                logger.debug(f"[{self.name}] Google query failed for {location_hint}")
            else:
                logger.warning(f"[{self.name}] Google query failed (no response)")
            return []

        # Check if Google returned a CAPTCHA or block page
        if "detected unusual traffic" in resp.text.lower() or "captcha" in resp.text.lower():
            logger.warning(f"[{self.name}] Google CAPTCHA detected — blocked")
            return []

        soup = BeautifulSoup(resp.text, HTML_PARSER)
        results = self._parse_google_results(soup, location_hint)

        if results:
            loc_label = location_hint or "Australia"
            logger.info(f"[{self.name}] Google found {len(results)} results ({loc_label})")
        else:
            logger.debug(f"[{self.name}] Google returned page but 0 parsed results")

        return results

    def _duckduckgo_search(self, terms_query: str) -> list[Listing]:
        """Fallback search using DuckDuckGo HTML when Google blocks."""
        results = []
        query = f'site:facebook.com/marketplace {terms_query}'

        url = "https://html.duckduckgo.com/html/"
        params = {"q": query}

        # DuckDuckGo is more lenient, use shorter delay
        old_min = self.min_request_delay
        old_max = self.max_request_delay
        self.min_request_delay = 2.0
        self.max_request_delay = 4.0

        try:
            resp = self._get(url, params=params, retries=2, delay=2.0)
            if not resp:
                logger.warning(f"[{self.name}] DuckDuckGo search failed")
                return []

            soup = BeautifulSoup(resp.text, HTML_PARSER)

            for result in soup.select("div.result, div.web-result"):
                try:
                    link_el = result.select_one("a.result__a, a.result__url, a")
                    snippet_el = result.select_one("a.result__snippet, div.result__snippet")

                    href = link_el.get("href", "") if link_el else ""
                    title = self._safe_text(link_el, "No title")

                    if "facebook.com/marketplace" not in href:
                        continue

                    description = self._safe_text(snippet_el)

                    price = "See listing"
                    price_match = re.search(r'\$[\d,.]+', f"{title} {description}")
                    if price_match:
                        price = price_match.group(0)

                    # Detect location
                    detected_location = "Australia"
                    for city in AU_SEARCH_CITIES:
                        if city.lower() in f"{title} {description}".lower():
                            detected_location = city
                            break

                    results.append(Listing(
                        title=title,
                        price=price,
                        url=href,
                        location=detected_location,
                        marketplace=self.name,
                        description=description,
                        image_url="",
                    ))
                except Exception as e:
                    logger.debug(f"[{self.name}] DuckDuckGo parse error: {e}")
                    continue

            logger.info(f"[{self.name}] DuckDuckGo found {len(results)} results")
        finally:
            self.min_request_delay = old_min
            self.max_request_delay = old_max

        return results

    def _parse_google_results(self, soup, location_hint: str = None) -> list[Listing]:
        """Parse Google search result HTML into Listing objects."""
        results = []

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

                detected_location = location_hint or "Australia"
                for city in AU_SEARCH_CITIES:
                    if city.lower() in f"{title} {description}".lower():
                        detected_location = city
                        break

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

        return results
