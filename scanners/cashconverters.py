"""Cash Converters Australia scanner.

Cash Converters is a JavaScript SPA with no public search API.
The online shop at /shop has a search bar that triggers internal API calls.
This scanner uses Playwright to:
  1. Load the shop page and interact with the search bar.
  2. Intercept the underlying API calls to capture product data.
  3. Fall back to parsing the rendered HTML if API interception fails.
  4. Fall back to Google dorking as a last resort.
"""

import json
import logging
import re

from bs4 import BeautifulSoup

from .base import BaseScanner, Listing

logger = logging.getLogger(__name__)


class CashConvertersScanner(BaseScanner):
    name = "Cash Converters AU"
    base_url = "https://www.cashconverters.com.au"

    def scan(self) -> list[Listing]:
        try:
            from playwright.sync_api import sync_playwright
            return self._scan_playwright()
        except ImportError:
            logger.warning(f"[{self.name}] Playwright not installed, falling back to Google")
            return self._scan_google_fallback()

    def _scan_playwright(self) -> list[Listing]:
        """Use Playwright to search the Cash Converters online shop."""
        from playwright.sync_api import sync_playwright

        all_listings = []

        try:
            with sync_playwright() as p:
                browser = p.chromium.launch(headless=True)
                context = browser.new_context(
                    user_agent=(
                        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
                        "AppleWebKit/537.36 (KHTML, like Gecko) "
                        "Chrome/124.0.0.0 Safari/537.36"
                    ),
                    locale="en-AU",
                    timezone_id="Australia/Sydney",
                    viewport={"width": 1920, "height": 1080},
                )
                page = context.new_page()

                # Stealth: remove webdriver flag
                page.add_init_script("""
                    Object.defineProperty(navigator, 'webdriver', {get: () => undefined});
                """)

                # Collect API responses that might contain product data
                api_results = []

                def capture_response(response):
                    """Capture JSON API responses that look like product data."""
                    url = response.url
                    if response.status == 200 and any(
                        kw in url.lower()
                        for kw in ("product", "search", "catalog", "item", "shop", "webshop")
                    ):
                        try:
                            ct = response.headers.get("content-type", "")
                            if "json" in ct:
                                api_results.append(response.json())
                        except Exception:
                            pass

                page.on("response", capture_response)

                # Load the shop page first
                logger.info(f"[{self.name}] Loading shop page...")
                page.goto(f"{self.base_url}/shop", wait_until="domcontentloaded", timeout=30000)
                page.wait_for_timeout(3000)

                for term in self.search_terms:
                    try:
                        found = self._search_term(page, term, api_results)
                        all_listings.extend(found)
                        page.wait_for_timeout(2000)
                    except Exception as e:
                        logger.error(f"[{self.name}] Error searching '{term}': {e}")

                browser.close()

        except Exception as e:
            logger.error(f"[{self.name}] Playwright error: {e}")
            return self._scan_google_fallback()

        return all_listings

    def _search_term(self, page, term: str, api_results: list) -> list[Listing]:
        """Search for a term using the shop's search bar or URL navigation."""
        results = []
        api_results.clear()

        # Strategy 1: Try URL-based search patterns
        search_urls = [
            f"{self.base_url}/shop?q={term}",
            f"{self.base_url}/shop?search={term}",
            f"{self.base_url}/shop/search?q={term}",
        ]

        for search_url in search_urls:
            try:
                page.goto(search_url, wait_until="domcontentloaded", timeout=15000)
                page.wait_for_timeout(3000)

                # Check if any API responses were captured with products
                parsed = self._parse_api_results(api_results)
                if parsed:
                    logger.info(f"[{self.name}] API captured {len(parsed)} results for '{term}'")
                    return parsed

                # Try parsing the rendered page
                parsed = self._parse_rendered_page(page, term)
                if parsed:
                    return parsed

            except Exception as e:
                logger.debug(f"[{self.name}] URL {search_url} failed: {e}")
                continue

        # Strategy 2: Try interacting with search bar on the shop page
        try:
            page.goto(f"{self.base_url}/shop", wait_until="domcontentloaded", timeout=15000)
            page.wait_for_timeout(2000)

            # Look for search input using common selectors
            search_selectors = [
                "input[type='search']",
                "input[name='search']",
                "input[name='q']",
                "input[placeholder*='earch']",
                "input[placeholder*='ind']",
                "input.search-input",
                "#search-input",
                "[data-testid='search-input']",
            ]

            for sel in search_selectors:
                try:
                    search_input = page.query_selector(sel)
                    if search_input:
                        search_input.click()
                        search_input.fill(term)
                        page.keyboard.press("Enter")
                        page.wait_for_timeout(4000)

                        # Check API captures
                        parsed = self._parse_api_results(api_results)
                        if parsed:
                            logger.info(f"[{self.name}] Search bar found {len(parsed)} results for '{term}'")
                            return parsed

                        # Parse rendered page
                        parsed = self._parse_rendered_page(page, term)
                        if parsed:
                            return parsed
                        break
                except Exception:
                    continue

        except Exception as e:
            logger.debug(f"[{self.name}] Search bar interaction failed: {e}")

        logger.debug(f"[{self.name}] No results found via Playwright for '{term}'")
        return results

    def _parse_api_results(self, api_results: list) -> list[Listing]:
        """Parse captured API JSON responses into listings."""
        results = []
        for data in api_results:
            if not isinstance(data, (dict, list)):
                continue

            items = []
            if isinstance(data, list):
                items = data
            elif isinstance(data, dict):
                for key in ("products", "results", "items", "data", "Records",
                            "SearchResults", "hits", "content"):
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
                         item.get("Price") or item.get("displayPrice") or "See listing")
                if isinstance(price, (int, float)):
                    price = f"${price:.2f}"

                href = (item.get("url") or item.get("slug") or
                        item.get("Url") or item.get("link") or "")
                if href and not href.startswith("http"):
                    href = f"{self.base_url}{href}"

                location = (item.get("store") or item.get("storeName") or
                            item.get("Store") or item.get("location") or "Australia")
                image_url = (item.get("image") or item.get("imageUrl") or
                             item.get("Image") or item.get("thumbnail") or "")

                results.append(Listing(
                    title=str(title),
                    price=str(price),
                    url=href or f"{self.base_url}/shop",
                    location=str(location),
                    marketplace=self.name,
                    image_url=str(image_url),
                ))

        return results

    def _parse_rendered_page(self, page, term: str) -> list[Listing]:
        """Parse the rendered HTML page for product cards."""
        html = page.content()
        soup = BeautifulSoup(html, "lxml")
        results = []

        # Try multiple selector patterns for product cards
        card_selectors = [
            ".product-card", ".product-tile", ".product-item",
            ".search-result-item", "[data-testid='product-card']",
            ".product-list-item", ".shop-item", ".catalogue-item",
            "div[class*='product']", "div[class*='Product']",
            "a[class*='product']",
        ]

        cards = []
        for sel in card_selectors:
            cards = soup.select(sel)
            if cards:
                break

        if not cards:
            return []

        for card in cards:
            try:
                title_el = card.select_one(
                    "h2, h3, h4, .product-title, .product-name, "
                    "[data-testid='product-title'], a[title], .title, .name"
                )
                price_el = card.select_one(
                    ".product-price, .price, [data-testid='product-price'], "
                    "span.amount, .sale-price, [class*='price'], [class*='Price']"
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

                loc_el = card.select_one(".store-name, .location, .store, [class*='store']")
                location = self._safe_text(loc_el, "Australia")

                results.append(Listing(
                    title=title,
                    price=price,
                    url=href or f"{self.base_url}/shop",
                    location=location,
                    marketplace=self.name,
                    image_url=image_url,
                ))
            except Exception as e:
                logger.debug(f"[{self.name}] Card parse error: {e}")
                continue

        if results:
            logger.info(f"[{self.name}] Found {len(results)} rendered results for '{term}'")
        return results

    # ------------------------------------------------------------------
    # Google fallback (batched to reduce requests)
    # ------------------------------------------------------------------
    def _scan_google_fallback(self) -> list[Listing]:
        """Fall back to Google dorking with batched terms."""
        all_results = []
        # Batch terms into groups of 6 to reduce Google queries
        for i in range(0, len(self.search_terms), 6):
            chunk = self.search_terms[i:i + 6]
            or_query = " OR ".join(f'"{t}"' for t in chunk)
            query = f'site:cashconverters.com.au ({or_query})'

            url = "https://www.google.com.au/search"
            params = {"q": query, "num": 30, "gl": "au"}

            resp = self._get(url, params=params, retries=1, delay=5.0)
            if not resp:
                continue

            soup = BeautifulSoup(resp.text, "lxml")

            for result in soup.select("div.g, div.tF2Cxc"):
                try:
                    link_el = result.select_one("a")
                    title_el = result.select_one("h3")
                    snippet_el = result.select_one("span.aCOpRe, div.VwiC3b, span.st")

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
                        all_results.append(Listing(
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

        logger.info(f"[{self.name}] Google found {len(all_results)} total results")
        return all_results
