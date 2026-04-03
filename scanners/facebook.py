"""Facebook Marketplace scanner.

Uses saved cookies to scrape Facebook Marketplace via plain HTTP requests
to mbasic.facebook.com (Facebook's no-JavaScript mobile version).

This works on cloud without Playwright/Chromium.

Flow:
  1. User imports cookies via the cookie import modal in the app
  2. Cookies saved to fb_cookies.json
  3. Scanner uses cookies with requests to fetch mbasic.facebook.com
  4. Falls back to Playwright if available (local desktop)
  5. Last resort: direct links user can click
"""

import json
import logging
import os
import re
import time
import random
from urllib.parse import quote_plus, unquote

import requests
from bs4 import BeautifulSoup

from .base import BaseScanner, Listing, HTML_PARSER

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
    return os.path.exists(COOKIES_FILE)


def save_fb_cookies(cookies: list[dict]):
    with open(COOKIES_FILE, "w") as f:
        json.dump(cookies, f)
    logger.info(f"[Facebook] Saved {len(cookies)} cookies to {COOKIES_FILE}")


def load_fb_cookies() -> list[dict]:
    if not os.path.exists(COOKIES_FILE):
        return []
    try:
        with open(COOKIES_FILE) as f:
            return json.load(f)
    except Exception:
        return []


def _cookies_to_jar(cookie_list: list[dict]) -> requests.cookies.RequestsCookieJar:
    """Convert saved cookie dicts to a requests cookie jar."""
    jar = requests.cookies.RequestsCookieJar()
    for c in cookie_list:
        name = c.get("name", "")
        value = c.get("value", "")
        domain = c.get("domain", ".facebook.com")
        path = c.get("path", "/")
        if name and value:
            jar.set(name, value, domain=domain, path=path)
    return jar


def do_fb_login() -> bool:
    """Open a visible browser for user to log into Facebook manually."""
    try:
        from playwright.sync_api import sync_playwright
    except ImportError:
        logger.error("[Facebook] Playwright not available — use cookie import instead")
        return False

    try:
        with sync_playwright() as p:
            browser = p.chromium.launch(headless=False)
            context = browser.new_context(
                user_agent="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/131.0.0.0 Safari/537.36",
                locale="en-AU",
                timezone_id="Australia/Sydney",
                viewport={"width": 1280, "height": 900},
            )
            page = context.new_page()
            page.goto("https://www.facebook.com/login", wait_until="domcontentloaded")

            try:
                page.wait_for_url("**/facebook.com/**", timeout=300000)
                page.wait_for_timeout(3000)
                if "login" not in page.url.lower():
                    page.goto("https://www.facebook.com/marketplace/", wait_until="domcontentloaded")
                    page.wait_for_timeout(3000)
                    cookies = context.cookies()
                    save_fb_cookies(cookies)
                    browser.close()
                    return True
                browser.close()
                return False
            except Exception as e:
                cookies = context.cookies()
                if any(c.get("name") == "c_user" for c in cookies):
                    save_fb_cookies(cookies)
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
    min_request_delay = 2.0
    max_request_delay = 4.0

    QUICK_CITIES = ["Sydney", "Melbourne", "Brisbane", "Perth", "Adelaide"]

    # --- HTTP session with cookies (no Playwright needed) ---

    def _get_fb_session(self) -> requests.Session | None:
        """Create an HTTP session with saved FB cookies."""
        cookies = load_fb_cookies()
        if not cookies:
            return None

        session = requests.Session()
        session.cookies = _cookies_to_jar(cookies)
        session.headers.update({
            "User-Agent": (
                "Mozilla/5.0 (Linux; Android 13; SM-G991B) "
                "AppleWebKit/537.36 (KHTML, like Gecko) "
                "Chrome/131.0.0.0 Mobile Safari/537.36"
            ),
            "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
            "Accept-Language": "en-AU,en;q=0.9",
            "Accept-Encoding": "gzip, deflate, br",
            "Sec-Fetch-Dest": "document",
            "Sec-Fetch-Mode": "navigate",
            "Sec-Fetch-Site": "none",
            "Upgrade-Insecure-Requests": "1",
        })
        return session

    def _scrape_fb_http(self, query: str, cities: list[str]) -> list[Listing]:
        """Scrape Facebook Marketplace using plain HTTP + saved cookies.

        Uses mbasic.facebook.com (no-JS mobile version) and also
        the main www.facebook.com/marketplace API endpoints.
        """
        session = self._get_fb_session()
        if not session:
            logger.info(f"[{self.name}] No cookies — can't scrape FB via HTTP")
            return []

        listings = []
        encoded = quote_plus(query)

        for city_name in cities:
            city_slug = AU_CITIES_FB.get(city_name, city_name.lower())
            time.sleep(random.uniform(1.5, 3.0))

            # Try mbasic.facebook.com first (works without JS)
            mbasic_url = f"https://mbasic.facebook.com/marketplace/{city_slug}/search/?query={encoded}"
            try:
                resp = session.get(mbasic_url, timeout=15, allow_redirects=True)
                if resp.status_code == 200 and "login" not in resp.url.lower().split("?")[0]:
                    found = self._parse_mbasic_html(resp.text, city_name)
                    if found:
                        logger.info(f"[{self.name}] mbasic {city_name}: {len(found)} results")
                        listings.extend(found)
                        continue
                    # If mbasic returned HTML but no results, try parsing differently
                    found = self._parse_fb_html(resp.text, city_name)
                    if found:
                        logger.info(f"[{self.name}] mbasic (alt parse) {city_name}: {len(found)} results")
                        listings.extend(found)
                        continue
                elif "login" in resp.url.lower():
                    logger.warning(f"[{self.name}] Cookies expired — redirected to login")
                    break
            except Exception as e:
                logger.debug(f"[{self.name}] mbasic error {city_name}: {e}")

            # Try m.facebook.com (mobile)
            time.sleep(random.uniform(1.0, 2.0))
            mobile_url = f"https://m.facebook.com/marketplace/{city_slug}/search/?query={encoded}"
            try:
                resp = session.get(mobile_url, timeout=15, allow_redirects=True)
                if resp.status_code == 200 and "login" not in resp.url.lower().split("?")[0]:
                    found = self._parse_fb_html(resp.text, city_name)
                    if found:
                        logger.info(f"[{self.name}] mobile {city_name}: {len(found)} results")
                        listings.extend(found)
                        continue
                elif "login" in resp.url.lower():
                    logger.warning(f"[{self.name}] Cookies expired on m.facebook.com")
                    break
            except Exception as e:
                logger.debug(f"[{self.name}] mobile error {city_name}: {e}")

            # Try www.facebook.com (may have JS-rendered content in initial HTML)
            time.sleep(random.uniform(1.0, 2.0))
            www_url = f"https://www.facebook.com/marketplace/{city_slug}/search/?query={encoded}"
            try:
                resp = session.get(www_url, timeout=15, allow_redirects=True)
                if resp.status_code == 200:
                    # Try to extract JSON data from the HTML (FB embeds listing data)
                    found = self._parse_fb_json_from_html(resp.text, city_name)
                    if found:
                        logger.info(f"[{self.name}] www JSON {city_name}: {len(found)} results")
                        listings.extend(found)
                        continue
                    found = self._parse_fb_html(resp.text, city_name)
                    if found:
                        logger.info(f"[{self.name}] www HTML {city_name}: {len(found)} results")
                        listings.extend(found)
            except Exception as e:
                logger.debug(f"[{self.name}] www error {city_name}: {e}")

        return listings

    def _parse_mbasic_html(self, html: str, city: str) -> list[Listing]:
        """Parse mbasic.facebook.com marketplace HTML."""
        soup = BeautifulSoup(html, HTML_PARSER)
        results = []

        # mbasic uses simple HTML with marketplace item links
        for link in soup.select('a[href*="/marketplace/item/"]'):
            try:
                href = link.get("href", "")
                if not href.startswith("http"):
                    href = f"https://www.facebook.com{href}"
                # Clean tracking params
                if "?" in href:
                    base = href.split("?")[0]
                    # Keep the item URL clean
                    href = base

                text = link.get_text(separator=" ", strip=True)
                if not text or len(text) < 3:
                    continue

                price = "See listing"
                price_match = re.search(r'A?\$\s*[\d,.]+', text)
                if price_match:
                    price = price_match.group(0)

                img_el = link.select_one("img")
                image_url = ""
                if img_el:
                    image_url = img_el.get("src", "") or img_el.get("data-src", "")

                # Build title from text, removing price
                title = re.sub(r'A?\$\s*[\d,.]+', '', text).strip()
                if len(title) < 3:
                    title = text[:100]

                results.append(Listing(
                    title=title[:200],
                    price=price,
                    url=href,
                    location=city,
                    marketplace=self.name,
                    description=text[:200],
                    image_url=image_url,
                ))
            except Exception:
                continue

        # Also try table rows (mbasic sometimes uses tables)
        for row in soup.select('table a[href*="marketplace"]'):
            try:
                href = row.get("href", "")
                if "/item/" not in href:
                    continue
                if not href.startswith("http"):
                    href = f"https://www.facebook.com{href}"
                if "?" in href:
                    href = href.split("?")[0]
                text = row.get_text(separator=" ", strip=True)
                if not text or len(text) < 3:
                    continue
                price = "See listing"
                pm = re.search(r'A?\$\s*[\d,.]+', text)
                if pm:
                    price = pm.group(0)
                title = re.sub(r'A?\$\s*[\d,.]+', '', text).strip() or text[:100]
                results.append(Listing(
                    title=title[:200], price=price, url=href,
                    location=city, marketplace=self.name,
                    description=text[:200], image_url="",
                ))
            except Exception:
                continue

        return results

    def _parse_fb_json_from_html(self, html: str, city: str) -> list[Listing]:
        """Try to extract listing data from JSON embedded in Facebook HTML.

        Facebook's www pages embed structured data in script tags and
        require-like modules that contain marketplace listing info.
        """
        results = []

        # Look for marketplace_search results in embedded JSON
        # Pattern: "marketplace_search":{...,"edges":[{...}]}
        patterns = [
            r'"edges"\s*:\s*(\[\s*\{[^]]*"listing"[^]]*\])',
            r'"marketplace_listing_title"\s*:\s*"([^"]+)"',
            r'marketplace_listing.*?"name"\s*:\s*"([^"]+)".*?"price"\s*:\s*\{[^}]*"amount"\s*:\s*"([^"]+)"',
        ]

        # Try to find listing items in the HTML via regex
        item_pattern = re.compile(
            r'/marketplace/item/(\d+)/', re.IGNORECASE
        )
        title_near_link = re.compile(
            r'/marketplace/item/(\d+)/[^"]*"[^>]*>([^<]+)', re.IGNORECASE
        )

        # Find all item IDs
        item_ids = set(item_pattern.findall(html))
        if not item_ids:
            return []

        # Try to find titles and prices near each item reference
        for item_id in list(item_ids)[:30]:
            try:
                # Search for context around this item ID
                idx = html.find(f'/marketplace/item/{item_id}/')
                if idx < 0:
                    continue

                # Get surrounding text (2KB around the link)
                start = max(0, idx - 500)
                end = min(len(html), idx + 1500)
                context = html[start:end]

                # Try to extract title
                title = ""
                # Look for text content near the link
                title_matches = re.findall(r'"marketplace_listing_title"\s*:\s*"([^"]{3,})"', context)
                if title_matches:
                    title = title_matches[0]
                else:
                    # Try generic text patterns
                    text_matches = re.findall(r'"text"\s*:\s*"([^"]{5,80})"', context)
                    if text_matches:
                        title = max(text_matches, key=len)

                # Extract price
                price = "See listing"
                price_matches = re.findall(r'"amount"\s*:\s*"([\d.]+)"', context)
                if price_matches:
                    price = f"${price_matches[0]}"
                else:
                    price_matches = re.findall(r'A?\$\s*([\d,.]+)', context)
                    if price_matches:
                        price = f"${price_matches[0]}"

                # Extract image
                image_url = ""
                img_matches = re.findall(r'"uri"\s*:\s*"(https://[^"]*?fbcdn[^"]*)"', context)
                if img_matches:
                    image_url = img_matches[0].replace("\\/", "/")

                url = f"https://www.facebook.com/marketplace/item/{item_id}/"

                if title:
                    # Unescape JSON strings
                    title = title.replace("\\u0040", "@").replace("\\u0026", "&")
                    title = title.encode().decode('unicode_escape', errors='ignore')

                    results.append(Listing(
                        title=title[:200],
                        price=price,
                        url=url,
                        location=city,
                        marketplace=self.name,
                        description=f"Found on Facebook Marketplace in {city}",
                        image_url=image_url,
                    ))
                elif item_id:
                    # Even without title, create a listing with the item link
                    results.append(Listing(
                        title=f"Facebook Marketplace Item #{item_id}",
                        price=price,
                        url=url,
                        location=city,
                        marketplace=self.name,
                        description=f"Marketplace listing in {city} — click to view details",
                        image_url=image_url,
                    ))
            except Exception:
                continue

        return results

    def _parse_fb_html(self, html: str, city: str) -> list[Listing]:
        """Parse Facebook Marketplace HTML for listings."""
        soup = BeautifulSoup(html, HTML_PARSER)
        results = []

        for link in soup.select('a[href*="/marketplace/item/"]'):
            try:
                href = link.get("href", "")
                if not href.startswith("http"):
                    href = f"https://www.facebook.com{href}"
                if "?" in href:
                    href = href.split("?")[0]

                text = link.get_text(separator=" ", strip=True)
                if not text or len(text) < 3:
                    continue

                price = "See listing"
                price_match = re.search(r'A?\$\s*[\d,.]+', text)
                if price_match:
                    price = price_match.group(0)

                img_el = link.select_one("img")
                image_url = ""
                if img_el:
                    image_url = img_el.get("src", "") or img_el.get("data-src", "")

                parts = [p.strip() for p in text.split('\n') if p.strip() and len(p.strip()) > 2]
                title_parts = [p for p in parts if not re.match(r'^A?\$[\d,.]+$', p.strip())]
                title = max(title_parts, key=len) if title_parts else (parts[0] if parts else text[:100])

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

        # Also try the JSON extraction if HTML parsing found nothing
        if not results:
            results = self._parse_fb_json_from_html(str(soup), city)

        return results

    # --- Main scan/search methods ---

    def scan(self, quick: bool = False) -> list[Listing]:
        """Scan Facebook Marketplace."""
        cities = self.QUICK_CITIES if quick else list(AU_CITIES_FB.keys())[:6]
        all_listings = []

        # Try HTTP with cookies first (works on cloud)
        if has_fb_cookies():
            for term in self.search_terms[:3]:
                found = self._scrape_fb_http(term, cities[:3])
                all_listings.extend(found)
                if found:
                    logger.info(f"[{self.name}] HTTP scan for '{term}': {len(found)} results")

        # Try Playwright if HTTP got nothing and Playwright is available
        if not all_listings and has_fb_cookies():
            try:
                from playwright.sync_api import sync_playwright
                all_listings = self._scan_with_playwright(cities)
            except ImportError:
                pass
            except Exception as e:
                logger.warning(f"[{self.name}] Playwright error: {e}")

        if all_listings:
            return self._deduplicate(all_listings)

        # Last resort: generate direct links so user can click through
        logger.info(f"[{self.name}] No scraping possible — generating direct links")
        for term in self.search_terms[:2]:
            encoded = quote_plus(term)
            for city_name in cities[:3]:
                city_slug = AU_CITIES_FB.get(city_name, city_name.lower())
                fb_url = f"https://www.facebook.com/marketplace/{city_slug}/search/?query={encoded}"
                all_listings.append(Listing(
                    title=f"FB: '{term}' in {city_name} (click to search)",
                    price="Open FB",
                    url=fb_url,
                    location=city_name,
                    marketplace=self.name,
                    description=f"Click to search Facebook Marketplace for '{term}' in {city_name}",
                    image_url="",
                ))

        return self._deduplicate(all_listings)

    def search_open(self, query: str) -> list[Listing]:
        """Manual search."""
        logger.info(f"[{self.name}] Manual search for '{query}'")
        listings = []

        # Try HTTP scraping with cookies first
        if has_fb_cookies():
            found = self._scrape_fb_http(query, self.QUICK_CITIES)
            listings.extend(found)
            if found:
                logger.info(f"[{self.name}] HTTP found {len(found)} results for '{query}'")

        # Try Playwright if HTTP got nothing
        if not listings and has_fb_cookies():
            try:
                from playwright.sync_api import sync_playwright
                pw_results = self._search_with_playwright_single(query, self.QUICK_CITIES)
                listings.extend(pw_results)
            except ImportError:
                pass
            except Exception as e:
                logger.warning(f"[{self.name}] Playwright error: {e}")

        # Add direct links at the end (useful as quick shortcuts)
        encoded = quote_plus(query)
        for city_name, city_slug in list(AU_CITIES_FB.items())[:5]:
            fb_url = f"https://www.facebook.com/marketplace/{city_slug}/search/?query={encoded}"
            listings.append(Listing(
                title=f"Open FB: '{query}' in {city_name}",
                price="Direct link",
                url=fb_url,
                location=city_name,
                marketplace=self.name,
                description=f"Click to open Facebook Marketplace search in {city_name}",
                image_url="",
            ))

        unique = self._deduplicate(listings)
        logger.info(f"[{self.name}] Manual search total: {len(unique)} listings")
        return unique

    # --- Playwright methods (local desktop only) ---

    def _scan_with_playwright(self, cities: list[str]) -> list[Listing]:
        from playwright.sync_api import sync_playwright
        listings = []
        try:
            with sync_playwright() as p:
                browser = p.chromium.launch(headless=True)
                context = browser.new_context(
                    user_agent="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/131.0.0.0 Safari/537.36",
                    locale="en-AU", timezone_id="Australia/Sydney",
                    viewport={"width": 1920, "height": 1080},
                )
                cookies = load_fb_cookies()
                if cookies:
                    context.add_cookies(cookies)
                page = context.new_page()

                for term in self.search_terms[:4]:
                    for city_name in cities[:3]:
                        city_slug = AU_CITIES_FB.get(city_name, city_name.lower())
                        encoded = quote_plus(term)
                        url = f"https://www.facebook.com/marketplace/{city_slug}/search/?query={encoded}"
                        try:
                            page.goto(url, wait_until="domcontentloaded", timeout=20000)
                            page.wait_for_timeout(3000)
                            html = page.content()
                            if "login" in page.url.lower() and "marketplace" not in page.url.lower():
                                browser.close()
                                return listings
                            found = self._parse_fb_html(html, city_name)
                            listings.extend(found)
                            page.wait_for_timeout(2000)
                        except Exception:
                            continue
                save_fb_cookies(context.cookies())
                browser.close()
        except Exception as e:
            logger.error(f"[{self.name}] Playwright scan error: {e}")
        return listings

    def _search_with_playwright_single(self, query: str, cities: list[str]) -> list[Listing]:
        from playwright.sync_api import sync_playwright
        listings = []
        try:
            with sync_playwright() as p:
                browser = p.chromium.launch(headless=True)
                context = browser.new_context(
                    user_agent="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/131.0.0.0 Safari/537.36",
                    locale="en-AU", timezone_id="Australia/Sydney",
                    viewport={"width": 1920, "height": 1080},
                )
                cookies = load_fb_cookies()
                if cookies:
                    context.add_cookies(cookies)
                page = context.new_page()

                for city_name in cities:
                    city_slug = AU_CITIES_FB.get(city_name, city_name.lower())
                    encoded = quote_plus(query)
                    url = f"https://www.facebook.com/marketplace/{city_slug}/search/?query={encoded}"
                    try:
                        page.goto(url, wait_until="domcontentloaded", timeout=20000)
                        page.wait_for_timeout(4000)
                        if "login" in page.url.lower() and "marketplace" not in page.url.lower():
                            break
                        found = self._parse_fb_html(page.content(), city_name)
                        listings.extend(found)
                        page.wait_for_timeout(2000)
                    except Exception:
                        continue
                save_fb_cookies(context.cookies())
                browser.close()
        except Exception as e:
            logger.error(f"[{self.name}] Playwright search error: {e}")
        return listings

    def _deduplicate(self, listings: list[Listing]) -> list[Listing]:
        seen_urls = set()
        unique = []
        for listing in listings:
            key = listing.url.split("?")[0]
            if key not in seen_urls:
                seen_urls.add(key)
                unique.append(listing)
        return unique
