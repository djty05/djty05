"""Listings table tab."""

from PyQt6.QtCore import Qt, QUrl
from PyQt6.QtGui import QColor, QDesktopServices, QAction
from PyQt6.QtWidgets import (
    QWidget, QVBoxLayout, QTableWidget, QTableWidgetItem,
    QHeaderView, QLabel, QMenu, QApplication, QSplitter,
    QTextEdit,
)

from scanners.base import Listing

# Column definitions
COLUMNS = ["Marketplace", "Title", "Price", "Location", "Date", "URL"]
NEW_BG = QColor(255, 230, 230)  # light pink for new listings


class ListingsTab(QWidget):
    def __init__(self, parent=None):
        super().__init__(parent)
        self._listings: list[Listing] = []
        self._new_ids: set[str] = set()

        layout = QVBoxLayout(self)

        self.status_label = QLabel("No listings yet. Press Start to begin scanning.")
        layout.addWidget(self.status_label)

        splitter = QSplitter(Qt.Orientation.Vertical)

        self.table = QTableWidget(0, len(COLUMNS))
        self.table.setHorizontalHeaderLabels(COLUMNS)
        self.table.setSelectionBehavior(QTableWidget.SelectionBehavior.SelectRows)
        self.table.setEditTriggers(QTableWidget.EditTrigger.NoEditTriggers)
        self.table.setSortingEnabled(True)
        self.table.setContextMenuPolicy(Qt.ContextMenuPolicy.CustomContextMenu)

        # Resize columns
        header = self.table.horizontalHeader()
        header.setSectionResizeMode(0, QHeaderView.ResizeMode.ResizeToContents)
        header.setSectionResizeMode(1, QHeaderView.ResizeMode.Stretch)
        header.setSectionResizeMode(2, QHeaderView.ResizeMode.ResizeToContents)
        header.setSectionResizeMode(3, QHeaderView.ResizeMode.ResizeToContents)
        header.setSectionResizeMode(4, QHeaderView.ResizeMode.ResizeToContents)
        header.setSectionResizeMode(5, QHeaderView.ResizeMode.Stretch)

        self.table.doubleClicked.connect(self._on_double_click)
        self.table.customContextMenuRequested.connect(self._on_context_menu)

        splitter.addWidget(self.table)

        # Scan log panel
        self.scan_log = QTextEdit()
        self.scan_log.setReadOnly(True)
        self.scan_log.setMaximumHeight(150)
        self.scan_log.setPlaceholderText("Scan log will appear here...")
        self.scan_log.setStyleSheet("QTextEdit { font-family: Consolas, monospace; font-size: 11px; }")
        splitter.addWidget(self.scan_log)

        splitter.setStretchFactor(0, 3)
        splitter.setStretchFactor(1, 1)

        layout.addWidget(splitter)

    def append_log(self, message: str):
        """Append a message to the scan log panel."""
        self.scan_log.append(message)
        # Auto-scroll to bottom
        scrollbar = self.scan_log.verticalScrollBar()
        scrollbar.setValue(scrollbar.maximum())

    def add_listings(self, listings: list[Listing]):
        """Add new listings to the top of the table."""
        # Clear previous new highlights
        self._new_ids = {l.listing_id for l in listings}

        self.table.setSortingEnabled(False)

        for listing in reversed(listings):
            self._listings.insert(0, listing)
            self.table.insertRow(0)
            date_str = listing.date_found.strftime("%Y-%m-%d %H:%M")

            values = [
                listing.marketplace,
                listing.title,
                listing.price,
                listing.location,
                date_str,
                listing.url,
            ]

            for col, val in enumerate(values):
                item = QTableWidgetItem(val)
                item.setData(Qt.ItemDataRole.UserRole, listing)
                item.setBackground(NEW_BG)
                self.table.setItem(0, col, item)

        self.table.setSortingEnabled(True)
        self._update_status()

    def clear_listings(self):
        self._listings.clear()
        self._new_ids.clear()
        self.table.setRowCount(0)
        self._update_status()

    def _update_status(self):
        total = self.table.rowCount()
        new = len(self._new_ids)
        if total == 0:
            self.status_label.setText("No listings yet. Press Start to begin scanning.")
        else:
            self.status_label.setText(
                f"Showing {total} listings ({new} new this scan)"
            )

    def _get_listing(self, row: int) -> Listing | None:
        item = self.table.item(row, 0)
        if item:
            return item.data(Qt.ItemDataRole.UserRole)
        return None

    def _on_double_click(self, index):
        listing = self._get_listing(index.row())
        if listing and listing.url:
            QDesktopServices.openUrl(QUrl(listing.url))

    def _on_context_menu(self, pos):
        row = self.table.rowAt(pos.y())
        if row < 0:
            return

        listing = self._get_listing(row)
        if not listing:
            return

        menu = QMenu(self)

        open_action = QAction("Open in browser", self)
        open_action.triggered.connect(
            lambda: QDesktopServices.openUrl(QUrl(listing.url))
        )
        menu.addAction(open_action)

        copy_action = QAction("Copy URL", self)
        copy_action.triggered.connect(
            lambda: QApplication.clipboard().setText(listing.url)
        )
        menu.addAction(copy_action)

        menu.exec(self.table.viewport().mapToGlobal(pos))
