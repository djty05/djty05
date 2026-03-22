"""Facebook Marketplace scanner.

Facebook Marketplace requires JavaScript rendering and login to scrape
directly.  This scanner uses Google dorking to find indexed FB Marketplace
listings, which is the only reliable method without a paid scraping API
or authenticated browser sessions.

The previous direct-URL approach was removed because:
  - FB pages are 100 % JS-rendered; static HTML contains no listing data.
  - Iterating 22 cities * 36 terms = 792 requests, each taking ~50 s = hours.
"""

import logging
import re

from bs4 import BeautifulSoup

from .base import BaseScanner, Listing

logger = logging.getLogger(__name__)


class FacebookMarketplaceScanner(BaseScanner):
    name = "Facebook Marketplace"
    base_url = "https://www.facebook.com/marketplace"

    def scan(self) -> list[Listing]:
        """Scan via Google-indexed FB Marketplace results."""
        listings = []
        for term in self.search_terms:
            try:
                found = self._google_search(term)
                listings.extend(found)
            except Exception as e:
                logger.error(f"[{self.name}] Error searching '{term}': {e}")
        return listings

    def _google_search(self, term: str) -> list[Listing]:
        """Search Google for Facebook Marketplace listings in Australia."""
        results = []

        # Use multiple Google query variants for better coverage
        queries = [
            f'site:facebook.com/marketplace "{term}" australia',
            f'site:facebook.com/marketplace/item "{term}"',
        ]

        for query in queries:
            url = "https://www.google.com.au/search"
            params = {"q": query, "num": 50, "gl": "au"}

            resp = self._get(url, params=params, delay=3.0)
            if not resp:
                continue

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

                    # Try to extract price from title or snippet
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

        # Deduplicate by URL
        seen_urls = set()
        unique = []
        for listing in results:
            if listing.url not in seen_urls:
                seen_urls.add(listing.url)
                unique.append(listing)

        logger.info(f"[{self.name}] Google found {len(unique)} results for '{term}'")
        return unique
