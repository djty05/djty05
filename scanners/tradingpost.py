"""Trading Post Australia scanner.

Uses direct HTTP requests as primary approach, with Playwright and
multi-engine search as fallbacks.
"""

import logging
import re

from bs4 import BeautifulSoup

from .base import BaseScanner, Listing, HTML_PARSER
from .search_engines import site_search

logger = logging.getLogger(__name__)


class TradingPostScanner(BaseScanner):
    scanner_id = "tradingpost"
    name = "Trading Post AU"
    base_url = "https://www.tradingpost.com.au"

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

        # Last resort: multi-engine search
        logger.info(f"[{self.name}] Falling back to search engines")
        return self._scan_search_engine_fallback()

    def search_open(self, term: str) -> list[Listing]:
        """Manual search — try direct HTTP, then search engines."""
        results = self._search_http(term)
        if results:
            return results
        logger.info(f"[{self.name}] Direct search failed, trying search engines")
        return self._search_engine_term(term)

    def _scan_http(self) -> list[Listing]:
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
        search_urls = [
            f"{self.base_url}/search?q={term}&sort=date",
            f"{self.base_url}/search?keyword={term}",
        ]

        for search_url in search_urls:
            resp = self._get(search_url, retries=1, delay=3.0)
            if not resp:
                continue

            html = resp.text
            if "Access Denied" in html or "Just a moment" in html or len(html) < 500:
                continue

            results = self._parse_html(html, term)
            if results:
                return results

        return []

    def _parse_html(self, html: str, term: str) -> list[Listing]:
        soup = BeautifulSoup(html, HTML_PARSER)
        results = []

        card_selectors = [
            "div.listing-card", "div.search-result", "article.listing",
            "div.ad-card", "div[class*='listing']", "div[class*='result']",
            "div[class*='product']", "a[class*='listing']",
        ]

        cards = []
        for sel in card_selectors:
            cards = soup.select(sel)
            if cards:
                break

        for card in cards:
            try:
                title_el = card.select_one("h2, h3, h4, a.title, span.title, .title, .name")
                price_el = card.select_one("span.price, div.price, [class*='price']")
                loc_el = card.select_one("span.location, div.location, [class*='location']")

                title = self._safe_text(title_el, "No title")
                price = self._safe_text(price_el, "See listing")
                location = self._safe_text(loc_el, "Australia")

                link = card.select_one("a[href]") if card.name != "a" else card
                href = link.get("href", "") if link else ""
                if href and not href.startswith("http"):
                    href = f"{self.base_url}{href}"

                img_el = card.select_one("img")
                image_url = ""
                if img_el:
                    image_url = (img_el.get("src", "") or
                                img_el.get("data-src", "") or
                                img_el.get("data-lazy-src", ""))

                if title and title != "No title" and href:
                    results.append(Listing(
                        title=title,
                        price=price,
                        url=href,
                        location=location,
                        marketplace=self.name,
                        image_url=image_url,
                    ))
            except Exception as e:
                logger.debug(f"[{self.name}] Parse error: {e}")
                continue

        if results:
            logger.info(f"[{self.name}] Found {len(results)} results for '{term}'")
        return results

    def _scan_playwright(self) -> list[Listing]:
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

                logger.info(f"[{self.name}] Loading site...")
                page.goto(self.base_url, wait_until="domcontentloaded", timeout=30000)
                page.wait_for_timeout(3000)

                for term in self.search_terms:
                    try:
                        search_urls = [
                            f"{self.base_url}/search?q={term}&sort=date",
                            f"{self.base_url}/search?keyword={term}",
                        ]

                        for search_url in search_urls:
                            try:
                                page.goto(search_url, wait_until="domcontentloaded", timeout=15000)
                                page.wait_for_timeout(3000)
                            except Exception:
                                continue

                            html = page.content()
                            if "Access Denied" in html or "Just a moment" in html:
                                continue

                            found = self._parse_html(html, term)
                            if found:
                                all_listings.extend(found)
                                break

                        page.wait_for_timeout(2000)
                    except Exception as e:
                        logger.error(f"[{self.name}] Error searching '{term}': {e}")

                browser.close()

        except Exception as e:
            logger.error(f"[{self.name}] Playwright error: {e}")

        return all_listings

    def _scan_search_engine_fallback(self) -> list[Listing]:
        """Use multi-engine search as last resort."""
        all_results = []

        for i in range(0, len(self.search_terms), 6):
            chunk = self.search_terms[i:i + 6]
            or_query = " OR ".join(f'"{t}"' for t in chunk)
            results = site_search("tradingpost.com.au", or_query)
            for r in results:
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

        logger.info(f"[{self.name}] Search engines found {len(all_results)} total results")
        return all_results

    def _search_engine_term(self, term: str) -> list[Listing]:
        """Search engine fallback for a single term."""
        results = site_search("tradingpost.com.au", term)
        listings = []
        for r in results:
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
        return listings
