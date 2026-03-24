"""Gumtree Australia scanner.

Uses direct HTTP requests with robust headers as the primary approach.
Falls back to Playwright if available, then Google dorking as last resort.
"""

import json
import logging
import re

from bs4 import BeautifulSoup
from urllib.parse import quote_plus

from .base import BaseScanner, Listing

logger = logging.getLogger(__name__)


class GumtreeScanner(BaseScanner):
    scanner_id = "gumtree"
    name = "Gumtree AU"
    base_url = "https://www.gumtree.com.au"
    min_request_delay = 3.0
    max_request_delay = 6.0

    def scan(self) -> list[Listing]:
        # Try direct HTTP first (works most of the time without Playwright)
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
        """Try direct HTTP requests to Gumtree search.
        Fail fast: if the first 2 terms return nothing (likely CF blocked),
        skip the rest and let the caller try the next fallback.
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
                        logger.info(f"[{self.name}] HTTP blocked after {consecutive_failures} failures, skipping")
                        return []
            except Exception as e:
                logger.debug(f"[{self.name}] HTTP search error for '{term}': {e}")
                consecutive_failures += 1
                if consecutive_failures >= 2 and not all_listings:
                    logger.info(f"[{self.name}] HTTP blocked, skipping remaining terms")
                    return []

        if all_listings:
            logger.info(f"[{self.name}] HTTP found {len(all_listings)} total results")
        return all_listings

    def _search_http(self, term: str) -> list[Listing]:
        """Search Gumtree via direct HTTP."""
        encoded = quote_plus(term)
        url = f"{self.base_url}/s-{encoded}/k0"

        resp = self._get(url, retries=1, delay=2.0)
        if not resp:
            return []

        html = resp.text

        # Check for CloudFlare block
        if "Just a moment" in html or "Access Denied" in html:
            logger.debug(f"[{self.name}] CF blocked for '{term}'")
            return []

        # Try JSON first, then HTML
        results = self._parse_json(html, term)
        if results:
            return results
        return self._parse_html(html, term)

    def _scan_playwright(self) -> list[Listing]:
        """Use Playwright to bypass CloudFlare if needed."""
        from playwright.sync_api import sync_playwright

        listings = []
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
                    delete navigator.__proto__.webdriver;
                """)

                # Warm up for CF cookies
                logger.info(f"[{self.name}] Warming up browser...")
                page.goto(self.base_url, wait_until="domcontentloaded", timeout=30000)
                page.wait_for_timeout(5000)

                if "Just a moment" in page.content():
                    page.wait_for_timeout(10000)

                for term in self.search_terms:
                    try:
                        encoded = quote_plus(term)
                        url = f"{self.base_url}/s-{encoded}/k0"
                        page.goto(url, wait_until="domcontentloaded", timeout=20000)
                        page.wait_for_timeout(3000)

                        html = page.content()
                        if "Just a moment" in html or "Access Denied" in html:
                            page.wait_for_timeout(8000)
                            html = page.content()
                            if "Just a moment" in html:
                                continue

                        results = self._parse_json(html, term)
                        if not results:
                            results = self._parse_html(html, term)
                        listings.extend(results)
                        page.wait_for_timeout(2000)
                    except Exception as e:
                        logger.error(f"[{self.name}] Error searching '{term}': {e}")

                browser.close()
        except Exception as e:
            logger.error(f"[{self.name}] Browser error: {e}")

        return listings

    def _parse_json(self, html: str, term: str) -> list[Listing]:
        """Extract listings from embedded JSON data."""
        soup = BeautifulSoup(html, "lxml")
        results = []

        # Next.js data
        script = soup.select_one("script#__NEXT_DATA__")
        if script and script.string:
            try:
                data = json.loads(script.string)
                ads = self._extract_ads(data)
                for ad in ads:
                    results.append(Listing(
                        title=ad.get("title", "No title"),
                        price=ad.get("price", "No price"),
                        url=ad.get("url", ""),
                        location=ad.get("location", "Australia"),
                        marketplace=self.name,
                        description=ad.get("description", ""),
                        image_url=ad.get("image", ""),
                    ))
                if results:
                    logger.info(f"[{self.name}] Found {len(results)} for '{term}' via JSON")
                    return results
            except (json.JSONDecodeError, KeyError) as e:
                logger.debug(f"[{self.name}] JSON parse error: {e}")

        # JSON-LD
        for script in soup.select('script[type="application/ld+json"]'):
            try:
                data = json.loads(script.string)
                if isinstance(data, dict) and data.get("@type") == "ItemList":
                    for item in data.get("itemListElement", []):
                        obj = item.get("item", item)
                        item_url = obj.get("url", "")
                        if item_url and not item_url.startswith("http"):
                            item_url = f"{self.base_url}{item_url}"
                        offers = obj.get("offers", {})
                        price = "No price"
                        if isinstance(offers, dict) and offers.get("price"):
                            price = f"${offers['price']} {offers.get('priceCurrency', 'AUD')}"
                        img = ""
                        if obj.get("image"):
                            img_val = obj["image"]
                            if isinstance(img_val, list):
                                img = img_val[0] if img_val else ""
                            else:
                                img = str(img_val)
                        results.append(Listing(
                            title=obj.get("name", "No title"),
                            price=price,
                            url=item_url,
                            location="Australia",
                            marketplace=self.name,
                            image_url=img,
                        ))
            except (json.JSONDecodeError, KeyError):
                continue

        if results:
            logger.info(f"[{self.name}] Found {len(results)} for '{term}' via JSON-LD")
        return results

    def _extract_ads(self, data: dict) -> list[dict]:
        """Navigate __NEXT_DATA__ to find ads."""
        ads = []
        try:
            props = data.get("props", {}).get("pageProps", {})
            for key in ("searchResult", "results", "ads", "data"):
                if key not in props:
                    continue
                container = props[key]
                items = []
                if isinstance(container, dict):
                    items = container.get("results", container.get("ads", []))
                elif isinstance(container, list):
                    items = container

                for item in items:
                    ad = {
                        "title": item.get("title", item.get("adTitle", "")),
                        "price": item.get("priceText", item.get("price", {}).get("display", "No price")),
                        "location": item.get("locationName", item.get("location", {}).get("name", "Australia")),
                        "description": item.get("description", ""),
                        "image": "",
                    }
                    slug = item.get("url", item.get("seoUrl", ""))
                    ad_id = item.get("id", item.get("adId", ""))
                    if slug:
                        ad["url"] = f"{self.base_url}{slug}" if not slug.startswith("http") else slug
                    elif ad_id:
                        ad["url"] = f"{self.base_url}/s-ad/{ad_id}"
                    images = item.get("images", item.get("mainImage", []))
                    if isinstance(images, list) and images:
                        ad["image"] = images[0].get("url", "") if isinstance(images[0], dict) else str(images[0])
                    elif isinstance(images, str):
                        ad["image"] = images
                    if ad["title"]:
                        ads.append(ad)
        except Exception as e:
            logger.debug(f"[{self.name}] NEXT_DATA extract error: {e}")
        return ads

    def _parse_html(self, html: str, term: str) -> list[Listing]:
        """Fall back to HTML parsing."""
        soup = BeautifulSoup(html, "lxml")
        results = []

        selectors = [
            "a.user-ad-row",
            "a.listing-link",
            "div.user-ad-row",
            "a[data-testid='listing-card']",
            "div[data-testid='listing-card']",
            "article a",
            "div.srp-item a",
        ]

        cards = []
        for sel in selectors:
            cards = soup.select(sel)
            if cards:
                break

        for card in cards:
            try:
                title_el = card.select_one(
                    "span.user-ad-row__title, h3.listing-title, "
                    "p.tempo-title, div.user-ad-row__title, "
                    "h2, h3, [data-testid='listing-title']"
                )
                price_el = card.select_one(
                    "span.user-ad-price, div.listing-price, "
                    "p.tempo-price, div.user-ad-row__price, "
                    "[data-testid='listing-price']"
                )
                loc_el = card.select_one(
                    "span.user-ad-row__location, div.listing-location, "
                    "p.tempo-location, [data-testid='listing-location']"
                )
                img_el = card.select_one("img")

                title = self._safe_text(title_el, "No title")
                price = self._safe_text(price_el, "No price")
                location = self._safe_text(loc_el, "Australia")
                image_url = img_el.get("src", "") if img_el else ""

                href = card.get("href", "")
                if not href and card.name != "a":
                    link = card.select_one("a")
                    href = link.get("href", "") if link else ""
                if href and not href.startswith("http"):
                    href = f"{self.base_url}{href}"

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
            logger.info(f"[{self.name}] Found {len(results)} for '{term}' via HTML")
        return results

    # ------------------------------------------------------------------
    # Google fallback (when direct HTTP and Playwright both fail)
    # ------------------------------------------------------------------
    def _scan_google_fallback(self) -> list[Listing]:
        """Fall back to batched Google dorking."""
        all_results = []

        for i in range(0, len(self.search_terms), 6):
            chunk = self.search_terms[i:i + 6]
            or_query = " OR ".join(f'"{t}"' for t in chunk)
            query = f'site:gumtree.com.au ({or_query})'

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

                    if "gumtree.com.au" not in href:
                        continue
                    if any(skip in href for skip in ("/post-ad", "/my-gumtree", "/help")):
                        continue

                    # Try to extract thumbnail from Google result
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

                    location = "Australia"
                    loc_match = re.search(r'(Sydney|Melbourne|Brisbane|Perth|Adelaide|Hobart|Darwin|Canberra)',
                                          f"{title} {description}", re.IGNORECASE)
                    if loc_match:
                        location = loc_match.group(1).title()

                    if title and href:
                        all_results.append(Listing(
                            title=title,
                            price=price,
                            url=href,
                            location=location,
                            marketplace=self.name,
                            description=description,
                            image_url=image_url,
                        ))
                except Exception as e:
                    logger.debug(f"[{self.name}] Google parse error: {e}")
                    continue

        logger.info(f"[{self.name}] Google found {len(all_results)} total results")
        return all_results
