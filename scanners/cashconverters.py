"""Cash Converters Australia scanner.

Uses Playwright to render the JavaScript SPA search page, since the site
has no public API and static HTML contains no listing data.
Falls back to a single Google dork if Playwright is unavailable.
"""

import logging
import re

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
                found = self._search_playwright(term)
                listings.extend(found)
            except Exception as e:
                logger.error(f"[{self.name}] Error searching '{term}': {e}")
        return listings

    def _search_playwright(self, term: str) -> list[Listing]:
        """Use Playwright to render the SPA search page and scrape results."""
        try:
            from playwright.sync_api import sync_playwright
        except ImportError:
            logger.warning(f"[{self.name}] Playwright not installed, falling back to Google")
            return self._google_search(term)

        results = []
        search_url = f"{self.base_url}/shop/search?q={term}&sort=DateListed"

        try:
            with sync_playwright() as p:
                browser = p.chromium.launch(headless=True)
                page = browser.new_page()
                page.set_extra_http_headers({
                    "Accept-Language": "en-AU,en;q=0.9",
                })

                logger.debug(f"[{self.name}] Loading {search_url}")
                page.goto(search_url, timeout=30000, wait_until="networkidle")

                # Wait for product cards to appear (or timeout)
                try:
                    page.wait_for_selector(
                        ".product-card, .product-tile, .search-result-item, "
                        "[data-testid='product-card'], .product-list-item",
                        timeout=10000,
                    )
                except Exception:
                    logger.debug(f"[{self.name}] No product cards found for '{term}'")
                    browser.close()
                    return []

                html = page.content()
                browser.close()

            soup = BeautifulSoup(html, "lxml")

            # Try multiple selector patterns for product cards
            cards = (
                soup.select(".product-card") or
                soup.select(".product-tile") or
                soup.select(".search-result-item") or
                soup.select("[data-testid='product-card']") or
                soup.select(".product-list-item")
            )

            for card in cards:
                try:
                    title_el = card.select_one(
                        "h2, h3, .product-title, .product-name, "
                        "[data-testid='product-title'], a[title]"
                    )
                    price_el = card.select_one(
                        ".product-price, .price, [data-testid='product-price'], "
                        "span.amount, .sale-price"
                    )
                    link_el = card.select_one("a[href]")
                    img_el = card.select_one("img")

                    title = self._safe_text(title_el, "")
                    if not title and link_el:
                        title = link_el.get("title", "") or self._safe_text(link_el, "")
                    if not title:
                        continue

                    price = self._safe_text(price_el, "See listing")
                    href = link_el.get("href", "") if link_el else ""
                    if href and not href.startswith("http"):
                        href = f"{self.base_url}{href}"
                    image_url = img_el.get("src", "") if img_el else ""

                    # Extract store/location if available
                    loc_el = card.select_one(".store-name, .location, .store")
                    location = self._safe_text(loc_el, "Australia")

                    results.append(Listing(
                        title=title,
                        price=price,
                        url=href or search_url,
                        location=location,
                        marketplace=self.name,
                        image_url=image_url,
                    ))
                except Exception as e:
                    logger.debug(f"[{self.name}] Card parse error: {e}")
                    continue

            logger.info(f"[{self.name}] Found {len(results)} results for '{term}'")

        except Exception as e:
            logger.error(f"[{self.name}] Playwright error: {e}")
            return self._google_search(term)

        return results

    def _google_search(self, term: str) -> list[Listing]:
        """Fallback: single Google dork for Cash Converters listings."""
        results = []
        query = f'site:cashconverters.com.au "{term}"'
        url = "https://www.google.com.au/search"
        params = {"q": query, "num": 30, "gl": "au"}

        resp = self._get(url, params=params, retries=1, delay=3.0)
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
