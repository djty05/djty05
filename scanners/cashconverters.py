"""Cash Converters Australia scanner.

Uses direct HTTP requests to the Cash Converters online shop as primary approach.
Falls back to Playwright for API interception, then Google dorking.
"""

import json
import logging
import re

from bs4 import BeautifulSoup

from .base import BaseScanner, Listing

logger = logging.getLogger(__name__)


class CashConvertersScanner(BaseScanner):
    scanner_id = "cashconverters"
    name = "Cash Converters AU"
    base_url = "https://www.cashconverters.com.au"
    min_request_delay = 3.0
    max_request_delay = 6.0

    def scan(self) -> list[Listing]:
        # Try direct HTTP first
        listings = self._scan_http()
        if listings:
            return listings

        # Try Playwright if available
        try:
            from playwright.sync_api import sync_playwright
            listings = self._scan_playwright()
            if listings:
                return listings
        except ImportError:
            logger.info(f"[{self.name}] Playwright not available")

        # Last resort: Google dorking
        logger.info(f"[{self.name}] Falling back to Google dorking")
        return self._scan_google_fallback()

    def _scan_http(self) -> list[Listing]:
        """Try direct HTTP requests to Cash Converters shop search.
        Fail fast if the site is blocking HTTP requests.
        """
        all_listings = []
        consecutive_failures = 0

        for term in self.search_terms:
            try:
                found = self._search_http(term)
                if found:
                    all_listings.extend(found)
                    consecutive_failures = 0
                else:
                    consecutive_failures += 1
                    if consecutive_failures >= 2 and not all_listings:
                        logger.info(f"[{self.name}] HTTP not working, skipping")
                        return []
            except Exception as e:
                logger.debug(f"[{self.name}] HTTP search error for '{term}': {e}")
                consecutive_failures += 1
                if consecutive_failures >= 2 and not all_listings:
                    return []

        if all_listings:
            logger.info(f"[{self.name}] HTTP found {len(all_listings)} total results")
        return all_listings

    def _search_http(self, term: str) -> list[Listing]:
        """Search Cash Converters via direct HTTP."""
        results = []

        # Try multiple search URL patterns
        search_urls = [
            f"{self.base_url}/shop?q={term}",
            f"{self.base_url}/shop?search={term}",
            f"{self.base_url}/shop/search?q={term}",
        ]

        for search_url in search_urls:
            resp = self._get(search_url, retries=1, delay=3.0)
            if not resp:
                continue

            html = resp.text
            if "Access Denied" in html or len(html) < 500:
                continue

            parsed = self._parse_shop_html(html, term)
            if parsed:
                return parsed

        return results

    def _parse_shop_html(self, html: str, term: str) -> list[Listing]:
        """Parse Cash Converters shop HTML for product listings."""
        soup = BeautifulSoup(html, "lxml")
        results = []

        # Look for embedded JSON data first
        for script in soup.select("script"):
            if not script.string:
                continue
            text = script.string
            # Look for product data in various JSON patterns
            for pattern in [r'window\.__INITIAL_STATE__\s*=\s*({.*?});',
                           r'window\.__NEXT_DATA__\s*=\s*({.*?});',
                           r'"products"\s*:\s*(\[.*?\])',
                           r'"items"\s*:\s*(\[.*?\])']:
                match = re.search(pattern, text, re.DOTALL)
                if match:
                    try:
                        data = json.loads(match.group(1))
                        parsed = self._parse_json_products(data)
                        if parsed:
                            return parsed
                    except (json.JSONDecodeError, ValueError):
                        continue

        # HTML card parsing
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

                image_url = ""
                if img_el:
                    image_url = (img_el.get("src", "") or
                                img_el.get("data-src", "") or
                                img_el.get("data-lazy-src", ""))

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
            logger.info(f"[{self.name}] Found {len(results)} HTML results for '{term}'")
        return results

    def _parse_json_products(self, data) -> list[Listing]:
        """Parse product data from JSON."""
        results = []
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

                page.add_init_script("""
                    Object.defineProperty(navigator, 'webdriver', {get: () => undefined});
                """)

                # Collect API responses
                api_results = []

                def capture_response(response):
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

                logger.info(f"[{self.name}] Loading shop page...")
                page.goto(f"{self.base_url}/shop", wait_until="domcontentloaded", timeout=30000)
                page.wait_for_timeout(3000)

                for term in self.search_terms:
                    try:
                        api_results.clear()
                        search_urls = [
                            f"{self.base_url}/shop?q={term}",
                            f"{self.base_url}/shop?search={term}",
                        ]

                        for search_url in search_urls:
                            try:
                                page.goto(search_url, wait_until="domcontentloaded", timeout=15000)
                                page.wait_for_timeout(3000)

                                parsed = self._parse_json_products(
                                    {"products": [item for data in api_results
                                                  for item in (data if isinstance(data, list) else
                                                               data.get("products", data.get("results", [])))
                                                  if isinstance(item, dict)]}
                                ) if api_results else []
                                if parsed:
                                    all_listings.extend(parsed)
                                    break

                                html = page.content()
                                parsed = self._parse_shop_html(html, term)
                                if parsed:
                                    all_listings.extend(parsed)
                                    break
                            except Exception:
                                continue

                        page.wait_for_timeout(2000)
                    except Exception as e:
                        logger.error(f"[{self.name}] Error searching '{term}': {e}")

                browser.close()

        except Exception as e:
            logger.error(f"[{self.name}] Playwright error: {e}")

        return all_listings

    # ------------------------------------------------------------------
    # Google fallback (batched to reduce requests)
    # ------------------------------------------------------------------
    def _scan_google_fallback(self) -> list[Listing]:
        """Fall back to Google dorking with batched terms."""
        all_results = []
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

                    # Try to extract thumbnail
                    image_url = ""
                    img_el = result.select_one("img")
                    if img_el:
                        src = img_el.get("src", "") or img_el.get("data-src", "")
                        if src and src.startswith("http"):
                            image_url = src

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
                            image_url=image_url,
                        ))
                except Exception as e:
                    logger.debug(f"[{self.name}] Google parse error: {e}")
                    continue

        logger.info(f"[{self.name}] Google found {len(all_results)} total results")
        return all_results
