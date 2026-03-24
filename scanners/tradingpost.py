"""Trading Post Australia scanner.

Uses direct HTTP requests as primary approach, with Playwright and
Google dorking as fallbacks.
"""

import logging
import re

from bs4 import BeautifulSoup

from .base import BaseScanner, Listing

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

        # Last resort: Google dorking
        logger.info(f"[{self.name}] Falling back to Google dorking")
        return self._scan_google_fallback()

    def _scan_http(self) -> list[Listing]:
        """Try direct HTTP requests to Trading Post search.
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
        """Search Trading Post via direct HTTP."""
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
        """Parse Trading Post HTML for listing cards."""
        soup = BeautifulSoup(html, "lxml")
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
        """Use Playwright to render Trading Post search pages."""
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

    def _scan_google_fallback(self) -> list[Listing]:
        """Fall back to batched Google dorking."""
        all_results = []

        for i in range(0, len(self.search_terms), 6):
            chunk = self.search_terms[i:i + 6]
            or_query = " OR ".join(f'"{t}"' for t in chunk)
            query = f'site:tradingpost.com.au ({or_query})'

            resp = self._get(
                "https://www.google.com.au/search",
                params={"q": query, "num": 30, "gl": "au"},
                retries=1, delay=5.0,
            )
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

                    if "tradingpost.com.au" not in href:
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
