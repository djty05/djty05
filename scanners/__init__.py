"""Scanner registry."""

from .ebay import EbayAUScanner
from .gumtree import GumtreeScanner
from .facebook import FacebookScanner
from .cashconverters import CashConvertersScanner
from .tradingpost import TradingPostScanner

SCANNERS = {
    "ebay": EbayAUScanner,
    "gumtree": GumtreeScanner,
    "facebook": FacebookScanner,
    "cashconverters": CashConvertersScanner,
    "tradingpost": TradingPostScanner,
}


def get_scanner(scanner_id: str, **kwargs):
    cls = SCANNERS.get(scanner_id)
    if cls is None:
        raise ValueError(f"Unknown scanner: {scanner_id}")
    return cls(**kwargs)
