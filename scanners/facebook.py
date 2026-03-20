"""Facebook Marketplace scanner.

Facebook Marketplace is difficult to scrape directly due to heavy JavaScript
rendering and anti-bot measures. This scanner uses multiple approaches:
1. Direct URL construction for search results
2. Mobile endpoint attempts
3. Google search indexing of FB Marketplace listings
"""

import logging
import re
from urllib.parse import quote_plus

from bs4 import BeautifulSoup

from .base import BaseScanner, Listing

logger = logging.getLogger(__name__)


class FacebookMarketplaceScanner(BaseScanner):
    name = "Facebook Marketplace"
    base_url = "https://www.facebook.com/marketplace"

    # Australian city IDs for Facebook Marketplace
    AU_CITIES = {
        "sydney": "sydney-au",
        "melbourne": "melbourne-au",
        "brisbane": "brisbane-au",
        "perth": "perth-au",
        "adelaide": "adelaide-au",
        "hobart": "hobart-au",
        "darwin": "darwin-au",
        "canberra": "canberra-au",
        "gold-coast": "goldcoast-au",
        "newcastle": "newcastle-au",
        "wollongong": "wollongong-au",
        "geelong": "geelong-au",
        "cairns": "cairns-au",
        "townsville": "townsville-au",
        "toowoomba": "toowoomba-au",
        "launceston": "launceston-au",
        "albury": "albury-au",
        "ballarat": "ballarat-au",
        "bendigo": "bendigo-au",
        "mackay": "mackay-au",
        "rockhampton": "rockhampton-au",
        "bunbury": "bunbury-au",
    }

    def scan(self) -> list[Listing]:
        """Scan using Google-indexed FB Marketplace results as primary method."""
        listings = []
        for term in self.search_terms:
            try:
                # Method 1: Google dorking for indexed FB marketplace posts
                found = self._google_search(term)
                listings.extend(found)
            except Exception as e:
                logger.error(f"[{self.name}] Error searching '{term}': {e}")

            try:
                # Method 2: Direct marketplace URL search
                found = self._direct_search(term)
                listings.extend(found)
            except Exception as e:
                logger.error(f"[{self.name}] Error in direct search '{term}': {e}")

        return listings

    def _google_search(self, term: str) -> list[Listing]:
        """Search Google for Facebook Marketplace listings."""
        results = []
        query = f'site:facebook.com/marketplace "{term}" australia'
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

                href = link_el.get("href", "") if link_el else ""
                title = self._safe_text(title_el, "No title")

                if "facebook.com/marketplace" not in href:
                    continue

                snippet_el = result.select_one(
                    "span.aCOpRe, div.VwiC3b, span.st"
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

        logger.info(f"[{self.name}] Google found {len(results)} results for '{term}'")
        return results

    def _direct_search(self, term: str) -> list[Listing]:
        """Attempt direct Facebook Marketplace search URLs."""
        results = []
        encoded = quote_plus(term)

        for city_name, city_id in self.AU_CITIES.items():
            url = f"{self.base_url}/{city_id}/search?query={encoded}&daysSinceListed=1&sortBy=creation_time_descend"

            resp = self._get(url, delay=2.0)
            if not resp:
                continue

            soup = BeautifulSoup(resp.text, "lxml")

            # FB uses heavy JS, but some metadata may be in the HTML
            for tag in soup.find_all("script", type="application/ld+json"):
                try:
                    import json
                    data = json.loads(tag.string or "")
                    if isinstance(data, dict) and data.get("@type") == "Product":
                        results.append(Listing(
                            title=data.get("name", "No title"),
                            price=str(data.get("offers", {}).get("price", "See listing")),
                            url=data.get("url", url),
                            location=city_name.title(),
                            marketplace=self.name,
                            description=data.get("description", ""),
                        ))
                except Exception:
                    continue

            # Also check og:title meta tags
            for meta in soup.select('meta[property="og:title"]'):
                content = meta.get("content", "")
                if term.lower().split()[0] in content.lower():
                    results.append(Listing(
                        title=content,
                        price="See listing",
                        url=url,
                        location=city_name.title(),
                        marketplace=self.name,
                    ))

        logger.info(f"[{self.name}] Direct search found {len(results)} results for '{term}'")
        return results
