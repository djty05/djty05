"""Marketplace Scanner — Flask web app entry point.

Run with: python webapp.py
Then open http://localhost:5000 on your phone or desktop.
Install as a PWA on Android: Chrome menu → "Add to Home screen".
"""

import io
import json
import logging
import os
import threading
import time
import random
from datetime import datetime

import requests as http_requests
from dotenv import load_dotenv
from flask import Flask, jsonify, render_template, request, send_file, Response

from config import load_config, save_config
from notifications.notifier import Notifier
from scanners import ALL_SCANNERS
from scanners.base import Listing

load_dotenv()

# ---------------------------------------------------------------------------
# Logging
# ---------------------------------------------------------------------------
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)
logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Flask app
# ---------------------------------------------------------------------------
app = Flask(__name__)

# ---------------------------------------------------------------------------
# In-memory state (shared with background scanner thread)
# ---------------------------------------------------------------------------
SEEN_FILE = "seen_listings.json"
STATE_LOCK = threading.Lock()

state = {
    "listings": [],           # list[dict] — all current listings
    "scan_running": False,
    "scan_paused": False,
    "last_scan": None,        # ISO timestamp
    "log": [],                # recent log messages (ring buffer)
    "stats": {"total": 0, "new": 0, "scanners_ok": 0, "scanners_failed": 0},
    "current_scanner": "",    # name of scanner currently running
}

MAX_LOG = 200  # keep last N log lines


def _log(msg: str):
    with STATE_LOCK:
        state["log"].append(f"[{time.strftime('%H:%M:%S')}] {msg}")
        if len(state["log"]) > MAX_LOG:
            state["log"] = state["log"][-MAX_LOG:]
    logger.info(msg)


def _load_seen() -> set:
    if os.path.exists(SEEN_FILE):
        try:
            with open(SEEN_FILE) as f:
                return set(json.load(f))
        except Exception:
            return set()
    return set()


def _save_seen(seen: set):
    with open(SEEN_FILE, "w") as f:
        json.dump(list(seen), f)


# ---------------------------------------------------------------------------
# Background scanner thread
# ---------------------------------------------------------------------------
scan_now_event = threading.Event()
stop_event = threading.Event()


def _listing_to_dict(l: Listing, is_new: bool = False) -> dict:
    return {
        "id": l.listing_id,
        "title": l.title,
        "price": l.price,
        "url": l.url,
        "location": l.location,
        "marketplace": l.marketplace,
        "description": l.description,
        "image_url": l.image_url,
        "date_found": l.date_found.isoformat(),
        "is_new": is_new,
    }


def scanner_loop():
    """Background thread that continuously scans marketplaces."""
    try:
        _scanner_loop_inner()
    except Exception as e:
        _log(f"FATAL: Scanner thread crashed: {e}")
        logger.exception("Scanner thread crashed")


def _scanner_loop_inner():
    seen = _load_seen()
    try:
        notifier = Notifier()
    except Exception:
        notifier = None

    while not stop_event.is_set():
        if state["scan_paused"]:
            time.sleep(1)
            continue

        config = load_config()
        search_terms = config.get("search_terms", [])
        enabled = config.get("enabled_scanners", [])

        with STATE_LOCK:
            state["scan_running"] = True
        _log("--- Scan started ---")
        if enabled:
            active_scanners = [s for s in ALL_SCANNERS if s.scanner_id in enabled]
        else:
            active_scanners = list(ALL_SCANNERS)

        _log(f"Searching {len(search_terms)} terms across {len(active_scanners)} scanners")

        all_listings = []
        new_listings = []
        scanners_ok = 0
        scanners_failed = 0

        for idx, scanner_cls in enumerate(active_scanners):
            if stop_event.is_set():
                break

            if idx > 0:
                stagger = random.uniform(3, 8)
                _log(f"  Waiting {stagger:.0f}s before {scanner_cls.name}...")
                time.sleep(stagger)

            _log(f"  [{scanner_cls.name}] Scanning...")
            with STATE_LOCK:
                state["current_scanner"] = scanner_cls.name

            try:
                scanner = scanner_cls(search_terms=search_terms)
                listings = scanner.scan()
                all_listings.extend(listings)

                new_count = sum(1 for l in listings if l.listing_id not in seen)
                if listings:
                    _log(f"  [{scanner_cls.name}] Found {len(listings)} listings ({new_count} new)")
                else:
                    _log(f"  [{scanner_cls.name}] No results")
                scanners_ok += 1

            except Exception as e:
                scanners_failed += 1
                _log(f"  [{scanner_cls.name}] ERROR: {e}")
                logger.error(f"Scanner {scanner_cls.name} failed: {e}")

        # Process results
        listing_dicts = []
        for listing in all_listings:
            is_new = listing.listing_id not in seen
            listing_dicts.append(_listing_to_dict(listing, is_new))
            if is_new:
                new_listings.append(listing)
                seen.add(listing.listing_id)
                if notifier:
                    try:
                        notifier.notify(listing)
                    except Exception as e:
                        logger.error(f"Notification error: {e}")

        _save_seen(seen)

        with STATE_LOCK:
            state["listings"] = listing_dicts
            state["scan_running"] = False
            state["last_scan"] = datetime.now().isoformat()
            state["stats"] = {
                "total": len(all_listings),
                "new": len(new_listings),
                "scanners_ok": scanners_ok,
                "scanners_failed": scanners_failed,
            }

        _log(f"--- Scan complete: {len(all_listings)} total, {len(new_listings)} new ---")

        # Wait for next cycle (interruptible)
        interval = config.get("scan_interval_minutes", 5) * 60
        _log(f"Next scan in {interval // 60} minutes...")
        scan_now_event.clear()

        for _ in range(interval):
            if stop_event.is_set() or scan_now_event.is_set():
                break
            time.sleep(1)


# ---------------------------------------------------------------------------
# Image proxy — avoids CORS + caches nothing on the phone
# ---------------------------------------------------------------------------
@app.route("/api/image-proxy")
def image_proxy():
    """Proxy external listing images to avoid CORS and mixed-content issues."""
    img_url = request.args.get("url", "")
    if not img_url or not img_url.startswith("http"):
        return "", 204

    try:
        resp = http_requests.get(img_url, timeout=10, headers={
            "User-Agent": "Mozilla/5.0 (Linux; Android 14) AppleWebKit/537.36",
            "Accept": "image/*",
        })
        if resp.status_code == 200:
            content_type = resp.headers.get("Content-Type", "image/jpeg")
            return Response(resp.content, content_type=content_type,
                            headers={"Cache-Control": "public, max-age=86400"})
    except Exception:
        pass
    return "", 204


# ---------------------------------------------------------------------------
# API routes
# ---------------------------------------------------------------------------
@app.route("/api/listings")
def api_listings():
    """Return current listings, optionally filtered."""
    marketplace = request.args.get("marketplace", "").lower()
    search = request.args.get("search", "").lower()
    sort = request.args.get("sort", "date")
    new_only = request.args.get("new_only", "false") == "true"

    with STATE_LOCK:
        listings = list(state["listings"])

    if marketplace:
        listings = [l for l in listings if marketplace in l["marketplace"].lower()]
    if search:
        listings = [l for l in listings
                    if search in l["title"].lower() or search in l.get("description", "").lower()]
    if new_only:
        listings = [l for l in listings if l.get("is_new")]

    if sort == "price":
        import re
        def parse_price(l):
            m = re.search(r'[\d,.]+', l.get("price", "0"))
            try:
                return float(m.group(0).replace(",", "")) if m else 99999
            except ValueError:
                return 99999
        listings.sort(key=parse_price)
    elif sort == "marketplace":
        listings.sort(key=lambda l: l["marketplace"])
    else:  # date (newest first)
        listings.sort(key=lambda l: l["date_found"], reverse=True)

    return jsonify({"listings": listings, "total": len(listings)})


@app.route("/api/status")
def api_status():
    with STATE_LOCK:
        return jsonify({
            "scan_running": state["scan_running"],
            "scan_paused": state["scan_paused"],
            "last_scan": state["last_scan"],
            "stats": state["stats"],
            "listing_count": len(state["listings"]),
            "current_scanner": state.get("current_scanner", ""),
        })


@app.route("/api/log")
def api_log():
    with STATE_LOCK:
        return jsonify({"log": state["log"]})


@app.route("/api/scan-now", methods=["POST"])
def api_scan_now():
    if state["scan_paused"]:
        state["scan_paused"] = False
    scan_now_event.set()
    return jsonify({"ok": True, "was_paused": False})


@app.route("/api/pause", methods=["POST"])
def api_pause():
    state["scan_paused"] = not state["scan_paused"]
    return jsonify({"paused": state["scan_paused"]})


@app.route("/api/config", methods=["GET"])
def api_get_config():
    return jsonify(load_config())


@app.route("/api/config", methods=["POST"])
def api_save_config():
    data = request.get_json(force=True)
    config = load_config()
    config.update(data)
    save_config(config)
    return jsonify({"ok": True})


@app.route("/api/marketplaces")
def api_marketplaces():
    """Return list of available marketplace scanners."""
    return jsonify([{"name": s.name, "key": s.name.lower()} for s in ALL_SCANNERS])


@app.route("/api/manual-search", methods=["POST"])
def api_manual_search():
    """Fallback non-streaming search. JSON body: { query, marketplace?, location? }"""
    data = request.get_json(force=True)
    query = data.get("query", "").strip()
    marketplace = data.get("marketplace", "").strip()
    location = data.get("location", "").strip()
    if not query:
        return jsonify({"listings": [], "total": 0, "error": "No query provided"})

    from concurrent.futures import ThreadPoolExecutor, as_completed

    if marketplace:
        scanners_to_use = [s for s in ALL_SCANNERS if s.scanner_id == marketplace]
        if not scanners_to_use:
            scanners_to_use = list(ALL_SCANNERS)
    else:
        scanners_to_use = list(ALL_SCANNERS)

    _log(f"[Manual Search] q='{query}' marketplace={marketplace or 'all'} location={location or 'all'}")

    def search_one(scanner_cls):
        try:
            scanner = scanner_cls(search_terms=[query])
            if hasattr(scanner, 'search_open'):
                listings = scanner.search_open(query)
            elif hasattr(scanner, 'scan') and 'quick' in scanner.scan.__code__.co_varnames:
                listings = scanner.scan(quick=True)
            else:
                listings = scanner.scan()
            if location:
                loc_lower = location.lower()
                listings = [l for l in listings if l.location and loc_lower in l.location.lower()]
            return scanner_cls.scanner_id, scanner_cls.name, listings
        except Exception as e:
            return scanner_cls.scanner_id, scanner_cls.name, e

    # Longer timeout for single-marketplace (e.g. Facebook does multiple Google searches)
    timeout = 120 if len(scanners_to_use) == 1 else 60

    results = []
    errors = []
    with ThreadPoolExecutor(max_workers=min(len(scanners_to_use), 6)) as pool:
        futures = {pool.submit(search_one, cls): cls for cls in scanners_to_use}
        for future in as_completed(futures, timeout=timeout):
            try:
                scanner_id, name, result = future.result(timeout=5)
                if isinstance(result, Exception):
                    errors.append(f"{name}: {result}")
                    _log(f"[Manual Search] {name} error: {result}")
                else:
                    for listing in result:
                        results.append(_listing_to_dict(listing, is_new=False))
                    _log(f"[Manual Search] {name}: {len(result)} results")
            except Exception as e:
                _log(f"[Manual Search] Scanner timed out: {e}")

    _log(f"[Manual Search] Total: {len(results)} results for '{query}'")
    resp = {"listings": results, "total": len(results)}
    if errors and not results:
        resp["error"] = f"All scanners failed: {'; '.join(errors)}"
    return jsonify(resp)


@app.route("/api/stream-search")
def stream_search():
    """SSE endpoint — streams search results as each scanner finishes.

    Query params:
      q          - search query (required)
      marketplace - scanner_id to limit to one marketplace (optional)
      location   - city name to filter results by (optional)
    """
    query = request.args.get("q", "").strip()
    marketplace = request.args.get("marketplace", "").strip()
    location = request.args.get("location", "").strip()

    if not query:
        return Response("data: {\"done\":true,\"error\":\"No query\"}\n\n",
                        content_type="text/event-stream")

    from concurrent.futures import ThreadPoolExecutor, as_completed

    # Filter scanners by marketplace selection
    if marketplace:
        scanners_to_use = [s for s in ALL_SCANNERS if s.scanner_id == marketplace]
        if not scanners_to_use:
            scanners_to_use = list(ALL_SCANNERS)
    else:
        scanners_to_use = list(ALL_SCANNERS)

    mp_label = marketplace or "all"
    loc_label = location or "all AU"
    _log(f"[Stream Search] q='{query}' marketplace={mp_label} location={loc_label} ({len(scanners_to_use)} scanners)")

    def search_one(scanner_cls):
        try:
            scanner = scanner_cls(search_terms=[query])
            if hasattr(scanner, 'search_open'):
                listings = scanner.search_open(query)
            elif hasattr(scanner, 'scan') and 'quick' in scanner.scan.__code__.co_varnames:
                listings = scanner.scan(quick=True)
            else:
                listings = scanner.scan()
            if location:
                loc_lower = location.lower()
                listings = [l for l in listings
                            if l.location and loc_lower in l.location.lower()]
            return scanner_cls.scanner_id, scanner_cls.name, listings
        except Exception as e:
            return scanner_cls.scanner_id, scanner_cls.name, e

    # Longer timeout for single-marketplace searches
    search_timeout = 120 if len(scanners_to_use) == 1 else 60

    def generate():
        num = len(scanners_to_use)
        yield f"data: {json.dumps({'type':'start','scanners': num})}\n\n"

        total = 0
        with ThreadPoolExecutor(max_workers=min(num, 6)) as pool:
            futures = {pool.submit(search_one, cls): cls for cls in scanners_to_use}
            done_count = 0
            try:
                for future in as_completed(futures, timeout=search_timeout):
                    done_count += 1
                    try:
                        scanner_id, name, result = future.result(timeout=5)
                        if isinstance(result, Exception):
                            _log(f"[Stream Search] {name} error: {result}")
                            yield f"data: {json.dumps({'type':'scanner_done','scanner': name,'count': 0,'error': str(result),'progress': done_count})}\n\n"
                        else:
                            listings = [_listing_to_dict(l, is_new=False) for l in result]
                            total += len(listings)
                            _log(f"[Stream Search] {name}: {len(listings)} results")
                            yield f"data: {json.dumps({'type':'results','scanner': name,'listings': listings,'count': len(listings),'progress': done_count,'total': total})}\n\n"
                    except Exception as e:
                        yield f"data: {json.dumps({'type':'scanner_done','scanner':'unknown','count':0,'error':str(e),'progress': done_count})}\n\n"
            except Exception:
                pass

        yield f"data: {json.dumps({'type':'done','total': total})}\n\n"
        _log(f"[Stream Search] Complete: {total} results for '{query}'")

    return Response(generate(), content_type="text/event-stream",
                    headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"})


@app.route("/api/reset-seen", methods=["POST"])
def api_reset_seen():
    if os.path.exists(SEEN_FILE):
        os.remove(SEEN_FILE)
    return jsonify({"ok": True})


@app.route("/api/test-scanners")
def test_scanners():
    """Diagnostic endpoint — tests each scanner with a quick search.

    Returns per-scanner status so you can see what's working.
    """
    from concurrent.futures import ThreadPoolExecutor, as_completed

    test_query = request.args.get("q", "fluke multimeter").strip()
    _log(f"[Diagnostics] Testing all scanners with '{test_query}'")

    def test_one(scanner_cls):
        start = time.time()
        try:
            scanner = scanner_cls(search_terms=[test_query])
            if hasattr(scanner, 'search_open'):
                listings = scanner.search_open(test_query)
            else:
                listings = scanner.scan(quick=True) if 'quick' in scanner.scan.__code__.co_varnames else scanner.scan()
            elapsed = round(time.time() - start, 1)
            return {
                "scanner_id": scanner_cls.scanner_id,
                "name": scanner_cls.name,
                "status": "ok" if listings else "no_results",
                "count": len(listings),
                "time_seconds": elapsed,
                "sample": listings[0].title if listings else None,
                "error": None,
            }
        except Exception as e:
            elapsed = round(time.time() - start, 1)
            return {
                "scanner_id": scanner_cls.scanner_id,
                "name": scanner_cls.name,
                "status": "error",
                "count": 0,
                "time_seconds": elapsed,
                "sample": None,
                "error": str(e),
            }

    results = []
    with ThreadPoolExecutor(max_workers=6) as pool:
        futures = {pool.submit(test_one, cls): cls for cls in ALL_SCANNERS}
        for future in as_completed(futures, timeout=180):
            try:
                result = future.result(timeout=10)
                results.append(result)
                status_icon = "OK" if result["status"] == "ok" else "FAIL"
                _log(f"[Diagnostics] {result['name']}: {status_icon} ({result['count']} results, {result['time_seconds']}s)")
            except Exception as e:
                cls = futures[future]
                results.append({
                    "scanner_id": cls.scanner_id,
                    "name": cls.name,
                    "status": "timeout",
                    "count": 0,
                    "time_seconds": 180,
                    "sample": None,
                    "error": str(e),
                })

    ok = sum(1 for r in results if r["status"] == "ok")
    _log(f"[Diagnostics] Complete: {ok}/{len(results)} scanners working")
    return jsonify({"results": results, "query": test_query})


@app.route("/api/fb-login", methods=["POST"])
def fb_login():
    """Start Facebook login flow — opens a browser for manual login."""
    from scanners.facebook import do_fb_login, has_fb_cookies
    _log("[Facebook] Starting login flow...")

    try:
        success = do_fb_login()
        if success:
            _log("[Facebook] Login successful — cookies saved!")
            return jsonify({"ok": True, "message": "Logged in! Facebook scanner will now work."})
        else:
            return jsonify({"ok": False, "message": "Login failed or timed out. Try again."})
    except Exception as e:
        _log(f"[Facebook] Login error: {e}")
        return jsonify({"ok": False, "message": f"Error: {e}. Make sure Playwright is installed: pip install playwright && playwright install chromium"})


@app.route("/api/fb-cookies", methods=["POST"])
def fb_import_cookies():
    """Import Facebook cookies manually (for cloud deployment).

    Accepts JSON body with 'cookies' key containing cookie string or array.
    You can get cookies from your browser using a cookie export extension.
    """
    from scanners.facebook import save_fb_cookies, has_fb_cookies
    import json as json_mod

    data = request.get_json()
    if not data:
        return jsonify({"ok": False, "message": "No JSON body provided"})

    cookies = data.get("cookies")
    if not cookies:
        return jsonify({"ok": False, "message": "No 'cookies' field in JSON"})

    try:
        # Accept either a list of cookie dicts or a raw cookie string
        if isinstance(cookies, str):
            # Parse "name=value; name2=value2" format
            cookie_list = []
            for pair in cookies.split(";"):
                pair = pair.strip()
                if "=" in pair:
                    name, value = pair.split("=", 1)
                    cookie_list.append({
                        "name": name.strip(),
                        "value": value.strip(),
                        "domain": ".facebook.com",
                        "path": "/",
                    })
            cookies = cookie_list

        if isinstance(cookies, list) and len(cookies) > 0:
            save_fb_cookies(cookies)
            _log(f"[Facebook] Imported {len(cookies)} cookies manually")
            return jsonify({"ok": True, "message": f"Imported {len(cookies)} cookies. Facebook scanner should work now."})
        else:
            return jsonify({"ok": False, "message": "Invalid cookies format"})
    except Exception as e:
        return jsonify({"ok": False, "message": f"Error: {e}"})


@app.route("/api/fb-status")
def fb_status():
    """Check if Facebook cookies are saved."""
    from scanners.facebook import has_fb_cookies
    return jsonify({"logged_in": has_fb_cookies()})


# ---------------------------------------------------------------------------
# Page routes
# ---------------------------------------------------------------------------
@app.route("/")
def index():
    return render_template("index.html")


@app.route("/settings")
def settings():
    return render_template("settings.html")


# ---------------------------------------------------------------------------
# PWA assets
# ---------------------------------------------------------------------------
@app.route("/manifest.json")
def manifest():
    return send_file("static/manifest.json", mimetype="application/manifest+json")


@app.route("/sw.js")
def service_worker():
    return send_file("static/js/sw.js", mimetype="application/javascript")


# ---------------------------------------------------------------------------
# Start background scanner (works with both `python webapp.py` and gunicorn)
# ---------------------------------------------------------------------------
_scanner_started = False

def _start_scanner_once():
    global _scanner_started
    if _scanner_started:
        return
    _scanner_started = True
    scanner_thread = threading.Thread(target=scanner_loop, daemon=True)
    scanner_thread.start()
    logger.info("Background scanner thread started")

# Auto-start when imported by gunicorn
_start_scanner_once()


if __name__ == "__main__":
    port = int(os.environ.get("PORT", 5000))

    print(f"\n  Marketplace Scanner running at http://0.0.0.0:{port}")
    print(f"  Open on your phone: http://<your-ip>:{port}")
    print(f"  Install as app: Chrome menu → 'Add to Home screen'\n")

    app.run(host="0.0.0.0", port=port, debug=False)
