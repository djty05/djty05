"""Main application window."""

from PyQt6.QtCore import Qt
from PyQt6.QtWidgets import (
    QMainWindow, QTabWidget, QToolBar, QLabel, QStatusBar,
    QProgressBar, QMessageBox, QSystemTrayIcon,
)
from PyQt6.QtGui import QAction

from ui.worker import ScanWorker
from ui.listings_tab import ListingsTab
from ui.settings_tab import SearchTermsTab, SettingsTab
from ui.tray import TrayManager


class MainWindow(QMainWindow):
    def __init__(self):
        super().__init__()
        self.setWindowTitle("Marketplace Scanner")
        self.resize(1000, 600)

        self._hidden_to_tray_once = False

        # --- Tabs ---
        self.tabs = QTabWidget()
        self.listings_tab = ListingsTab()
        self.search_tab = SearchTermsTab()
        self.settings_tab = SettingsTab()

        self.tabs.addTab(self.listings_tab, "Listings")
        self.tabs.addTab(self.search_tab, "Search Terms")
        self.tabs.addTab(self.settings_tab, "Settings")

        self.setCentralWidget(self.tabs)

        # --- Toolbar ---
        toolbar = QToolBar("Controls")
        toolbar.setMovable(False)
        self.addToolBar(toolbar)

        self.start_action = QAction("Start", self)
        self.start_action.triggered.connect(self._start_scanning)
        toolbar.addAction(self.start_action)

        self.stop_action = QAction("Stop", self)
        self.stop_action.setEnabled(False)
        self.stop_action.triggered.connect(self._stop_scanning)
        toolbar.addAction(self.stop_action)

        self.pause_action = QAction("Pause", self)
        self.pause_action.setEnabled(False)
        self.pause_action.triggered.connect(self._pause_scanning)
        toolbar.addAction(self.pause_action)

        self.resume_action = QAction("Resume", self)
        self.resume_action.setEnabled(False)
        self.resume_action.triggered.connect(self._resume_scanning)
        toolbar.addAction(self.resume_action)

        toolbar.addSeparator()

        self.scan_now_action = QAction("Scan Now", self)
        self.scan_now_action.setEnabled(False)
        self.scan_now_action.triggered.connect(self._scan_now)
        toolbar.addAction(self.scan_now_action)

        # --- Status bar ---
        self.status_label = QLabel("Ready")
        self.progress_bar = QProgressBar()
        self.progress_bar.setMaximumWidth(150)
        self.progress_bar.setRange(0, 0)  # indeterminate
        self.progress_bar.hide()

        status_bar = QStatusBar()
        status_bar.addWidget(self.status_label, 1)
        status_bar.addPermanentWidget(self.progress_bar)
        self.setStatusBar(status_bar)

        # --- Worker ---
        self.worker = ScanWorker()
        self.worker.scan_started.connect(self._on_scan_started)
        self.worker.scanner_progress.connect(self._on_scanner_progress)
        self.worker.new_listings_found.connect(self.listings_tab.add_listings)
        self.worker.scan_finished.connect(self._on_scan_finished)
        self.worker.scan_error.connect(self._on_scan_error)
        self.worker.status_message.connect(self._on_status_message)
        self.worker.log_message.connect(self.listings_tab.append_log)

        # --- System tray ---
        self.tray = TrayManager(self)
        self.tray.start_action.triggered.connect(self._start_scanning)
        self.tray.stop_action.triggered.connect(self._stop_scanning)
        self.tray.pause_action.triggered.connect(self._pause_scanning)
        self.tray.resume_action.triggered.connect(self._resume_scanning)
        self.worker.new_listings_found.connect(self.tray.show_new_listing_notification)

    # --- Scanning controls ---

    def _start_scanning(self):
        if self.worker.isRunning():
            return
        self.worker.start()
        self.start_action.setEnabled(False)
        self.stop_action.setEnabled(True)
        self.pause_action.setEnabled(True)
        self.resume_action.setEnabled(False)
        self.scan_now_action.setEnabled(True)
        self.tray.set_scanning(True)
        self.setWindowTitle("Marketplace Scanner [Scanning...]")

    def _stop_scanning(self):
        self.worker.stop()
        self.worker.wait(5000)
        self.start_action.setEnabled(True)
        self.stop_action.setEnabled(False)
        self.pause_action.setEnabled(False)
        self.resume_action.setEnabled(False)
        self.scan_now_action.setEnabled(False)
        self.tray.set_scanning(False)
        self.setWindowTitle("Marketplace Scanner [Stopped]")
        self.status_label.setText("Stopped")
        self.progress_bar.hide()

    def _pause_scanning(self):
        self.worker.pause()
        self.pause_action.setEnabled(False)
        self.resume_action.setEnabled(True)
        self.tray.set_paused(True)
        self.setWindowTitle("Marketplace Scanner [Paused]")
        self.status_label.setText("Paused")

    def _resume_scanning(self):
        self.worker.resume()
        self.pause_action.setEnabled(True)
        self.resume_action.setEnabled(False)
        self.tray.set_paused(False)
        self.setWindowTitle("Marketplace Scanner [Scanning...]")

    def _scan_now(self):
        self.worker.trigger_scan_now()

    # --- Worker signal handlers ---

    def _on_scan_started(self):
        self.progress_bar.show()
        self.status_label.setText("Scan in progress...")

    def _on_scanner_progress(self, name: str, found: int, new: int):
        self.status_label.setText(f"{name}: {found} found ({new} new)")

    def _on_scan_finished(self, total: int, new: int):
        self.progress_bar.hide()
        self.status_label.setText(
            f"Scan complete: {total} total, {new} new"
        )

    def _on_scan_error(self, msg: str):
        self.status_label.setText(f"Error: {msg}")

    def _on_status_message(self, msg: str):
        self.status_label.setText(msg)

    # --- Window behaviour ---

    def closeEvent(self, event):
        """Hide to tray instead of quitting."""
        if self.tray.tray.isVisible():
            if not self._hidden_to_tray_once:
                self.tray.tray.showMessage(
                    "Marketplace Scanner",
                    "Scanner is still running in the background.\n"
                    "Right-click the tray icon to quit.",
                    QSystemTrayIcon.MessageIcon.Information,
                    3000,
                )
                self._hidden_to_tray_once = True
            self.hide()
            event.ignore()
        else:
            self.worker.stop()
            self.worker.wait(5000)
            event.accept()
