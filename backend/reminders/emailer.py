"""
Brevo email integration for reminder confirmations and lead-time reminders.
Degrades gracefully (logs + returns False) when no API key is configured.
"""
import base64
import logging
import os

import httpx

from backend.reminders.calendar_link import (
    appointment_end_iso,
    build_calendar_url,
    build_ics,
    to_utc_iso,
)
from backend.reminders.schemas import Reminder

logger = logging.getLogger("vitascan.reminders.emailer")

BREVO_URL = "https://api.brevo.com/v3/smtp/email"


def get_brevo_key() -> str | None:
    return os.getenv("BREVO_API_KEY", "").strip() or None


def get_brevo_from() -> str:
    return os.getenv("BREVO_FROM", "VitaScan <kamleshkmistry33@gmail.com>")


def _split_sender(value: str) -> tuple[str, str]:
    if "<" in value:
        name, email = (part.strip() for part in value.split("<", 1))
        return (name or "VitaScan"), email.rstrip(">").strip()
    return "VitaScan", value.strip()


def _format_appointment(reminder: Reminder) -> str:
    local = reminder.appointment_at.astimezone()
    return local.strftime("%A, %B %d, %Y at %I:%M %p")


def _build_email_body(reminder: Reminder) -> str:
    start_iso = to_utc_iso(reminder.appointment_at)
    end_iso = to_utc_iso(appointment_end_iso(reminder.appointment_at))
    link = build_calendar_url(reminder.title, start_iso, end_iso, reminder.notes)
    ics = build_ics(reminder.title, start_iso, end_iso, reminder.notes, uid=reminder.id)
    text = (
        f"Hi,\n\n"
        f"Your appointment '{reminder.title}' is scheduled for "
        f"{_format_appointment(reminder)}.\n\n"
        f"Add it to Google Calendar: {link}\n\n"
        f"(An .ics file is attached so you can import it into any calendar.)\n\n"
        f"Notes: {reminder.notes or 'None'}\n\n"
        f"-- VitaScan"
    )
    return text, link, ics


def _send(brevo_key: str | None, to_email: str, subject: str, html: str, ics: str | None = None) -> bool:
    if not brevo_key:
        logger.warning("BREVO_API_KEY not set; skipping email to %s (subject: %s)", to_email, subject)
        return False
    sender_name, sender_email = _split_sender(get_brevo_from())
    payload = {
        "sender": {"email": sender_email, "name": sender_name},
        "to": [{"email": to_email}],
        "subject": subject,
        "htmlContent": html.replace("\n", "<br/>"),
    }
    if ics is not None:
        payload["attachment"] = [
            {
                "content": base64.b64encode(ics.encode("utf-8")).decode("ascii"),
                "name": "appointment.ics",
            }
        ]
    try:
        response = httpx.post(url=BREVO_URL, json=payload, headers={"api-key": brevo_key}, timeout=15)
        if response.status_code >= 400:
            logger.warning("Brevo returned status %s: %s", response.status_code, response.text)
            return False
        return True
    except Exception as e:  # noqa: BLE001
        logger.warning("Brevo request failed: %s", e)
        return False


def send_confirmation_email(reminder: Reminder, brevo_key: str | None = None) -> bool:
    """Send the immediate confirmation email with a calendar link and .ics."""
    brevo_key = brevo_key or get_brevo_key()
    body, link, ics = _build_email_body(reminder)
    html = (
        body
        + f"<hr/><p>If the link above does not work, copy-paste this into your browser:</p><p>{link}</p>"
    )
    subject = f"Medical Appointment Reminder: {reminder.title}"
    return _send(brevo_key, reminder.email, subject, html, ics=ics)


def send_reminder_email(reminder: Reminder, brevo_key: str | None = None) -> bool:
    """Send the lead-time reminder email."""
    brevo_key = brevo_key or get_brevo_key()
    body, link, _ = _build_email_body(reminder)
    html = (
        body
        + f"<hr/><p>Calendar link: {link}</p>"
    )
    subject = f"Reminder: {reminder.title} on {_format_appointment(reminder)}"
    return _send(brevo_key, reminder.email, subject, html)