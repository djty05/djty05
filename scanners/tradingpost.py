"""Trading Post Australia scanner.

Trading Post uses /Search/ and /search-results as search endpoints.
Uses direct HTTP as primary, with Playwright and search engines as fallbacks.
"""

import logging
import re
from urllib.parse import quote_plus

from bs4 import BeautifulSoup

from .base import BaseScanner, Listing, HTML_PARSER
from .search_engines import site_search

logger = logging.getLogger(__name__)


class TradingPostScanner(BaseScanner):
    scanner_id = "tradingpost"
    name = "Trading Post AU"
    base_url = "https://www.tradingpost.com.au"

    def scan(self) -> list[Listing]:
        listings = self._scan_http()
        if listings:
            return listings

        try:
            from playwright.sync_api import sync_playwright
            listings = self._scan_playwright()
            if listings:
                return listings
        except ImportError:
            logger.info(f"[{self.name}] Playwright not available")

        logger.info(f"[{self.name}] Falling back to search engines")
        listings = self._scan_search_engine_fallback()
        if listings:
            return listings

        return self._generate_direct_links()

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
                logger.debug(f"[{self.name}] HTTP error for '{term}': {e}")
                consecutive_failures += 1
                if consecutive_failures >= 2 and not all_listings:
                    return []

        if all_listings:
            logger.info(f"[{self.name}] HTTP found {len(all_listings)} total")
        return all_listings

    def _search_http(self, term: str) -> list[Listing]:
        """Search Trading Post via direct HTTP — try multiple URL patterns."""
        encoded = quote_plus(term)

        search_urls = [
            f"{self.base_url}/Search/?search={encoded}",
            f"{self.base_url}/search-results?search={encoded}",
            f"{self.base_url}/Search/?keyword={encoded}",
            f"{self.base_url}/search-results?keyword={encoded}",
            f"{self.base_url}/search?q={encoded}&sort=date",
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

        # Try JSON-LD first
        for script in soup.select('script[type="application/ld+json"]'):
            try:
                import json
                data = json.loads(script.string)
                if isinstance(data, dict) and data.get("@type") == "ItemList":
                    for item in data.get("itemListElement", []):
                        obj = item.get("item", item)
                        url = obj.get("url", "")
                        if url and not url.startswith("http"):
                            url = f"{self.base_url}{url}"
                        offers = obj.get("offers", {})
                        price = "See listing"
                        if isinstance(offers, dict) and offers.get("price"):
                            price = f"${offers['price']}"
                        results.append(Listing(
                            title=obj.get("name", "No title"),
                            price=price,
                            url=url,
                            location="Australia",
                            marketplace=self.name,
                            image_url=str(obj.get("image", "")),
                        ))
                    if results:
                        return results
            except Exception:
                continue

        # HTML card selectors
        card_selectors = [
            "div.listing-card", "div.search-result", "article.listing",
            "div.ad-card", "a[class*='listing']",
            "div[class*='listing']", "div[class*='result']",
            "div[class*='product']", "div[class*='ad-']",
        ]

        cards = []
        for sel in card_selectors:
            cards = soup.select(sel)
            if cards:
                break

        # Also try looking for links that look like ad links
        if not cards:
            cards = soup.select("a[href*='/ad-']")

        for card in cards:
            try:
                title_el = card.select_one("h2, h3, h4, a.title, span.title, .title, .name")
                price_el = card.select_one("span.price, div.price, [class*='price']")
                loc_el = card.select_one("span.location, div.location, [class*='location']")

                title = self._safe_text(title_el, "No title")
                if not title or title == "No title":
                    # Try the link text or card text
                    title = card.get("title", "") or card.get_text(strip=True)[:80]
                if not title or title == "No title":
                    continue

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

                if title and href:
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
            logger.info(f"[{self.name}] Found {len(results)} for '{term}'")
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

                page.goto(self.base_url, wait_until="domcontentloaded", timeout=30000)
                page.wait_for_timeout(3000)

                for term in self.search_terms:
                    try:
                        encoded = quote_plus(term)
                        urls = [
                            f"{self.base_url}/Search/?search={encoded}",
                            f"{self.base_url}/search-results?search={encoded}",
                        ]
                        for url in urls:
                            try:
                                page.goto(url, wait_until="domcontentloaded", timeout=15000)
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
        logger.info(f"[{self.name}] Search engines found {len(all_results)} results")
        return all_results

    def _generate_direct_links(self) -> list[Listing]:
        """Generate direct Trading Post search links."""
        links = []
        for term in self.search_terms[:3]:
            encoded = quote_plus(term)
            url = f"{self.base_url}/Search/?search={encoded}"
            links.append(Listing(
                title=f"Trading Post: {term}",
                price="Open Trading Post",
                url=url,
                location="Australia",
                marketplace=self.name,
                description=f"Click to search Trading Post for '{term}'",
                image_url="",
            ))
        return links

    def _search_engine_term(self, term: str) -> list[Listing]:
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
