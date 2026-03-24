"""System tray icon and notifications."""

from PyQt6.QtCore import QUrl
from PyQt6.QtGui import QDesktopServices, QIcon
from PyQt6.QtWidgets import QSystemTrayIcon, QMenu, QStyle, QApplication

from scanners.base import Listing


class TrayManager:
    """Manages the system tray icon, context menu, and toast notifications."""

    def __init__(self, main_window):
        self.window = main_window
        self._last_url = ""

        # Create tray icon using a built-in icon
        style = QApplication.instance().style()
        icon = style.standardIcon(QStyle.StandardPixmap.SP_ComputerIcon)

        self.tray = QSystemTrayIcon(icon, main_window)
        self.tray.setToolTip("Marketplace Scanner")

        # Context menu
        menu = QMenu()

        self.show_action = menu.addAction("Show Window")
        self.show_action.triggered.connect(self._toggle_window)

        menu.addSeparator()

        self.scan_now_action = menu.addAction("Scan Now")
        self.pause_action = menu.addAction("Pause")

        menu.addSeparator()

        quit_action = menu.addAction("Quit")
        quit_action.triggered.connect(QApplication.instance().quit)

        self.tray.setContextMenu(menu)
        self.tray.activated.connect(self._on_activated)
        self.tray.messageClicked.connect(self._on_message_clicked)
        self.tray.show()

    def _toggle_window(self):
        if self.window.isVisible():
            self.window.hide()
            self.show_action.setText("Show Window")
        else:
            self.window.show()
            self.window.activateWindow()
            self.show_action.setText("Hide Window")

    def _on_activated(self, reason):
        if reason == QSystemTrayIcon.ActivationReason.Trigger:
            self._toggle_window()

    def _on_message_clicked(self):
        if self._last_url:
            QDesktopServices.openUrl(QUrl(self._last_url))

    def show_new_listing_notification(self, listings: list[Listing]):
        """Show a toast notification for new listings."""
        if not listings:
            return

        if len(listings) == 1:
            listing = listings[0]
            self._last_url = listing.url
            self.tray.showMessage(
                f"New: {listing.marketplace}",
                f"{listing.title}\n{listing.price}",
                QSystemTrayIcon.MessageIcon.Information,
                5000,
            )
        else:
            self._last_url = listings[0].url
            self.tray.showMessage(
                "New Listings Found!",
                f"{len(listings)} new listings detected.\nClick to view the first one.",
                QSystemTrayIcon.MessageIcon.Information,
                5000,
            )

    def set_scanning(self, scanning: bool):
        """Update tray tooltip for scanning state."""
        if scanning:
            self.tray.setToolTip("Marketplace Scanner - Scanning")
        else:
            self.tray.setToolTip("Marketplace Scanner - Stopped")
