#!/usr/bin/env python3
"""
Australian Marketplace Scanner
Continuously scans Australian online marketplaces to find stolen Fluke testers.

Marketplaces scanned:
  - Gumtree Australia
  - eBay Australia
  - Cash Converters (online)
  - Facebook Marketplace (via Google indexing)
  - Trading Post
  - Carousell, Locanto, and other classifieds

Usage:
  python scanner.py                  # Run continuous scanner
  python scanner.py --once           # Run a single scan
  python scanner.py --add "fluke 88" # Add a search term
  python scanner.py --list           # List current search terms
  python scanner.py --interval 3     # Set scan interval (minutes)
"""

import argparse
import json
import logging
import os
import sys
import time
from datetime import datetime
from pathlib import Path

from dotenv import load_dotenv
from rich.console import Console
from rich.live import Live
from rich.panel import Panel
from rich.table import Table
from rich.text import Text

from config import load_config, save_config
from notifications.notifier import Notifier
from scanners import ALL_SCANNERS, Listing

load_dotenv()

console = Console()
logger = logging.getLogger("marketplace_scanner")

SEEN_FILE = "seen_listings.json"


def setup_logging():
    """Configure logging to both file and console."""
    logging.basicConfig(
        level=logging.INFO,
        format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
        handlers=[
            logging.FileHandler("scanner.log"),
            logging.StreamHandler(),
        ],
    )
    # Quieten noisy libraries
    logging.getLogger("urllib3").setLevel(logging.WARNING)
    logging.getLogger("requests").setLevel(logging.WARNING)


def load_seen() -> set:
    """Load previously seen listing IDs."""
    if os.path.exists(SEEN_FILE):
        with open(SEEN_FILE) as f:
            data = json.load(f)
            return set(data)
    return set()


def save_seen(seen: set):
    """Save seen listing IDs."""
    with open(SEEN_FILE, "w") as f:
        json.dump(list(seen), f)


def print_banner():
    """Print the app banner."""
    banner = """
 ╔══════════════════════════════════════════════════════════════╗
 ║          AUSTRALIAN MARKETPLACE SCANNER                     ║
 ║          Finding stolen Fluke testers across AU             ║
 ╠══════════════════════════════════════════════════════════════╣
 ║  Scanning: Gumtree | eBay | Cash Converters | FB Market    ║
 ║           Trading Post | Carousell | Locanto & more         ║
 ╚══════════════════════════════════════════════════════════════╝
"""
    console.print(Panel(banner, style="bold red"))


def display_listing(listing: Listing, is_new: bool = True):
    """Display a listing in a formatted panel."""
    style = "bold red on white" if is_new else "dim"
    tag = "NEW" if is_new else "SEEN"

    table = Table(show_header=False, box=None, padding=(0, 1))
    table.add_column("Field", style="bold cyan", width=14)
    table.add_column("Value")

    table.add_row("Marketplace", listing.marketplace)
    table.add_row("Title", listing.title)
    table.add_row("Price", listing.price)
    table.add_row("Location", listing.location)
    table.add_row("URL", listing.url)
    if listing.description:
        table.add_row("Description", listing.description[:200])

    console.print(Panel(
        table,
        title=f"[{tag}] {listing.marketplace}",
        border_style="red" if is_new else "dim",
    ))


def run_scan(config: dict, seen: set, notifier: Notifier) -> tuple[list[Listing], set]:
    """Run a single scan across all marketplaces."""
    all_listings = []
    new_listings = []
    search_terms = config.get("search_terms")

    console.print(f"\n[bold yellow]Starting scan at {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}[/]")
    console.print(f"[dim]Searching for {len(search_terms)} terms across {len(ALL_SCANNERS)} marketplaces...[/]")

    for scanner_cls in ALL_SCANNERS:
        scanner_name = scanner_cls.name
        try:
            console.print(f"  [cyan]Scanning {scanner_name}...[/]", end=" ")
            scanner = scanner_cls(search_terms=search_terms)
            listings = scanner.scan()
            all_listings.extend(listings)

            new_count = sum(1 for l in listings if l.listing_id not in seen)
            console.print(f"[green]{len(listings)} found ({new_count} new)[/]")

        except Exception as e:
            console.print(f"[red]Error: {e}[/]")
            logger.error(f"Scanner {scanner_name} failed: {e}")

    # Process new listings
    for listing in all_listings:
        if listing.listing_id not in seen:
            new_listings.append(listing)
            seen.add(listing.listing_id)
            display_listing(listing, is_new=True)

            # Send notifications
            try:
                notifier.notify(listing)
            except Exception as e:
                logger.error(f"Notification error: {e}")

            # Alert sound
            if config.get("alert_sound"):
                print("\a", end="", flush=True)  # terminal bell

    # Summary
    console.print(f"\n[bold]Scan complete:[/] {len(all_listings)} total, "
                  f"[bold red]{len(new_listings)} NEW[/] listings found")

    if not new_listings:
        console.print("[dim]No new listings this scan. Will check again soon...[/]")

    save_seen(seen)
    return new_listings, seen


def main():
    parser = argparse.ArgumentParser(
        description="Scan Australian marketplaces for stolen Fluke testers"
    )
    parser.add_argument(
        "--once", action="store_true",
        help="Run a single scan and exit"
    )
    parser.add_argument(
        "--add", type=str,
        help="Add a search term (e.g. --add 'fluke 88')"
    )
    parser.add_argument(
        "--remove", type=str,
        help="Remove a search term"
    )
    parser.add_argument(
        "--list", action="store_true",
        help="List current search terms"
    )
    parser.add_argument(
        "--interval", type=int,
        help="Set scan interval in minutes"
    )
    parser.add_argument(
        "--reset", action="store_true",
        help="Reset seen listings (will re-alert on all findings)"
    )

    args = parser.parse_args()
    config = load_config()

    # Handle config commands
    if args.add:
        terms = config.get("search_terms", [])
        if args.add not in terms:
            terms.append(args.add)
            config["search_terms"] = terms
            save_config(config)
            console.print(f"[green]Added search term: '{args.add}'[/]")
        else:
            console.print(f"[yellow]Term already exists: '{args.add}'[/]")
        return

    if args.remove:
        terms = config.get("search_terms", [])
        if args.remove in terms:
            terms.remove(args.remove)
            config["search_terms"] = terms
            save_config(config)
            console.print(f"[green]Removed search term: '{args.remove}'[/]")
        else:
            console.print(f"[yellow]Term not found: '{args.remove}'[/]")
        return

    if args.list:
        console.print("[bold]Current search terms:[/]")
        for term in config.get("search_terms", []):
            console.print(f"  - {term}")
        return

    if args.interval:
        config["scan_interval_minutes"] = args.interval
        save_config(config)
        console.print(f"[green]Scan interval set to {args.interval} minutes[/]")

    if args.reset:
        if os.path.exists(SEEN_FILE):
            os.remove(SEEN_FILE)
        console.print("[green]Seen listings reset[/]")

    # Setup
    setup_logging()
    print_banner()
    notifier = Notifier()
    seen = load_seen()
    interval = config.get("scan_interval_minutes", 5)

    console.print(f"[bold]Scan interval:[/] {interval} minutes")
    console.print(f"[bold]Search terms:[/] {len(config.get('search_terms', []))} configured")
    console.print(f"[bold]Seen listings:[/] {len(seen)} in database")

    # Notification channel status
    channels = []
    if os.getenv("PUSHBULLET_API_KEY"):
        channels.append("Pushbullet")
    if os.getenv("DISCORD_WEBHOOK_URL"):
        channels.append("Discord")
    if os.getenv("SMTP_USERNAME"):
        channels.append("Email")
    if channels:
        console.print(f"[bold]Notifications:[/] {', '.join(channels)}")
    else:
        console.print("[bold yellow]Notifications:[/] None configured (console only)")
        console.print("[dim]Set up .env file for push/email/Discord alerts[/]")

    console.print()

    if args.once:
        run_scan(config, seen, notifier)
        return

    # Continuous scanning loop
    console.print("[bold green]Starting continuous scan...[/]")
    console.print("[dim]Press Ctrl+C to stop[/]\n")

    scan_count = 0
    try:
        while True:
            scan_count += 1
            console.rule(f"[bold]Scan #{scan_count}")

            new_listings, seen = run_scan(config, seen, notifier)

            next_scan = datetime.now().strftime('%H:%M:%S')
            console.print(
                f"\n[dim]Next scan in {interval} minutes. "
                f"Total seen: {len(seen)} listings. "
                f"Press Ctrl+C to stop.[/]\n"
            )

            time.sleep(interval * 60)

    except KeyboardInterrupt:
        console.print("\n[bold red]Scanner stopped by user[/]")
        save_seen(seen)
        console.print(f"[dim]Saved {len(seen)} seen listings to database[/]")
        sys.exit(0)


if __name__ == "__main__":
    main()
