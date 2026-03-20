"""Configuration and search term management."""

import json
import os

DEFAULT_CONFIG = {
    "scan_interval_minutes": 5,
    "search_terms": [
        "fluke tester",
        "fluke multimeter",
        "fluke meter",
        "fluke 117",
        "fluke 115",
        "fluke 116",
        "fluke 175",
        "fluke 177",
        "fluke 179",
        "fluke 87",
        "fluke 87V",
        "fluke 289",
        "fluke 287",
        "fluke 376",
        "fluke 381",
        "fluke t5",
        "fluke t6",
        "fluke 1587",
        "fluke 1577",
        "fluke insulation tester",
        "fluke clamp meter",
        "fluke network tester",
        "fluke cable tester",
    ],
    "enabled_scanners": [
        "gumtree",
        "ebay",
        "cashconverters",
        "facebook",
        "tradingpost",
        "other",
    ],
    "alert_sound": True,
}

CONFIG_FILE = "scanner_config.json"


def load_config() -> dict:
    """Load config from file or return defaults."""
    if os.path.exists(CONFIG_FILE):
        with open(CONFIG_FILE) as f:
            user_config = json.load(f)
            merged = {**DEFAULT_CONFIG, **user_config}
            return merged
    return DEFAULT_CONFIG.copy()


def save_config(config: dict):
    """Save config to file."""
    with open(CONFIG_FILE, "w") as f:
        json.dump(config, f, indent=2)
