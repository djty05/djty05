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
    seen = _load_seen()
    notifier = Notifier()

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
        _log(f"Searching {len(search_terms)} terms across {len(ALL_SCANNERS)} scanners")

        all_listings = []
        new_listings = []
        scanners_ok = 0
        scanners_failed = 0

        for idx, scanner_cls in enumerate(ALL_SCANNERS):
            if stop_event.is_set():
                break

            scanner_key = scanner_cls.name.lower()
            if enabled and not any(k in scanner_key for k in enabled):
                _log(f"  [{scanner_cls.name}] Skipped (disabled)")
                continue

            if idx > 0:
                stagger = random.uniform(3, 8)
                _log(f"  Waiting {stagger:.0f}s before {scanner_cls.name}...")
                time.sleep(stagger)

            _log(f"  [{scanner_cls.name}] Scanning...")

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
        })


@app.route("/api/log")
def api_log():
    with STATE_LOCK:
        return jsonify({"log": state["log"]})


@app.route("/api/scan-now", methods=["POST"])
def api_scan_now():
    scan_now_event.set()
    return jsonify({"ok": True})


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


@app.route("/api/reset-seen", methods=["POST"])
def api_reset_seen():
    if os.path.exists(SEEN_FILE):
        os.remove(SEEN_FILE)
    return jsonify({"ok": True})


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
# Start
# ---------------------------------------------------------------------------
if __name__ == "__main__":
    # Start background scanner thread
    scanner_thread = threading.Thread(target=scanner_loop, daemon=True)
    scanner_thread.start()

    # Get port from env or default
    port = int(os.environ.get("PORT", 5000))

    print(f"\n  Marketplace Scanner running at http://0.0.0.0:{port}")
    print(f"  Open on your phone: http://<your-ip>:{port}")
    print(f"  Install as app: Chrome menu → 'Add to Home screen'\n")

    app.run(host="0.0.0.0", port=port, debug=False)
