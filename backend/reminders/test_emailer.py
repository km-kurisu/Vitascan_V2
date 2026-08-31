import os
import sys
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..")))

from datetime import datetime, timezone
from unittest.mock import patch

from backend.reminders.schemas import Reminder
from backend.reminders import emailer


def make_reminder(**overrides):
    base = {
        "id": "uuid-1",
        "patient_id": "PAT-1",
        "email": "a@b.com",
        "title": "Checkup",
        "appointment_at": datetime(2026, 9, 15, 10, 30, tzinfo=timezone.utc),
        "lead_minutes": 60,
    }
    base.update(overrides)
    return Reminder(**base)


def test_send_confirmation_email_without_key_returns_false_and_logs():
    r = make_reminder()
    with patch.object(emailer, "logger") as mock_logger:
        result = emailer.send_confirmation_email(r, resend_key=None)
    assert result is False
    mock_logger.warning.assert_called()


def test_send_confirmation_email_posts_to_resend():
    r = make_reminder()
    with patch("backend.reminders.emailer.httpx.post") as mock_post:
        mock_post.return_value.status_code = 200
        result = emailer.send_confirmation_email(r, resend_key="re_abc")
    assert result is True
    _, kwargs = mock_post.call_args
    assert kwargs["url"] == emailer.RESEND_URL
    headers = kwargs["headers"]
    assert headers["Authorization"] == "Bearer re_abc"


def test_send_reminder_email_posts_to_resend():
    r = make_reminder()
    with patch("backend.reminders.emailer.httpx.post") as mock_post:
        mock_post.return_value.status_code = 200
        result = emailer.send_reminder_email(r, resend_key="re_abc")
    assert result is True