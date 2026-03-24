"""Background scan worker thread."""

import json
import logging
import os
import random
import time
import threading

from PyQt6.QtCore import QThread, pyqtSignal

from config import load_config
from notifications.notifier import Notifier
from scanners import ALL_SCANNERS
from scanners.base import Listing

logger = logging.getLogger(__name__)

SEEN_FILE = "seen_listings.json"


def _load_seen() -> set:
    if os.path.exists(SEEN_FILE):
        with open(SEEN_FILE) as f:
            return set(json.load(f))
    return set()


def _save_seen(seen: set):
    with open(SEEN_FILE, "w") as f:
        json.dump(list(seen), f)


class ScanWorker(QThread):
    """Runs marketplace scans on a background thread."""

    scan_started = pyqtSignal()
    scanner_progress = pyqtSignal(str, int, int)  # name, found, new
    new_listings_found = pyqtSignal(list)          # list[Listing]
    scan_finished = pyqtSignal(int, int)           # total, new
    scan_error = pyqtSignal(str)
    status_message = pyqtSignal(str)

    def __init__(self, parent=None):
        super().__init__(parent)
        self._running = False
        self._paused = threading.Event()
        self._paused.set()  # not paused initially
        self._scan_now = threading.Event()

    def run(self):
        self._running = True
        seen = _load_seen()
        notifier = Notifier()

        while self._running:
            self._paused.wait()
            if not self._running:
                break

            config = load_config()
            search_terms = config.get("search_terms", [])
            enabled = config.get("enabled_scanners", [])

            self.scan_started.emit()
            self.status_message.emit("Scan in progress...")

            all_listings = []
            new_listings = []

            for idx, scanner_cls in enumerate(ALL_SCANNERS):
                if not self._running:
                    break

                # Filter by enabled scanners
                scanner_key = scanner_cls.name.lower()
                if enabled and not any(k in scanner_key for k in enabled):
                    continue

                # Stagger between scanners
                if idx > 0:
                    stagger = random.uniform(3, 8)
                    self.status_message.emit(f"Waiting {stagger:.0f}s before {scanner_cls.name}...")
                    time.sleep(stagger)

                self.status_message.emit(f"Scanning {scanner_cls.name}...")

                try:
                    scanner = scanner_cls(search_terms=search_terms)
                    listings = scanner.scan()
                    all_listings.extend(listings)

                    new_count = sum(1 for l in listings if l.listing_id not in seen)
                    self.scanner_progress.emit(scanner_cls.name, len(listings), new_count)

                except Exception as e:
                    logger.error(f"Scanner {scanner_cls.name} failed: {e}")
                    self.scan_error.emit(f"{scanner_cls.name}: {e}")

            # Collect new listings
            for listing in all_listings:
                if listing.listing_id not in seen:
                    new_listings.append(listing)
                    seen.add(listing.listing_id)
                    try:
                        notifier.notify(listing)
                    except Exception as e:
                        logger.error(f"Notification error: {e}")

            if new_listings:
                self.new_listings_found.emit(new_listings)

            _save_seen(seen)
            self.scan_finished.emit(len(all_listings), len(new_listings))

            # Interruptible sleep until next cycle
            interval = config.get("scan_interval_minutes", 5) * 60
            self.status_message.emit(f"Next scan in {interval // 60} minutes...")
            self._scan_now.clear()

            for _ in range(interval):
                if not self._running or self._scan_now.is_set():
                    break
                self._paused.wait()
                time.sleep(1)

        _save_seen(seen)

    def stop(self):
        self._running = False
        self._paused.set()      # unblock if paused
        self._scan_now.set()    # unblock if sleeping

    def pause(self):
        self._paused.clear()

    def resume(self):
        self._paused.set()

    def trigger_scan_now(self):
        self._scan_now.set()

    @property
    def is_paused(self) -> bool:
        return not self._paused.is_set()
