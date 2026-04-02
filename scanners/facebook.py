"""Facebook Marketplace scanner.

Facebook Marketplace is NOT indexed by Google, so search engine dorking
does not work. This scanner uses:
  1. Direct Facebook Marketplace URLs via Playwright (if available)
  2. Direct search links for manual opening
  3. Search engines as a last resort (may find cached/forum references)
"""

import logging
import re

from .base import BaseScanner, Listing, HTML_PARSER
from .search_engines import search_multi

logger = logging.getLogger(__name__)

AU_CITIES_FB = {
    "Sydney": "sydney",
    "Melbourne": "melbourne",
    "Brisbane": "brisbane",
    "Perth": "perth",
    "Adelaide": "adelaide",
    "Hobart": "hobart",
    "Darwin": "darwin",
    "Cairns": "cairns",
    "Gold Coast": "goldcoast",
    "Newcastle": "newcastle",
    "Canberra": "canberra",
    "Townsville": "townsville",
}


class FacebookMarketplaceScanner(BaseScanner):
    scanner_id = "facebook"
    name = "Facebook Marketplace"
    base_url = "https://www.facebook.com/marketplace"
    min_request_delay = 3.0
    max_request_delay = 6.0

    QUICK_CITIES = ["Sydney", "Melbourne", "Brisbane", "Perth", "Adelaide"]

    def scan(self, quick: bool = False) -> list[Listing]:
        """Scan Facebook Marketplace. Tries Playwright first, then search engines."""
        cities = self.QUICK_CITIES if quick else list(AU_CITIES_FB.keys())
        listings = []

        # Try Playwright first (best approach for FB)
        try:
            from playwright.sync_api import sync_playwright
            listings = self._scan_playwright(cities)
            if listings:
                return self._deduplicate(listings)
        except ImportError:
            logger.info(f"[{self.name}] Playwright not available — FB Marketplace requires a browser")

        # Fallback: search engines (finds forum posts, cached links, not direct listings)
        logger.info(f"[{self.name}] Trying search engines (limited results expected)")
        for term in self.search_terms[:6]:  # Limit to avoid rate limiting
            results = search_multi(f'facebook marketplace australia {term}')
            for r in results:
                if "facebook.com" in r.url or "marketplace" in r.title.lower():
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

    def search_open(self, query: str) -> list[Listing]:
        """Manual search — always includes direct links + tries Playwright."""
        logger.info(f"[{self.name}] Manual search for '{query}'")
        listings = []

        # Always generate direct clickable links (user can open in their browser)
        from urllib.parse import quote_plus
        encoded = quote_plus(query)
        for city_name, city_slug in list(AU_CITIES_FB.items())[:5]:
            fb_url = f"https://www.facebook.com/marketplace/{city_slug}/search/?query={encoded}"
            listings.append(Listing(
                title=f"Search FB Marketplace: '{query}' in {city_name}",
                price="Click to open",
                url=fb_url,
                location=city_name,
                marketplace=self.name,
                description=f"Opens Facebook Marketplace search for '{query}' in {city_name}. You may need to log in.",
                image_url="",
            ))

        # Try Playwright for actual scraped results
        try:
            from playwright.sync_api import sync_playwright
            pw_results = self._playwright_search(query, self.QUICK_CITIES)
            if pw_results:
                logger.info(f"[{self.name}] Playwright found {len(pw_results)} actual results")
                listings.extend(pw_results)
        except ImportError:
            logger.info(f"[{self.name}] Install Playwright for auto FB scanning: pip install playwright && playwright install chromium")
        except Exception as e:
            logger.warning(f"[{self.name}] Playwright error: {e}")

        # Also try search engines for any cached/referenced listings
        for engine_query in [
            f'facebook marketplace {query} australia',
            f'facebook.com marketplace {query}',
        ]:
            try:
                results = search_multi(engine_query)
                for r in results:
                    if "facebook.com" in r.url:
                        price = "See listing"
                        price_match = re.search(r'\$[\d,.]+', f"{r.title} {r.snippet}")
                        if price_match:
                            price = price_match.group(0)
                        location = "Australia"
                        for city in AU_CITIES_FB:
                            if city.lower() in f"{r.title} {r.snippet}".lower():
                                location = city
                                break
                        listings.append(Listing(
                            title=r.title,
                            price=price,
                            url=r.url,
                            location=location,
                            marketplace=self.name,
                            description=r.snippet,
                            image_url=r.image_url,
                        ))
            except Exception:
                continue

        unique = self._deduplicate(listings)
        logger.info(f"[{self.name}] Manual search total: {len(unique)} listings")
        return unique

    def _scan_playwright(self, cities: list[str]) -> list[Listing]:
        """Use Playwright to browse FB Marketplace directly."""
        from playwright.sync_api import sync_playwright
        from bs4 import BeautifulSoup

        listings = []

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

                for term in self.search_terms[:8]:
                    for city_name in cities[:3]:
                        city_slug = AU_CITIES_FB.get(city_name, city_name.lower())
                        url = f"https://www.facebook.com/marketplace/{city_slug}/search/?query={term}"

                        try:
                            page.goto(url, wait_until="domcontentloaded", timeout=20000)
                            page.wait_for_timeout(3000)

                            # Try to dismiss login popup
                            try:
                                close_btn = page.locator('[aria-label="Close"]').first
                                if close_btn:
                                    close_btn.click(timeout=2000)
                                    page.wait_for_timeout(1000)
                            except Exception:
                                pass

                            html = page.content()
                            found = self._parse_fb_html(html, city_name)
                            listings.extend(found)

                            if found:
                                logger.info(f"[{self.name}] {city_name}/{term}: {len(found)} results")

                            page.wait_for_timeout(2000)
                        except Exception as e:
                            logger.debug(f"[{self.name}] Error {city_name}/{term}: {e}")
                            continue

                browser.close()
        except Exception as e:
            logger.error(f"[{self.name}] Playwright error: {e}")

        return listings

    def _playwright_search(self, query: str, cities: list[str]) -> list[Listing]:
        """Playwright search for a single manual query."""
        from playwright.sync_api import sync_playwright
        from bs4 import BeautifulSoup

        listings = []

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

                for city_name in cities:
                    city_slug = AU_CITIES_FB.get(city_name, city_name.lower())
                    url = f"https://www.facebook.com/marketplace/{city_slug}/search/?query={query}"

                    try:
                        page.goto(url, wait_until="domcontentloaded", timeout=20000)
                        page.wait_for_timeout(4000)

                        try:
                            close_btn = page.locator('[aria-label="Close"]').first
                            if close_btn:
                                close_btn.click(timeout=2000)
                                page.wait_for_timeout(1000)
                        except Exception:
                            pass

                        html = page.content()
                        found = self._parse_fb_html(html, city_name)
                        listings.extend(found)

                        if found:
                            logger.info(f"[{self.name}] {city_name}: {len(found)} results")

                        page.wait_for_timeout(2000)
                    except Exception as e:
                        logger.debug(f"[{self.name}] Error {city_name}: {e}")
                        continue

                browser.close()
        except Exception as e:
            logger.error(f"[{self.name}] Playwright search error: {e}")

        return listings

    def _parse_fb_html(self, html: str, city: str) -> list[Listing]:
        """Parse Facebook Marketplace HTML for listings."""
        from bs4 import BeautifulSoup

        soup = BeautifulSoup(html, HTML_PARSER)
        results = []

        # FB Marketplace uses various div structures
        # Look for listing links that contain /marketplace/item/
        for link in soup.select('a[href*="/marketplace/item/"]'):
            try:
                href = link.get("href", "")
                if not href.startswith("http"):
                    href = f"https://www.facebook.com{href}"

                # Get text content
                text = link.get_text(separator=" ", strip=True)
                if not text or len(text) < 3:
                    continue

                # Try to extract price and title from text
                price = "See listing"
                price_match = re.search(r'[\$A][\$]?\s*[\d,.]+', text)
                if price_match:
                    price = price_match.group(0)

                # Get image
                img_el = link.select_one("img")
                image_url = ""
                if img_el:
                    image_url = img_el.get("src", "") or img_el.get("data-src", "")

                # Title is usually the longest text segment
                parts = [p.strip() for p in text.split('\n') if p.strip()]
                title = max(parts, key=len) if parts else text[:100]

                results.append(Listing(
                    title=title,
                    price=price,
                    url=href,
                    location=city,
                    marketplace=self.name,
                    description=text[:200],
                    image_url=image_url,
                ))
            except Exception:
                continue

        return results

    def _deduplicate(self, listings: list[Listing]) -> list[Listing]:
        seen_urls = set()
        unique = []
        for listing in listings:
            key = listing.url.split("?")[0]  # Ignore query params for dedup
            if key not in seen_urls:
                seen_urls.add(key)
                unique.append(listing)
        logger.info(f"[{self.name}] Total: {len(unique)} unique listings")
        return unique
