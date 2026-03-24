"""Search terms and settings tabs."""

from PyQt6.QtCore import Qt
from PyQt6.QtWidgets import (
    QWidget, QVBoxLayout, QHBoxLayout, QListWidget,
    QLineEdit, QPushButton, QLabel, QSpinBox, QCheckBox,
    QGroupBox, QMessageBox,
)

from config import load_config, save_config
from scanners import ALL_SCANNERS

SEEN_FILE = "seen_listings.json"


class SearchTermsTab(QWidget):
    """Manage search terms."""

    def __init__(self, parent=None):
        super().__init__(parent)
        layout = QVBoxLayout(self)

        layout.addWidget(QLabel("Search Terms:"))

        self.term_list = QListWidget()
        self.term_list.setSelectionMode(QListWidget.SelectionMode.ExtendedSelection)
        layout.addWidget(self.term_list)

        # Add term row
        add_row = QHBoxLayout()
        self.term_input = QLineEdit()
        self.term_input.setPlaceholderText("Enter a search term...")
        self.term_input.returnPressed.connect(self._add_term)
        add_row.addWidget(self.term_input)

        add_btn = QPushButton("Add")
        add_btn.clicked.connect(self._add_term)
        add_row.addWidget(add_btn)

        remove_btn = QPushButton("Remove Selected")
        remove_btn.clicked.connect(self._remove_terms)
        add_row.addWidget(remove_btn)

        layout.addLayout(add_row)

        self._load_terms()

    def _load_terms(self):
        self.term_list.clear()
        config = load_config()
        for term in config.get("search_terms", []):
            self.term_list.addItem(term)

    def _add_term(self):
        term = self.term_input.text().strip()
        if not term:
            return

        config = load_config()
        terms = config.get("search_terms", [])
        if term not in terms:
            terms.append(term)
            config["search_terms"] = terms
            save_config(config)
            self.term_list.addItem(term)
        self.term_input.clear()

    def _remove_terms(self):
        selected = self.term_list.selectedItems()
        if not selected:
            return

        config = load_config()
        terms = config.get("search_terms", [])
        for item in selected:
            text = item.text()
            if text in terms:
                terms.remove(text)
            self.term_list.takeItem(self.term_list.row(item))

        config["search_terms"] = terms
        save_config(config)


class SettingsTab(QWidget):
    """General settings."""

    def __init__(self, parent=None):
        super().__init__(parent)
        layout = QVBoxLayout(self)

        # Scan interval
        interval_row = QHBoxLayout()
        interval_row.addWidget(QLabel("Scan interval (minutes):"))
        self.interval_spin = QSpinBox()
        self.interval_spin.setRange(1, 60)
        interval_row.addWidget(self.interval_spin)
        interval_row.addStretch()
        layout.addLayout(interval_row)

        # Alert sound
        self.alert_check = QCheckBox("Play alert sound on new listings")
        layout.addWidget(self.alert_check)

        # Enabled scanners
        scanners_group = QGroupBox("Enabled Scanners")
        scanners_layout = QVBoxLayout()
        self.scanner_checks: dict[str, QCheckBox] = {}

        # Map scanner class names to config keys
        self._scanner_keys = {}
        for cls in ALL_SCANNERS:
            key = cls.name.lower()
            cb = QCheckBox(cls.name)
            self.scanner_checks[key] = cb
            self._scanner_keys[cls.name] = key
            scanners_layout.addWidget(cb)

        scanners_group.setLayout(scanners_layout)
        layout.addWidget(scanners_group)

        # Buttons
        btn_row = QHBoxLayout()

        save_btn = QPushButton("Save Settings")
        save_btn.clicked.connect(self._save)
        btn_row.addWidget(save_btn)

        reset_btn = QPushButton("Reset Seen Listings")
        reset_btn.clicked.connect(self._reset_seen)
        btn_row.addWidget(reset_btn)

        btn_row.addStretch()
        layout.addLayout(btn_row)

        layout.addStretch()

        self._load_settings()

    def _load_settings(self):
        config = load_config()
        self.interval_spin.setValue(config.get("scan_interval_minutes", 5))
        self.alert_check.setChecked(config.get("alert_sound", True))

        enabled = config.get("enabled_scanners", [])
        for key, cb in self.scanner_checks.items():
            # Check if any enabled key is a substring of the scanner name
            cb.setChecked(any(e in key for e in enabled) if enabled else True)

    def _save(self):
        config = load_config()
        config["scan_interval_minutes"] = self.interval_spin.value()
        config["alert_sound"] = self.alert_check.isChecked()

        enabled = []
        for key, cb in self.scanner_checks.items():
            if cb.isChecked():
                enabled.append(key)
        config["enabled_scanners"] = enabled

        save_config(config)

    def _reset_seen(self):
        import os
        reply = QMessageBox.question(
            self,
            "Reset Seen Listings",
            "This will re-alert on all previously found listings.\nAre you sure?",
            QMessageBox.StandardButton.Yes | QMessageBox.StandardButton.No,
        )
        if reply == QMessageBox.StandardButton.Yes:
            if os.path.exists(SEEN_FILE):
                os.remove(SEEN_FILE)
            QMessageBox.information(self, "Done", "Seen listings have been reset.")
