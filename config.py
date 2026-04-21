"""Configuration for the marketplace scanner."""

import os
import json
from pathlib import Path

CONFIG_FILE = Path("scanner_config.json")

DEFAULT_CONFIG = {
    "search_terms": [
        "fluke 1674",
        "fluke multifunction tester",
        "fluke insulation tester",
        "fluke tester",
        "fluke multimeter",
        "fluke clamp meter",
    ],
    "scan_interval_minutes": 30,
    "location": {
        "lat": -33.8688,
        "lng": 151.2093,
        "radius_km": 50,
        "name": "Sydney, NSW",
    },
    "enabled_scanners": [
        "ebay",
        "gumtree",
        "facebook",
        "cashconverters",
        "tradingpost",
    ],
    "notifications": {
        "enabled": False,
        "pushbullet_token": "",
    },
    "facebook": {
        "email": "",
        "password": "",
        "cookies": {},
    },
}


def load_config() -> dict:
    if CONFIG_FILE.exists():
        try:
            with open(CONFIG_FILE) as f:
                saved = json.load(f)
            merged = {**DEFAULT_CONFIG, **saved}
            return merged
        except (json.JSONDecodeError, IOError):
            pass
    return DEFAULT_CONFIG.copy()


def save_config(config: dict):
    with open(CONFIG_FILE, "w") as f:
        json.dump(config, f, indent=2)


def is_cloud():
    return bool(os.environ.get("RENDER") or os.environ.get("RAILWAY")
                or os.environ.get("FLY_APP_NAME"))
