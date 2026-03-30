"""Cash Converters Australia scanner.

Cash Converters uses category-based URLs, not a search query parameter.
The relevant categories for test equipment are:
  /shop/tools-motor-hardware/power-tools-industrial/multimeters-electrical-testers/multimeter
  /shop/tools-motor-hardware/power-tools-industrial/multimeters-electrical-testers/clamp-meter

This scanner scrapes those category pages directly, with search engine
fallback for broader coverage.
"""

import json
import logging
import re

from bs4 import BeautifulSoup

from .base import BaseScanner, Listing, HTML_PARSER
from .search_engines import site_search, search_multi

logger = logging.getLogger(__name__)

# Direct category URLs for Fluke/test equipment on Cash Converters
CC_CATEGORY_URLS = [
    "/shop/tools-motor-hardware/power-tools-industrial/multimeters-electrical-testers/multimeter",
    "/shop/tools-motor-hardware/power-tools-industrial/multimeters-electrical-testers/clamp-meter",
    "/shop/tools-motor-hardware/power-tools-industrial/multimeters-electrical-testers",
    "/shop/tools-motor-hardware/power-tools-industrial",
]


class CashConvertersScanner(BaseScanner):
    scanner_id = "cashconverters"
    name = "Cash Converters AU"
    base_url = "https://www.cashconverters.com.au"
    min_request_delay = 3.0
    max_request_delay = 6.0

    def scan(self) -> list[Listing]:
        # Try category pages directly first
        listings = self._scan_categories()
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

        # Fallback: search engines
        logger.info(f"[{self.name}] Falling back to search engines")
        return self._scan_search_engine_fallback()

    def search_open(self, term: str) -> list[Listing]:
        """Manual search — scrape category pages + search engines."""
        listings = []

        # Scrape the main category pages (most Fluke items end up here)
        for url_path in CC_CATEGORY_URLS[:2]:
            url = f"{self.base_url}{url_path}"
            found = self._scrape_category_page(url)
            if found:
                # Filter to only items matching the search term
                term_lower = term.lower()
                matched = [l for l in found if term_lower in l.title.lower() or term_lower in l.description.lower()]
                listings.extend(matched if matched else found)
                logger.info(f"[{self.name}] Category page: {len(matched or found)} results")

        # Also search via search engines for this specific term
        se_results = site_search("cashconverters.com.au", f"fluke {term}")
        for r in se_results:
            if any(skip in r.url for skip in ("/store-locator", "/about", "/sell", "/contact", "/help")):
                continue
            price = "See listing"
            price_match = re.search(r'\$[\d,.]+', f"{r.title} {r.snippet}")
            if price_match:
                price = price_match.group(0)
            listings.append(Listing(
                title=r.title,
                price=price,
                url=r.url,
                location="Australia",
                marketplace=self.name,
                description=r.snippet,
                image_url=r.image_url,
            ))

        return self._deduplicate(listings)

    def _scan_categories(self) -> list[Listing]:
        """Scrape the multimeter/clamp meter category pages directly."""
        all_listings = []

        for url_path in CC_CATEGORY_URLS[:2]:
            url = f"{self.base_url}{url_path}"
            found = self._scrape_category_page(url)
            all_listings.extend(found)

        if all_listings:
            logger.info(f"[{self.name}] Category pages: {len(all_listings)} total listings")
        return self._deduplicate(all_listings)

    def _scrape_category_page(self, url: str) -> list[Listing]:
        """Scrape a Cash Converters category/product listing page."""
        resp = self._get(url, retries=2, delay=3.0)
        if not resp:
            logger.debug(f"[{self.name}] No response for {url}")
            return []

        html = resp.text
        if "Access Denied" in html or len(html) < 500:
            logger.debug(f"[{self.name}] Blocked or empty response for {url}")
            return []

        return self._parse_shop_html(html)

    def _parse_shop_html(self, html: str) -> list[Listing]:
        """Parse Cash Converters shop HTML for product listings."""
        soup = BeautifulSoup(html, HTML_PARSER)
        results = []

        # Try JSON-LD structured data first
        for script in soup.select('script[type="application/ld+json"]'):
            try:
                data = json.loads(script.string)
                if isinstance(data, dict):
                    if data.get("@type") == "ItemList":
                        for item in data.get("itemListElement", []):
                            obj = item.get("item", item)
                            results.append(self._json_to_listing(obj))
                    elif data.get("@type") == "Product":
                        results.append(self._json_to_listing(data))
                elif isinstance(data, list):
                    for obj in data:
                        if isinstance(obj, dict) and obj.get("@type") == "Product":
                            results.append(self._json_to_listing(obj))
            except (json.JSONDecodeError, KeyError):
                continue

        if results:
            logger.info(f"[{self.name}] Found {len(results)} via JSON-LD")
            return results

        # Look for embedded JSON in scripts
        for script in soup.select("script"):
            if not script.string:
                continue
            text = script.string
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
            "div[class*='product']", "div[class*='Product']",
            "a[class*='product']", ".search-result-item",
            "[data-testid='product-card']",
            ".product-list-item", ".shop-item",
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
            logger.info(f"[{self.name}] Found {len(results)} via HTML cards")
        return results

    def _json_to_listing(self, obj: dict) -> Listing:
        """Convert a JSON-LD Product object to a Listing."""
        title = obj.get("name", "No title")
        url = obj.get("url", "")
        if url and not url.startswith("http"):
            url = f"{self.base_url}{url}"

        offers = obj.get("offers", {})
        price = "See listing"
        if isinstance(offers, dict) and offers.get("price"):
            price = f"${offers['price']}"
        elif isinstance(offers, list) and offers:
            price = f"${offers[0].get('price', 'See listing')}"

        image = obj.get("image", "")
        if isinstance(image, list):
            image = image[0] if image else ""

        description = obj.get("description", "")

        return Listing(
            title=title,
            price=str(price),
            url=url or f"{self.base_url}/shop",
            location="Australia",
            marketplace=self.name,
            description=description[:200] if description else "",
            image_url=str(image),
        )

    def _parse_json_products(self, data) -> list[Listing]:
        """Parse product data from embedded JSON."""
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
        """Use Playwright to browse Cash Converters category pages."""
        from playwright.sync_api import sync_playwright

        all_listings = []

        try:
            with sync_playwright() as p:
                browser = p.chromium.launch(headless=True)
                context = browser.new_context(
                    user_agent=(
                        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
                        "AppleWebKit/537.36 (KHTML, like Gecko) "
                        "Chrome/131.0.0.0 Safari/537.36"
                    ),
                    locale="en-AU",
                    timezone_id="Australia/Sydney",
                    viewport={"width": 1920, "height": 1080},
                )
                page = context.new_page()
                page.add_init_script("""
                    Object.defineProperty(navigator, 'webdriver', {get: () => undefined});
                """)

                for url_path in CC_CATEGORY_URLS[:3]:
                    try:
                        url = f"{self.base_url}{url_path}"
                        page.goto(url, wait_until="domcontentloaded", timeout=20000)
                        page.wait_for_timeout(3000)

                        html = page.content()
                        found = self._parse_shop_html(html)
                        all_listings.extend(found)

                        page.wait_for_timeout(2000)
                    except Exception as e:
                        logger.debug(f"[{self.name}] Playwright error for {url_path}: {e}")

                browser.close()

        except Exception as e:
            logger.error(f"[{self.name}] Playwright error: {e}")

        return all_listings

    def _scan_search_engine_fallback(self) -> list[Listing]:
        """Use search engines to find Cash Converters listings."""
        all_results = []

        # Search for Fluke items specifically
        queries = [
            "cashconverters.com.au fluke multimeter",
            "cashconverters.com.au fluke tester",
            "cashconverters.com.au fluke clamp meter",
            "site:cashconverters.com.au fluke",
        ]

        for query in queries:
            results = search_multi(query)
            for r in results:
                if "cashconverters.com.au" not in r.url:
                    continue
                if any(skip in r.url for skip in ("/store-locator", "/about", "/sell", "/contact", "/help")):
                    continue
                price = "See listing"
                price_match = re.search(r'\$[\d,.]+', f"{r.title} {r.snippet}")
                if price_match:
                    price = price_match.group(0)
                all_results.append(Listing(
                    title=r.title,
                    price=price,
                    url=r.url,
                    location="Australia",
                    marketplace=self.name,
                    description=r.snippet,
                    image_url=r.image_url,
                ))

        return self._deduplicate(all_results)

    def _deduplicate(self, listings: list[Listing]) -> list[Listing]:
        seen = set()
        unique = []
        for l in listings:
            key = l.url.split("?")[0]
            if key not in seen:
                seen.add(key)
                unique.append(l)
        return unique
