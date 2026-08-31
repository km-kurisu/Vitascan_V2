"""
Resend email integration for reminder confirmations and lead-time reminders.
Degrades gracefully (logs + returns False) when no API key is configured.
"""
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

RESEND_URL = "https://api.resend.com/emails"


def get_resend_key() -> str | None:
    return os.getenv("RESEND_API_KEY", "").strip() or None


def get_resend_from() -> str:
    return os.getenv("RESEND_FROM", "VitaScan <onboarding@resend.dev>")


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


def _send(resend_key: str | None, to_email: str, subject: str, html: str, ics: str | None = None) -> bool:
    if not resend_key:
        logger.warning("RESEND_API_KEY not set; skipping email to %s (subject: %s)", to_email, subject)
        return False
    attachments = []
    if ics is not None:
        attachments.append(
            {
                "filename": "appointment.ics",
                "content": ics,
            }
        )
    payload = {
        "from": get_resend_from(),
        "to": [to_email],
        "subject": subject,
        "html": html.replace("\n", "<br/>"),
    }
    if attachments:
        payload["attachments"] = attachments
    try:
        response = httpx.post(url=RESEND_URL, json=payload, headers={"Authorization": f"Bearer {resend_key}"}, timeout=15)
        if response.status_code >= 400:
            logger.warning("Resend returned status %s: %s", response.status_code, response.text)
            return False
        return True
    except Exception as e:  # noqa: BLE001
        logger.warning("Resend request failed: %s", e)
        return False


def send_confirmation_email(reminder: Reminder, resend_key: str | None = None) -> bool:
    """Send the immediate confirmation email with a calendar link and .ics."""
    resend_key = resend_key or get_resend_key()
    body, link, ics = _build_email_body(reminder)
    html = (
        body
        + f"<hr/><p>If the link above does not work, copy-paste this into your browser:</p><p>{link}</p>"
    )
    subject = f"Medical Appointment Reminder: {reminder.title}"
    return _send(resend_key, reminder.email, subject, html, ics=ics)


def send_reminder_email(reminder: Reminder, resend_key: str | None = None) -> bool:
    """Send the lead-time reminder email."""
    resend_key = resend_key or get_resend_key()
    body, link, _ = _build_email_body(reminder)
    html = (
        body
        + f"<hr/><p>Calendar link: {link}</p>"
    )
    subject = f"Reminder: {reminder.title} on {_format_appointment(reminder)}"
    return _send(resend_key, reminder.email, subject, html)