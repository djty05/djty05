"""Multi-channel notification system for marketplace alerts."""

import json
import logging
import os
import smtplib
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText

import requests

logger = logging.getLogger(__name__)


class Notifier:
    """Sends alerts through multiple channels when new listings are found."""

    def __init__(self):
        self.pushbullet_key = os.getenv("PUSHBULLET_API_KEY", "")
        self.discord_webhook = os.getenv("DISCORD_WEBHOOK_URL", "")
        self.discord_user_id = os.getenv("DISCORD_USER_ID", "")
        self.smtp_server = os.getenv("SMTP_SERVER", "smtp.gmail.com")
        self.smtp_port = int(os.getenv("SMTP_PORT", "587"))
        self.smtp_user = os.getenv("SMTP_USERNAME", "")
        self.smtp_pass = os.getenv("SMTP_PASSWORD", "")
        self.email_to = os.getenv("ALERT_EMAIL_TO", "")

    def notify(self, listing):
        """Send notification about a listing through all configured channels."""
        message = listing.summary()
        title = f"FOUND: {listing.title[:60]} on {listing.marketplace}"

        sent_any = False

        if self.pushbullet_key:
            try:
                self._pushbullet(title, message, listing.url)
                sent_any = True
            except Exception as e:
                logger.error(f"Pushbullet error: {e}")

        if self.discord_webhook:
            try:
                self._discord(title, message, listing.url)
                sent_any = True
            except Exception as e:
                logger.error(f"Discord error: {e}")

        if self.smtp_user and self.email_to:
            try:
                self._email(title, message, listing.url)
                sent_any = True
            except Exception as e:
                logger.error(f"Email error: {e}")

        if not sent_any:
            logger.info(
                "No notification channels configured. "
                "Set up .env for push/email/discord alerts."
            )

    def _pushbullet(self, title: str, body: str, url: str):
        """Send Pushbullet notification."""
        resp = requests.post(
            "https://api.pushbullet.com/v2/pushes",
            headers={
                "Access-Token": self.pushbullet_key,
                "Content-Type": "application/json",
            },
            json={
                "type": "link",
                "title": title,
                "body": body,
                "url": url,
            },
            timeout=10,
        )
        resp.raise_for_status()
        logger.info(f"Pushbullet notification sent: {title}")

    def _discord(self, title: str, body: str, url: str):
        """Send Discord webhook notification with user ping."""
        embed = {
            "title": title,
            "description": body,
            "url": url,
            "color": 0xFF0000,  # Red for urgency
        }
        # Mention the user so they get a ping
        content = ""
        if self.discord_user_id:
            content = f"<@{self.discord_user_id}> New listing found!"

        resp = requests.post(
            self.discord_webhook,
            json={"content": content, "embeds": [embed]},
            timeout=10,
        )
        resp.raise_for_status()
        logger.info(f"Discord notification sent: {title}")

    def _email(self, title: str, body: str, url: str):
        """Send email notification."""
        msg = MIMEMultipart()
        msg["From"] = self.smtp_user
        msg["To"] = self.email_to
        msg["Subject"] = title

        html = f"""
        <html>
        <body>
            <h2>{title}</h2>
            <pre>{body}</pre>
            <p><a href="{url}">View Listing</a></p>
        </body>
        </html>
        """
        msg.attach(MIMEText(html, "html"))

        with smtplib.SMTP(self.smtp_server, self.smtp_port) as server:
            server.starttls()
            server.login(self.smtp_user, self.smtp_pass)
            server.send_message(msg)

        logger.info(f"Email notification sent: {title}")
