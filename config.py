"""Configuration and search term management."""

import json
import os

DEFAULT_CONFIG = {
    "scan_interval_minutes": 5,
    "search_terms": [
        # Primary stolen items
        "fluke 1674",
        "fluke multifunction tester",
        "fluke insulation tester",
        # Broad catches (these match many models)
        "fluke tester",
        "fluke multimeter",
        "fluke clamp meter",
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
