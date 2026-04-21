"""Facebook Marketplace scanner.

Logs in via HTTP to mbasic.facebook.com (no browser needed) and scrapes
real marketplace listings. This is the key differentiator — it returns
actual listing data, not just placeholder links.

Flow:
1. HTTP login via mbasic.facebook.com (extracts CSRF, submits form)
2. Search marketplace via mbasic/m.facebook.com with saved cookies
3. Parse listing cards from the HTML response
4. Fallback: Playwright browser if HTTP fails
5. Last resort: search engine fallback

IMPORTANT: The user MUST provide Facebook email/password via the web UI
login form. Without valid credentials, only search engine fallback works.
"""

import json
import logging
import re
import time
from urllib.parse import quote_plus, urljoin, urlparse, parse_qs

import requests
from bs4 import BeautifulSoup

from .base import BaseScanner, Listing, HTML_PARSER, random_ua
from .search_engines import site_search

logger = logging.getLogger(__name__)


class FacebookScanner(BaseScanner):
    scanner_id = "facebook"
    name = "Facebook Marketplace"
    base_url = "https://www.facebook.com"
    min_request_delay = 2.0
    max_request_delay = 4.0

    def __init__(self, search_terms=None, location=None, fb_cookies=None,
                 fb_email=None, fb_password=None, **kwargs):
        super().__init__(search_terms=search_terms, location=location, **kwargs)
        self._cookies = fb_cookies or {}
        self._email = fb_email or ""
        self._password = fb_password or ""
        self._logged_in = False
        self._fb_session = requests.Session()
        self._fb_session.headers.update({
            "User-Agent": (
                "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
                "AppleWebKit/537.36 (KHTML, like Gecko) "
                "Chrome/131.0.0.0 Safari/537.36"
            ),
            "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
            "Accept-Language": "en-US,en;q=0.9",
            "Accept-Encoding": "gzip, deflate, br",
        })
        self._fb_session.cookies.set("locale", "en_GB", domain=".facebook.com")

        if self._cookies:
            for name, value in self._cookies.items():
                self._fb_session.cookies.set(name, value, domain=".facebook.com")
            if "c_user" in self._cookies:
                self._logged_in = True
                logger.info(f"[{self.name}] Loaded saved cookies (c_user present)")

    def scan(self) -> list[Listing]:
        if not self._logged_in and self._email and self._password:
            self._logged_in = self._login_http()

        if self._logged_in:
            listings = self._scrape_marketplace()
            if listings:
                return listings
            logger.info(f"[{self.name}] HTTP scraping returned no results")

        try:
            from playwright.sync_api import sync_playwright
            if self._logged_in:
                listings = self._scrape_playwright()
                if listings:
                    return listings
        except ImportError:
            logger.info(f"[{self.name}] Playwright not available")

        logger.info(f"[{self.name}] Trying search engine fallback")
        listings = self._scan_search_engine_fallback()
        if listings:
            return listings

        if not self._logged_in:
            return self._generate_login_prompt()

        return self._generate_direct_links()

    def search_open(self, term: str) -> list[Listing]:
        if not self._logged_in and self._email and self._password:
            self._logged_in = self._login_http()

        if self._logged_in:
            results = self._search_marketplace_term(term)
            if results:
                return results

        results = self._search_engine_term(term)
        if results:
            return results

        if not self._logged_in:
            return self._generate_login_prompt()
        return []

    def _login_http(self) -> bool:
        """Log in to Facebook via mbasic.facebook.com HTTP form submission."""
        logger.info(f"[{self.name}] Attempting HTTP login via mbasic.facebook.com")

        login_urls = [
            "https://mbasic.facebook.com/login/",
            "https://mbasic.facebook.com/",
            "https://m.facebook.com/login/",
        ]

        for login_url in login_urls:
            try:
                resp = self._fb_session.get(login_url, timeout=15, allow_redirects=True)
                if resp.status_code != 200:
                    logger.debug(f"[{self.name}] GET {login_url} returned {resp.status_code}")
                    continue

                html = resp.text
                if "Access Denied" in html or len(html) < 200:
                    logger.debug(f"[{self.name}] {login_url} blocked")
                    continue

                soup = BeautifulSoup(html, HTML_PARSER)

                form = soup.select_one("form#login_form") or soup.select_one("form[action*='login']")
                if not form:
                    logger.debug(f"[{self.name}] No login form found on {login_url}")
                    continue

                action = form.get("action", "")
                if action and not action.startswith("http"):
                    parsed = urlparse(login_url)
                    action = f"{parsed.scheme}://{parsed.netloc}{action}"

                form_data = {}
                for inp in form.select("input[name]"):
                    name = inp.get("name", "")
                    value = inp.get("value", "")
                    if name:
                        form_data[name] = value

                form_data["email"] = self._email
                form_data["pass"] = self._password

                if "login_attempt" not in form_data:
                    form_data["login_attempt"] = "1"

                time.sleep(1.5)

                post_resp = self._fb_session.post(
                    action or login_url,
                    data=form_data,
                    timeout=15,
                    allow_redirects=True,
                )

                cookies_dict = {c.name: c.value for c in self._fb_session.cookies}
                if "c_user" in cookies_dict:
                    self._cookies = cookies_dict
                    logger.info(f"[{self.name}] Login successful! c_user={cookies_dict['c_user'][:4]}...")
                    return True

                if post_resp.status_code in (301, 302):
                    loc = post_resp.headers.get("Location", "")
                    if "checkpoint" in loc or "two_step" in loc:
                        logger.warning(f"[{self.name}] Two-factor auth required")
                        return False

                resp_text = post_resp.text.lower()
                if "checkpoint" in resp_text or "two_step" in resp_text:
                    logger.warning(f"[{self.name}] 2FA or checkpoint detected")
                    return False

                logger.debug(f"[{self.name}] Login via {login_url} - no c_user cookie set")

            except requests.RequestException as e:
                logger.debug(f"[{self.name}] Login request error for {login_url}: {e}")
                continue

        logger.warning(f"[{self.name}] HTTP login failed - all URLs exhausted")
        return False

    def get_cookies(self) -> dict:
        return {c.name: c.value for c in self._fb_session.cookies}

    def _scrape_marketplace(self) -> list[Listing]:
        """Scrape Facebook Marketplace using saved session cookies."""
        all_listings = []

        for term in self.search_terms:
            try:
                found = self._search_marketplace_term(term)
                if found:
                    all_listings.extend(found)
                self._delay()
            except Exception as e:
                logger.error(f"[{self.name}] Error searching '{term}': {e}")

        if all_listings:
            logger.info(f"[{self.name}] Scraped {len(all_listings)} total marketplace listings")
        return all_listings

    def _search_marketplace_term(self, term: str) -> list[Listing]:
        """Search Facebook Marketplace for a specific term using multiple URL patterns."""
        encoded = quote_plus(term)
        lat = self.location.get("lat", -33.8688)
        lng = self.location.get("lng", 151.2093)
        radius = self.location.get("radius_km", 50)
        radius_m = radius * 1000

        search_urls = [
            f"https://mbasic.facebook.com/marketplace/search/?query={encoded}",
            f"https://m.facebook.com/marketplace/search/?query={encoded}&exact=false",
            f"https://www.facebook.com/marketplace/sydney/search/?query={encoded}&exact=false",
            f"https://www.facebook.com/marketplace/search/?query={encoded}&exact=false",
        ]

        for url in search_urls:
            try:
                resp = self._fb_session.get(url, timeout=15, allow_redirects=True)
                if resp.status_code != 200:
                    continue

                html = resp.text

                if "login" in resp.url.lower() and "marketplace" not in resp.url.lower():
                    logger.debug(f"[{self.name}] Redirected to login from {url}")
                    continue

                if len(html) < 500:
                    continue

                results = self._parse_marketplace_html(html, term, url)
                if results:
                    return results

                results = self._parse_marketplace_json(html, term)
                if results:
                    return results

            except requests.RequestException as e:
                logger.debug(f"[{self.name}] Request error for {url}: {e}")
                continue

        return []

    def _parse_marketplace_html(self, html: str, term: str, source_url: str) -> list[Listing]:
        """Parse marketplace listing cards from HTML."""
        soup = BeautifulSoup(html, HTML_PARSER)
        results = []

        is_mbasic = "mbasic" in source_url

        if is_mbasic:
            results = self._parse_mbasic(soup)
        else:
            results = self._parse_modern_fb(soup)

        if not results:
            results = self._parse_generic_fb(soup)

        if results:
            logger.info(f"[{self.name}] Found {len(results)} for '{term}' from {urlparse(source_url).netloc}")

        return results

    def _parse_mbasic(self, soup: BeautifulSoup) -> list[Listing]:
        """Parse mbasic.facebook.com marketplace results."""
        results = []

        card_selectors = [
            "div[data-module-result]",
            "div.marketplace-search-results a",
            "a[href*='/marketplace/item/']",
            "a[href*='marketplace']",
            "div[id*='marketplace'] a[href]",
            "table a[href*='/commerce/']",
            "div a[href*='/groups/'] ",
        ]

        links = set()
        for sel in card_selectors:
            for el in soup.select(sel):
                if el.name == "a":
                    links.add(el)
                else:
                    for a in el.select("a[href]"):
                        links.add(a)

        marketplace_links = []
        for link in soup.select("a[href]"):
            href = link.get("href", "")
            if any(pattern in href for pattern in [
                "/marketplace/item/", "/commerce/", "marketplace",
                "/groups/", "/buy_sell/",
            ]):
                if "/login" not in href and "/help" not in href:
                    marketplace_links.append(link)

        all_links = list(links) + marketplace_links

        seen_urls = set()
        for link in all_links:
            try:
                href = link.get("href", "")
                if not href or href in seen_urls:
                    continue
                seen_urls.add(href)

                if not href.startswith("http"):
                    href = f"https://mbasic.facebook.com{href}"

                clean_url = self._clean_fb_url(href)

                text = link.get_text(strip=True)
                if not text or len(text) < 3:
                    parent = link.parent
                    if parent:
                        text = parent.get_text(strip=True)

                if not text or len(text) < 3:
                    continue

                title, price = self._extract_title_price(text)
                if not title:
                    continue

                img_el = link.select_one("img") or (link.parent and link.parent.select_one("img"))
                image_url = ""
                if img_el:
                    image_url = img_el.get("src", "") or img_el.get("data-src", "")

                results.append(Listing(
                    title=title,
                    price=price,
                    url=clean_url,
                    location=self.location.get("name", "Australia"),
                    marketplace=self.name,
                    image_url=image_url,
                ))
            except Exception as e:
                logger.debug(f"[{self.name}] mbasic parse error: {e}")

        return results

    def _parse_modern_fb(self, soup: BeautifulSoup) -> list[Listing]:
        """Parse modern Facebook (m.facebook.com / www.facebook.com) marketplace results."""
        results = []

        for link in soup.select("a[href*='/marketplace/item/']"):
            try:
                href = link.get("href", "")
                if not href.startswith("http"):
                    href = f"https://www.facebook.com{href}"

                clean_url = self._clean_fb_url(href)

                text_parts = [el.get_text(strip=True) for el in link.select("span, div")]
                if not text_parts:
                    text_parts = [link.get_text(strip=True)]

                title = ""
                price = "See listing"
                for part in text_parts:
                    if not part:
                        continue
                    if re.match(r'^[\$A-Z]?\$?\d', part) or "free" in part.lower():
                        price = part
                    elif len(part) > 3 and not title:
                        title = part

                if not title:
                    title = " ".join(text_parts)[:100]

                if not title or len(title) < 3:
                    continue

                img_el = link.select_one("img")
                image_url = img_el.get("src", "") if img_el else ""

                results.append(Listing(
                    title=title,
                    price=price,
                    url=clean_url,
                    location=self.location.get("name", "Australia"),
                    marketplace=self.name,
                    image_url=image_url,
                ))
            except Exception as e:
                logger.debug(f"[{self.name}] modern FB parse error: {e}")

        return results

    def _parse_generic_fb(self, soup: BeautifulSoup) -> list[Listing]:
        """Fallback parser that looks for any listing-like elements."""
        results = []

        for link in soup.select("a[href]"):
            href = link.get("href", "")
            if "/marketplace/item/" not in href and "/commerce/" not in href:
                continue

            text = link.get_text(strip=True)
            if len(text) < 5:
                parent = link.parent
                if parent:
                    text = parent.get_text(strip=True)
            if len(text) < 5:
                continue

            if not href.startswith("http"):
                href = f"https://www.facebook.com{href}"

            title, price = self._extract_title_price(text)
            if not title:
                continue

            img_el = link.select_one("img")
            image_url = img_el.get("src", "") if img_el else ""

            results.append(Listing(
                title=title,
                price=price,
                url=self._clean_fb_url(href),
                location=self.location.get("name", "Australia"),
                marketplace=self.name,
                image_url=image_url,
            ))

        return results

    def _parse_marketplace_json(self, html: str, term: str) -> list[Listing]:
        """Try to extract listing data from embedded JSON in the HTML."""
        results = []

        json_patterns = [
            r'"marketplace_search":\s*(\{[^}]{100,})',
            r'"edges":\s*(\[[^\]]{100,}\])',
            r'"marketplace_listing_title":"([^"]+)".*?"listing_price":\{[^}]*"amount":"?(\d+\.?\d*)',
        ]

        for pattern in json_patterns:
            for match in re.finditer(pattern, html):
                try:
                    if pattern == json_patterns[2]:
                        title = match.group(1)
                        price = f"${match.group(2)}"
                        results.append(Listing(
                            title=title,
                            price=price,
                            url=f"https://www.facebook.com/marketplace/",
                            location=self.location.get("name", "Australia"),
                            marketplace=self.name,
                        ))
                        continue

                    data = json.loads(match.group(1))
                    if isinstance(data, list):
                        for edge in data:
                            node = edge.get("node", edge)
                            listing = node.get("listing", node)
                            title = (listing.get("marketplace_listing_title", "")
                                     or listing.get("name", ""))
                            if not title:
                                continue
                            price_info = listing.get("listing_price", {})
                            price = "See listing"
                            if isinstance(price_info, dict):
                                amount = price_info.get("amount", "")
                                currency = price_info.get("currency", "AUD")
                                if amount:
                                    price = f"${amount} {currency}"
                            elif isinstance(price_info, str):
                                price = price_info

                            item_id = listing.get("id", "")
                            item_url = f"https://www.facebook.com/marketplace/item/{item_id}/" if item_id else ""

                            img = ""
                            images = listing.get("primary_listing_photo", {})
                            if isinstance(images, dict):
                                img = images.get("image", {}).get("uri", "")
                            elif listing.get("image"):
                                img_val = listing["image"]
                                img = img_val.get("uri", str(img_val)) if isinstance(img_val, dict) else str(img_val)

                            results.append(Listing(
                                title=title, price=price, url=item_url,
                                location=self.location.get("name", "Australia"),
                                marketplace=self.name, image_url=img,
                            ))
                except (json.JSONDecodeError, KeyError, IndexError):
                    continue

        if results:
            logger.info(f"[{self.name}] Extracted {len(results)} from embedded JSON for '{term}'")
        return results

    def _scrape_playwright(self) -> list[Listing]:
        """Use Playwright browser with saved cookies to scrape marketplace."""
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

                if self._cookies:
                    cookie_list = []
                    for name, value in self._cookies.items():
                        cookie_list.append({
                            "name": name,
                            "value": str(value),
                            "domain": ".facebook.com",
                            "path": "/",
                        })
                    context.add_cookies(cookie_list)

                page = context.new_page()

                for term in self.search_terms:
                    try:
                        encoded = quote_plus(term)
                        url = f"https://www.facebook.com/marketplace/search/?query={encoded}"
                        page.goto(url, wait_until="domcontentloaded", timeout=20000)
                        page.wait_for_timeout(4000)

                        html = page.content()
                        if "login" in page.url.lower() and "marketplace" not in page.url.lower():
                            logger.debug(f"[{self.name}] Playwright redirected to login")
                            break

                        results = self._parse_modern_fb(BeautifulSoup(html, HTML_PARSER))
                        if not results:
                            results = self._parse_marketplace_json(html, term)
                        all_listings.extend(results)

                        page.wait_for_timeout(2000)
                    except Exception as e:
                        logger.error(f"[{self.name}] Playwright error for '{term}': {e}")

                browser.close()
        except Exception as e:
            logger.error(f"[{self.name}] Playwright browser error: {e}")

        return all_listings

    def _scan_search_engine_fallback(self) -> list[Listing]:
        all_results = []
        for i in range(0, len(self.search_terms), 4):
            chunk = self.search_terms[i:i + 4]
            or_query = " OR ".join(f'"{t}"' for t in chunk)
            results = site_search("facebook.com/marketplace", or_query)
            for r in results:
                if "/login" in r.url or "/help" in r.url:
                    continue
                price = "See listing"
                price_match = re.search(r'\$[\d,.]+', f"{r.title} {r.snippet}")
                if price_match:
                    price = price_match.group(0)
                all_results.append(Listing(
                    title=r.title, price=price, url=r.url,
                    location=self.location.get("name", "Australia"),
                    marketplace=self.name,
                    description=r.snippet, image_url=r.image_url,
                ))
        if all_results:
            logger.info(f"[{self.name}] Search engines found {len(all_results)} results")
        return all_results

    def _search_engine_term(self, term: str) -> list[Listing]:
        results = site_search("facebook.com/marketplace", term)
        listings = []
        for r in results:
            if "/login" in r.url or "/help" in r.url:
                continue
            price = "See listing"
            price_match = re.search(r'\$[\d,.]+', f"{r.title} {r.snippet}")
            if price_match:
                price = price_match.group(0)
            listings.append(Listing(
                title=r.title, price=price, url=r.url,
                location=self.location.get("name", "Australia"),
                marketplace=self.name,
                description=r.snippet, image_url=r.image_url,
            ))
        return listings

    def _generate_login_prompt(self) -> list[Listing]:
        """Return a single listing prompting the user to log in."""
        return [Listing(
            title="Facebook Login Required",
            price="Log in to search",
            url="#fb-login",
            location="",
            marketplace=self.name,
            description=(
                "Log in with your Facebook account to search Marketplace. "
                "Click the Facebook Login button in the header."
            ),
        )]

    def _generate_direct_links(self) -> list[Listing]:
        links = []
        for term in self.search_terms[:3]:
            encoded = quote_plus(term)
            url = f"https://www.facebook.com/marketplace/search/?query={encoded}"
            links.append(Listing(
                title=f"FB Marketplace: {term}",
                price="Open Facebook",
                url=url,
                location=self.location.get("name", "Australia"),
                marketplace=self.name,
                description=f"Click to search Facebook Marketplace for '{term}'",
            ))
        return links

    def _extract_title_price(self, text: str) -> tuple[str, str]:
        """Extract title and price from a combined text string."""
        price = "See listing"

        price_match = re.search(r'[\$A-Z]*\$\s*[\d,]+(?:\.\d{2})?', text)
        if price_match:
            price = price_match.group(0).strip()
            title = text.replace(price_match.group(0), "").strip()
        elif re.search(r'\bfree\b', text, re.IGNORECASE):
            price = "Free"
            title = re.sub(r'\bfree\b', '', text, flags=re.IGNORECASE).strip()
        else:
            title = text

        title = re.sub(r'\s+', ' ', title).strip(" ·-–—|,")
        if len(title) > 150:
            title = title[:150] + "..."

        return title, price

    def _clean_fb_url(self, url: str) -> str:
        """Clean Facebook URL to a canonical form."""
        item_match = re.search(r'/marketplace/item/(\d+)', url)
        if item_match:
            return f"https://www.facebook.com/marketplace/item/{item_match.group(1)}/"

        commerce_match = re.search(r'/commerce/products/(\d+)', url)
        if commerce_match:
            return f"https://www.facebook.com/commerce/products/{commerce_match.group(1)}/"

        return url.split("?")[0] if "?" in url else url
