"""Cash Converters Australia scanner.

The Cash Converters website is a JavaScript SPA — the /shop/search endpoint
no longer exists.  The current approach:
  1. Try the webshop API that the SPA calls under the hood.
  2. Fall back to Playwright-based rendering if the API fails.
  3. Fall back to Google dorking as a last resort.
"""

import json
import logging
import re
from urllib.parse import quote_plus

from bs4 import BeautifulSoup

from .base import BaseScanner, Listing

logger = logging.getLogger(__name__)


class CashConvertersScanner(BaseScanner):
    name = "Cash Converters AU"
    base_url = "https://www.cashconverters.com.au"

    def scan(self) -> list[Listing]:
        listings = []
        for term in self.search_terms:
            try:
                found = self._search(term)
                listings.extend(found)
            except Exception as e:
                logger.error(f"[{self.name}] Error searching '{term}': {e}")
        return listings

    def _search(self, term: str) -> list[Listing]:
        # Method 1: Try the internal webshop API
        results = self._search_api(term)
        if results:
            return results

        # Method 2: Google dorking for Cash Converters listings
        results = self._google_search(term)
        return results

    # ------------------------------------------------------------------
    # Method 1: Webshop API
    # ------------------------------------------------------------------
    def _search_api(self, term: str) -> list[Listing]:
        """Try various API endpoints that the Cash Converters SPA uses."""
        results = []

        # The SPA fetches from internal API endpoints - try common patterns
        api_urls = [
            f"{self.base_url}/api/products/search",
            f"{self.base_url}/api/shop/search",
            f"{self.base_url}/webapi/search/products",
            f"{self.base_url}/umbraco/api/product/search",
        ]
        params = {"q": term, "query": term, "keyword": term,
                  "limit": 50, "pageSize": 50, "sort": "newest"}

        for api_url in api_urls:
            try:
                resp = self._get(api_url, params=params, retries=1, delay=1.0)
                if not resp:
                    continue

                try:
                    data = resp.json()
                except (json.JSONDecodeError, ValueError):
                    continue

                # Handle various API response shapes
                items = []
                if isinstance(data, list):
                    items = data
                elif isinstance(data, dict):
                    for key in ("products", "results", "items", "data", "Records"):
                        if key in data and isinstance(data[key], list):
                            items = data[key]
                            break

                for item in items:
                    if not isinstance(item, dict):
                        continue
                    title = (item.get("title") or item.get("name") or
                             item.get("productName") or item.get("Title") or "")
                    if not title:
                        continue
                    price = (item.get("price") or item.get("salePrice") or
                             item.get("Price") or "No price")
                    if isinstance(price, (int, float)):
                        price = f"${price:.2f}"
                    href = item.get("url") or item.get("slug") or item.get("Url") or ""
                    if href and not href.startswith("http"):
                        href = f"{self.base_url}{href}"
                    location = (item.get("store") or item.get("storeName") or
                                item.get("Store") or "Australia")
                    image_url = (item.get("image") or item.get("imageUrl") or
                                 item.get("Image") or "")

                    results.append(Listing(
                        title=str(title),
                        price=str(price),
                        url=href or f"{self.base_url}/shop",
                        location=str(location),
                        marketplace=self.name,
                        image_url=str(image_url),
                    ))

                if results:
                    logger.info(f"[{self.name}] API found {len(results)} results for '{term}'")
                    return results

            except Exception as e:
                logger.debug(f"[{self.name}] API endpoint {api_url} failed: {e}")
                continue

        return results

    # ------------------------------------------------------------------
    # Method 2: Google dorking
    # ------------------------------------------------------------------
    def _google_search(self, term: str) -> list[Listing]:
        """Fall back to Google to find Cash Converters listings."""
        results = []
        query = f'site:cashconverters.com.au "{term}"'
        url = "https://www.google.com.au/search"
        params = {"q": query, "num": 30, "gl": "au"}

        resp = self._get(url, params=params, delay=3.0)
        if not resp:
            return []

        soup = BeautifulSoup(resp.text, "lxml")

        for result in soup.select("div.g, div.tF2Cxc"):
            try:
                link_el = result.select_one("a")
                title_el = result.select_one("h3")
                snippet_el = result.select_one(
                    "span.aCOpRe, div.VwiC3b, span.st"
                )

                href = link_el.get("href", "") if link_el else ""
                title = self._safe_text(title_el, "No title")
                description = self._safe_text(snippet_el)

                if "cashconverters.com.au" not in href:
                    continue
                # Skip non-product pages
                if any(skip in href for skip in ("/store-locator", "/about", "/sell", "/contact")):
                    continue

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
                        marketplace=self.name,
                        description=description,
                    ))
            except Exception as e:
                logger.debug(f"[{self.name}] Google parse error: {e}")
                continue

        logger.info(f"[{self.name}] Google found {len(results)} results for '{term}'")
        return results
