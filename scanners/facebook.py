"""Facebook Marketplace scanner.

Facebook Marketplace requires login to access search results.
This scanner uses saved cookies from a one-time browser login to
authenticate requests via Playwright.

Flow:
  1. User runs /api/fb-login → opens Playwright browser → logs in manually
  2. Cookies saved to fb_cookies.json
  3. Scanner uses saved cookies for all subsequent searches via Playwright
  4. Fallback: generates direct clickable links to FB Marketplace
"""

import json
import logging
import os
import re
from urllib.parse import quote_plus

from .base import BaseScanner, Listing, HTML_PARSER
from .search_engines import search_multi

logger = logging.getLogger(__name__)

COOKIES_FILE = "fb_cookies.json"

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


def has_fb_cookies() -> bool:
    """Check if saved Facebook cookies exist."""
    return os.path.exists(COOKIES_FILE)


def save_fb_cookies(cookies: list[dict]):
    """Save Facebook cookies to disk."""
    with open(COOKIES_FILE, "w") as f:
        json.dump(cookies, f)
    logger.info(f"[Facebook] Saved {len(cookies)} cookies to {COOKIES_FILE}")


def load_fb_cookies() -> list[dict]:
    """Load saved Facebook cookies."""
    if not os.path.exists(COOKIES_FILE):
        return []
    try:
        with open(COOKIES_FILE) as f:
            return json.load(f)
    except Exception:
        return []


def do_fb_login() -> bool:
    """Open a visible browser for user to log into Facebook manually.
    Saves cookies after successful login. Returns True on success.
    """
    try:
        from playwright.sync_api import sync_playwright
    except ImportError:
        logger.error("[Facebook] Playwright required: pip install playwright && playwright install chromium")
        return False

    logger.info("[Facebook] Opening browser for Facebook login...")

    try:
        with sync_playwright() as p:
            # Launch VISIBLE browser (not headless) so user can log in
            browser = p.chromium.launch(headless=False)
            context = browser.new_context(
                user_agent=(
                    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
                    "AppleWebKit/537.36 (KHTML, like Gecko) "
                    "Chrome/131.0.0.0 Safari/537.36"
                ),
                locale="en-AU",
                timezone_id="Australia/Sydney",
                viewport={"width": 1280, "height": 900},
            )
            page = context.new_page()

            # Go to Facebook login
            page.goto("https://www.facebook.com/login", wait_until="domcontentloaded")

            # Wait for user to log in (detect redirect to facebook.com home)
            logger.info("[Facebook] Please log in to Facebook in the browser window...")
            logger.info("[Facebook] The browser will close automatically after login.")

            # Wait up to 5 minutes for login
            try:
                page.wait_for_url("**/facebook.com/**", timeout=300000)
                # Give it a moment after redirect
                page.wait_for_timeout(3000)

                # Check if we're actually logged in (look for marketplace link or user menu)
                if "login" not in page.url.lower():
                    # Navigate to marketplace to verify access
                    page.goto("https://www.facebook.com/marketplace/", wait_until="domcontentloaded")
                    page.wait_for_timeout(3000)

                    # Save cookies
                    cookies = context.cookies()
                    save_fb_cookies(cookies)
                    logger.info(f"[Facebook] Login successful! Saved {len(cookies)} cookies.")
                    browser.close()
                    return True
                else:
                    logger.warning("[Facebook] Login may not have completed.")
                    browser.close()
                    return False
            except Exception as e:
                logger.warning(f"[Facebook] Login timeout or error: {e}")
                # Still try to save cookies in case user partially logged in
                cookies = context.cookies()
                if any(c.get("name") == "c_user" for c in cookies):
                    save_fb_cookies(cookies)
                    logger.info("[Facebook] Saved cookies despite timeout.")
                    browser.close()
                    return True
                browser.close()
                return False
    except Exception as e:
        logger.error(f"[Facebook] Login error: {e}")
        return False


class FacebookMarketplaceScanner(BaseScanner):
    scanner_id = "facebook"
    name = "Facebook Marketplace"
    base_url = "https://www.facebook.com/marketplace"
    min_request_delay = 1.5
    max_request_delay = 3.0

    QUICK_CITIES = ["Sydney", "Melbourne", "Brisbane", "Perth", "Adelaide"]

    def scan(self, quick: bool = False) -> list[Listing]:
        """Scan Facebook Marketplace using saved cookies + Playwright."""
        cities = self.QUICK_CITIES if quick else list(AU_CITIES_FB.keys())
        listings = []

        if has_fb_cookies():
            try:
                from playwright.sync_api import sync_playwright
                listings = self._scan_with_cookies(cities)
                if listings:
                    return self._deduplicate(listings)
            except ImportError:
                logger.info(f"[{self.name}] Playwright not available — generating direct links")
            except Exception as e:
                logger.warning(f"[{self.name}] Cookie-based scan error: {e}")

        # Always generate direct clickable links for each search term
        for term in self.search_terms[:4]:
            encoded = quote_plus(term)
            for city_name in cities[:5]:
                city_slug = AU_CITIES_FB.get(city_name, city_name.lower())
                fb_url = f"https://www.facebook.com/marketplace/{city_slug}/search/?query={encoded}"
                listings.append(Listing(
                    title=f"FB: '{term}' in {city_name}",
                    price="Click to view",
                    url=fb_url,
                    location=city_name,
                    marketplace=self.name,
                    description=f"Open Facebook Marketplace to search for '{term}' in {city_name}",
                    image_url="",
                ))

        return self._deduplicate(listings)

    def search_open(self, query: str) -> list[Listing]:
        """Manual search — uses saved cookies if available, always includes direct links."""
        logger.info(f"[{self.name}] Manual search for '{query}'")
        listings = []

        # Always generate direct clickable links
        encoded = quote_plus(query)
        for city_name, city_slug in list(AU_CITIES_FB.items())[:8]:
            fb_url = f"https://www.facebook.com/marketplace/{city_slug}/search/?query={encoded}"
            listings.append(Listing(
                title=f"FB Marketplace: '{query}' in {city_name}",
                price="Click to open",
                url=fb_url,
                location=city_name,
                marketplace=self.name,
                description=f"Opens Facebook Marketplace search for '{query}' in {city_name}. Log in to see results.",
                image_url="",
            ))

        # Try Playwright with saved cookies
        if has_fb_cookies():
            try:
                from playwright.sync_api import sync_playwright
                pw_results = self._search_with_cookies(query, self.QUICK_CITIES)
                if pw_results:
                    logger.info(f"[{self.name}] Found {len(pw_results)} actual results via cookies")
                    listings.extend(pw_results)
            except ImportError:
                logger.info(f"[{self.name}] Playwright not available on cloud")
            except Exception as e:
                logger.warning(f"[{self.name}] Playwright error: {e}")

        unique = self._deduplicate(listings)
        logger.info(f"[{self.name}] Manual search total: {len(unique)} listings")
        return unique

    def _create_context(self, playwright):
        """Create a Playwright browser context with saved FB cookies."""
        browser = playwright.chromium.launch(headless=True)
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

        # Load saved cookies
        cookies = load_fb_cookies()
        if cookies:
            context.add_cookies(cookies)
            logger.info(f"[{self.name}] Loaded {len(cookies)} saved cookies")

        return browser, context

    def _scan_with_cookies(self, cities: list[str]) -> list[Listing]:
        """Scan FB Marketplace using saved cookies."""
        from playwright.sync_api import sync_playwright

        listings = []
        try:
            with sync_playwright() as p:
                browser, context = self._create_context(p)
                page = context.new_page()

                for term in self.search_terms[:8]:
                    for city_name in cities[:3]:
                        city_slug = AU_CITIES_FB.get(city_name, city_name.lower())
                        encoded = quote_plus(term)
                        url = f"https://www.facebook.com/marketplace/{city_slug}/search/?query={encoded}"

                        try:
                            page.goto(url, wait_until="domcontentloaded", timeout=20000)
                            page.wait_for_timeout(3000)

                            # Dismiss any popups
                            self._dismiss_popups(page)

                            html = page.content()

                            # Check if we're logged in
                            if "login" in page.url.lower() and "marketplace" not in page.url.lower():
                                logger.warning(f"[{self.name}] Cookies expired — need to re-login")
                                browser.close()
                                return []

                            found = self._parse_fb_html(html, city_name)
                            listings.extend(found)

                            if found:
                                logger.info(f"[{self.name}] {city_name}/{term}: {len(found)} results")

                            page.wait_for_timeout(2000)
                        except Exception as e:
                            logger.debug(f"[{self.name}] Error {city_name}/{term}: {e}")
                            continue

                # Update cookies (they may have been refreshed)
                new_cookies = context.cookies()
                save_fb_cookies(new_cookies)
                browser.close()
        except Exception as e:
            logger.error(f"[{self.name}] Cookie scan error: {e}")

        return listings

    def _search_with_cookies(self, query: str, cities: list[str]) -> list[Listing]:
        """Search FB Marketplace for a single query using saved cookies."""
        from playwright.sync_api import sync_playwright

        listings = []
        try:
            with sync_playwright() as p:
                browser, context = self._create_context(p)
                page = context.new_page()

                for city_name in cities:
                    city_slug = AU_CITIES_FB.get(city_name, city_name.lower())
                    encoded = quote_plus(query)
                    url = f"https://www.facebook.com/marketplace/{city_slug}/search/?query={encoded}"

                    try:
                        page.goto(url, wait_until="domcontentloaded", timeout=20000)
                        page.wait_for_timeout(4000)

                        self._dismiss_popups(page)

                        # Check login status
                        if "login" in page.url.lower() and "marketplace" not in page.url.lower():
                            logger.warning(f"[{self.name}] Cookies expired — re-login needed")
                            break

                        html = page.content()
                        found = self._parse_fb_html(html, city_name)
                        listings.extend(found)

                        if found:
                            logger.info(f"[{self.name}] {city_name}: {len(found)} results")

                        page.wait_for_timeout(2000)
                    except Exception as e:
                        logger.debug(f"[{self.name}] Error {city_name}: {e}")
                        continue

                # Refresh saved cookies
                new_cookies = context.cookies()
                save_fb_cookies(new_cookies)
                browser.close()
        except Exception as e:
            logger.error(f"[{self.name}] Cookie search error: {e}")

        return listings

    def _dismiss_popups(self, page):
        """Try to dismiss common Facebook popups."""
        for selector in ['[aria-label="Close"]', '[aria-label="Decline optional cookies"]',
                         'div[role="dialog"] [aria-label="Close"]']:
            try:
                btn = page.locator(selector).first
                if btn and btn.is_visible(timeout=1000):
                    btn.click(timeout=2000)
                    page.wait_for_timeout(500)
            except Exception:
                pass

    def _parse_fb_html(self, html: str, city: str) -> list[Listing]:
        """Parse Facebook Marketplace HTML for listings."""
        from bs4 import BeautifulSoup

        soup = BeautifulSoup(html, HTML_PARSER)
        results = []

        # FB uses links with /marketplace/item/ for actual listings
        for link in soup.select('a[href*="/marketplace/item/"]'):
            try:
                href = link.get("href", "")
                if not href.startswith("http"):
                    href = f"https://www.facebook.com{href}"

                # Clean URL (remove tracking params)
                if "?" in href:
                    href = href.split("?")[0]

                text = link.get_text(separator=" ", strip=True)
                if not text or len(text) < 3:
                    continue

                # Extract price
                price = "See listing"
                price_match = re.search(r'A?\$\s*[\d,.]+', text)
                if price_match:
                    price = price_match.group(0)

                # Get image
                img_el = link.select_one("img")
                image_url = ""
                if img_el:
                    image_url = img_el.get("src", "") or img_el.get("data-src", "")

                # Title: longest meaningful text segment
                parts = [p.strip() for p in text.split('\n') if p.strip() and len(p.strip()) > 2]
                # Filter out price-only parts
                title_parts = [p for p in parts if not re.match(r'^A?\$[\d,.]+$', p.strip())]
                title = max(title_parts, key=len) if title_parts else (parts[0] if parts else text[:100])

                # Detect location from text
                location = city
                for c in AU_CITIES_FB:
                    if c.lower() in text.lower():
                        location = c
                        break

                results.append(Listing(
                    title=title,
                    price=price,
                    url=href,
                    location=location,
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
            key = listing.url.split("?")[0]
            if key not in seen_urls:
                seen_urls.add(key)
                unique.append(listing)
        logger.info(f"[{self.name}] Total: {len(unique)} unique listings")
        return unique
