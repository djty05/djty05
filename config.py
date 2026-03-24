"""Configuration and search term management."""

import json
import os

DEFAULT_CONFIG = {
    "scan_interval_minutes": 5,
    "search_terms": [
        # Primary target
        "fluke 1674",
        "fluke 1674 multifunction",
        "fluke 1664",
        "fluke 1663",
        "fluke 1662",
        # Common descriptions
        "fluke multifunction tester",
        "fluke installation tester",
        "fluke loop impedance tester",
        "fluke rcd tester",
        "fluke insulation tester",
        "multifunction installation tester",
        # General fluke terms
        "fluke tester",
        "fluke multimeter",
        "fluke meter",
        # Other common fluke models (may be sold alongside)
        "fluke 117",
        "fluke 115",
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
        "fluke clamp meter",
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
    else:
        merged = DEFAULT_CONFIG.copy()

    env_interval = os.environ.get("SCAN_INTERVAL_MINUTES")
    if env_interval is not None:
        try:
            merged["scan_interval_minutes"] = int(env_interval)
        except ValueError:
            pass

    return merged


def save_config(config: dict):
    """Save config to file."""
    with open(CONFIG_FILE, "w") as f:
        json.dump(config, f, indent=2)
