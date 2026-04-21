"""Flask web app for the marketplace scanner."""

import json
import logging
import os
import queue
import threading
import time
from collections import deque
from datetime import datetime

from flask import Flask, Response, jsonify, render_template, request, session

from config import load_config, save_config, is_cloud
from scanners import SCANNERS

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s %(levelname)s %(name)s: %(message)s",
)
logger = logging.getLogger(__name__)

app = Flask(__name__)
app.secret_key = os.environ.get("FLASK_SECRET_KEY", os.urandom(24).hex())

results_store = deque(maxlen=2000)
results_lock = threading.Lock()
sse_clients: list[queue.Queue] = []
sse_lock = threading.Lock()
scanner_status = {}
_daemon_started = False
_daemon_lock = threading.Lock()


def broadcast_sse(data: dict):
    msg = f"data: {json.dumps(data)}\n\n"
    dead = []
    with sse_lock:
        for q in sse_clients:
            try:
                q.put_nowait(msg)
            except queue.Full:
                dead.append(q)
        for q in dead:
            sse_clients.remove(q)


def run_scan(search_terms=None, sources=None):
    config = load_config()
    terms = search_terms or config["search_terms"]
    enabled = sources or config["enabled_scanners"]
    location = config["location"]
    fb_config = config.get("facebook", {})

    threads = []
    for sid in enabled:
        if sid not in SCANNERS:
            continue

        def _scan(scanner_id=sid):
            try:
                scanner_status[scanner_id] = "scanning"
                broadcast_sse({"type": "status", "scanner": scanner_id, "status": "scanning"})

                kwargs = {
                    "search_terms": terms,
                    "location": location,
                }
                if scanner_id == "facebook":
                    kwargs["fb_email"] = fb_config.get("email", "") or session.get("fb_email", "")
                    kwargs["fb_password"] = fb_config.get("password", "") or session.get("fb_password", "")
                    kwargs["fb_cookies"] = fb_config.get("cookies", {}) or session.get("fb_cookies", {})

                scanner = SCANNERS[scanner_id](**kwargs)
                listings = scanner.scan()

                for listing in listings:
                    listing.date_found = datetime.now().strftime("%Y-%m-%d %H:%M")
                    d = listing.to_dict()
                    with results_lock:
                        results_store.append(d)
                    broadcast_sse({"type": "result", "listing": d})

                scanner_status[scanner_id] = f"done ({len(listings)})"
                broadcast_sse({
                    "type": "status", "scanner": scanner_id,
                    "status": "done", "count": len(listings),
                })

                if scanner_id == "facebook" and hasattr(scanner, "get_cookies"):
                    cookies = scanner.get_cookies()
                    if cookies.get("c_user"):
                        config["facebook"]["cookies"] = cookies
                        save_config(config)

            except Exception as e:
                logger.error(f"Scanner {scanner_id} error: {e}")
                scanner_status[scanner_id] = f"error: {e}"
                broadcast_sse({
                    "type": "status", "scanner": scanner_id,
                    "status": "error", "error": str(e),
                })

        t = threading.Thread(target=_scan, daemon=True)
        t.start()
        threads.append(t)

    def _wait_all():
        for t in threads:
            t.join(timeout=120)
        broadcast_sse({"type": "done"})

    threading.Thread(target=_wait_all, daemon=True).start()


def run_manual_search(term: str, sources=None):
    config = load_config()
    enabled = sources or config["enabled_scanners"]
    location = config["location"]
    fb_config = config.get("facebook", {})

    threads = []
    for sid in enabled:
        if sid not in SCANNERS:
            continue

        def _search(scanner_id=sid):
            try:
                scanner_status[scanner_id] = "searching"
                broadcast_sse({"type": "status", "scanner": scanner_id, "status": "searching"})

                kwargs = {"search_terms": [], "location": location}
                if scanner_id == "facebook":
                    kwargs["fb_email"] = fb_config.get("email", "") or session.get("fb_email", "")
                    kwargs["fb_password"] = fb_config.get("password", "") or session.get("fb_password", "")
                    kwargs["fb_cookies"] = fb_config.get("cookies", {}) or session.get("fb_cookies", {})

                scanner = SCANNERS[scanner_id](**kwargs)
                listings = scanner.search_open(term)

                for listing in listings:
                    listing.date_found = datetime.now().strftime("%Y-%m-%d %H:%M")
                    d = listing.to_dict()
                    with results_lock:
                        results_store.append(d)
                    broadcast_sse({"type": "result", "listing": d})

                scanner_status[scanner_id] = f"done ({len(listings)})"
                broadcast_sse({
                    "type": "status", "scanner": scanner_id,
                    "status": "done", "count": len(listings),
                })
            except Exception as e:
                logger.error(f"Scanner {scanner_id} search error: {e}")
                scanner_status[scanner_id] = f"error: {e}"
                broadcast_sse({
                    "type": "status", "scanner": scanner_id,
                    "status": "error", "error": str(e),
                })

        t = threading.Thread(target=_search, daemon=True)
        t.start()
        threads.append(t)

    def _wait_all():
        for t in threads:
            t.join(timeout=120)
        broadcast_sse({"type": "done"})

    threading.Thread(target=_wait_all, daemon=True).start()


def start_daemon():
    global _daemon_started
    with _daemon_lock:
        if _daemon_started:
            return
        _daemon_started = True

    def _daemon():
        time.sleep(5)
        while True:
            try:
                logger.info("Daemon: starting scheduled scan")
                run_scan()
            except Exception as e:
                logger.error(f"Daemon scan error: {e}")
            config = load_config()
            interval = config.get("scan_interval_minutes", 30) * 60
            time.sleep(interval)

    t = threading.Thread(target=_daemon, daemon=True, name="scanner-daemon")
    t.start()
    logger.info("Scanner daemon started")


@app.before_request
def _ensure_daemon():
    if not is_cloud():
        start_daemon()


@app.route("/")
def index():
    config = load_config()
    return render_template("index.html", config=config)


@app.route("/api/scan", methods=["POST"])
def api_scan():
    data = request.get_json(silent=True) or {}
    terms = data.get("terms")
    sources = data.get("sources")
    run_scan(search_terms=terms, sources=sources)
    return jsonify({"status": "started"})


@app.route("/api/search", methods=["POST"])
def api_search():
    data = request.get_json(silent=True) or {}
    term = data.get("term", "").strip()
    sources = data.get("sources")
    if not term:
        return jsonify({"error": "No search term"}), 400
    run_manual_search(term, sources=sources)
    return jsonify({"status": "started", "term": term})


@app.route("/api/stream")
def api_stream():
    q = queue.Queue(maxsize=500)
    with sse_lock:
        sse_clients.append(q)

    def generate():
        try:
            while True:
                try:
                    msg = q.get(timeout=25)
                    yield msg
                except queue.Empty:
                    yield ": keepalive\n\n"
        except GeneratorExit:
            pass
        finally:
            with sse_lock:
                if q in sse_clients:
                    sse_clients.remove(q)

    return Response(
        generate(),
        mimetype="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "X-Accel-Buffering": "no",
            "Connection": "keep-alive",
        },
    )


@app.route("/api/results")
def api_results():
    with results_lock:
        items = list(results_store)
    return jsonify(items)


@app.route("/api/fb-login", methods=["POST"])
def api_fb_login():
    data = request.get_json(silent=True) or {}
    email = data.get("email", "").strip()
    password = data.get("password", "")

    if not email or not password:
        return jsonify({"success": False, "error": "Email and password required"}), 400

    from scanners.facebook import FacebookScanner

    config = load_config()
    scanner = FacebookScanner(
        search_terms=config["search_terms"],
        location=config["location"],
        fb_email=email,
        fb_password=password,
    )

    success = scanner._login_http()
    if success:
        cookies = scanner.get_cookies()
        config["facebook"]["email"] = email
        config["facebook"]["password"] = password
        config["facebook"]["cookies"] = cookies
        save_config(config)
        session["fb_email"] = email
        session["fb_password"] = password
        session["fb_cookies"] = cookies
        return jsonify({"success": True, "message": "Logged in to Facebook!"})
    else:
        return jsonify({
            "success": False,
            "error": "Login failed. Check credentials or try again. 2FA may need to be disabled.",
        })


@app.route("/api/fb-status")
def api_fb_status():
    config = load_config()
    fb = config.get("facebook", {})
    has_cookies = bool(fb.get("cookies", {}).get("c_user"))
    has_creds = bool(fb.get("email"))
    return jsonify({
        "logged_in": has_cookies,
        "has_credentials": has_creds,
        "email": fb.get("email", "")[:3] + "***" if fb.get("email") else "",
    })


@app.route("/api/config", methods=["GET"])
def api_get_config():
    config = load_config()
    safe = {
        "search_terms": config["search_terms"],
        "scan_interval_minutes": config["scan_interval_minutes"],
        "location": config["location"],
        "enabled_scanners": config["enabled_scanners"],
    }
    return jsonify(safe)


@app.route("/api/config", methods=["POST"])
def api_update_config():
    data = request.get_json(silent=True) or {}
    config = load_config()

    if "search_terms" in data:
        config["search_terms"] = [t.strip() for t in data["search_terms"] if t.strip()]
    if "location" in data:
        config["location"].update(data["location"])
    if "scan_interval_minutes" in data:
        config["scan_interval_minutes"] = max(5, int(data["scan_interval_minutes"]))
    if "enabled_scanners" in data:
        config["enabled_scanners"] = data["enabled_scanners"]

    save_config(config)
    return jsonify({"status": "saved"})


@app.route("/api/status")
def api_status():
    return jsonify({
        "scanners": scanner_status,
        "results_count": len(results_store),
        "cloud": is_cloud(),
    })


@app.route("/healthz")
def healthz():
    return "ok"


if __name__ == "__main__":
    port = int(os.environ.get("PORT", 5000))
    logger.info(f"Starting on http://localhost:{port}")
    app.run(host="0.0.0.0", port=port, debug=True, threaded=True)
