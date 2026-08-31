# Reminder System Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let users create doctor's-appointment reminders that send a confirmation email (with a Google Calendar link + .ics) immediately via Resend, store them in Supabase, and send a single lazily-triggered lead-time reminder email before the appointment.

**Architecture:** A new backend `backend/reminders/` package handles calendar-link/.ics generation (pure functions, no Google API), email sending (Resend wrapper), and Supabase persistence + lazy `process_due_reminders()`. The FastAPI orchestrator exposes `POST/GET/DELETE /reminders`. The Next.js frontend gains a `/reminders` page, a nav link, and typed API helpers.

**Tech Stack:** Python / FastAPI / httpx / Supabase (existing), Pydantic (existing); Next.js 14 App Router, TypeScript, Tailwind.

**Spec:** `docs/superpowers/specs/2026-08-31-reminders-design.md`

## Global Constraints

- Lead-time options are fixed: `60` (1 hour), `120` (2 hours), `1440` (1 day).
- Calendar is delivered as a Google Calendar URL + `.ics` content — **no Google API, keys, or OAuth**.
- Reminder `status` is one of `confirmed` | `sent` (no other values).
- Email is sent immediately on create (confirmation) and once more at lead time (lazy, on API calls).
- When `RESEND_API_KEY` is unset or the send fails, log and continue without failing the request (mock-fallback pattern).
- Email address source: logged-in Clerk user's email, optionally overridden in the form.
- Backend test files live inside module directories (e.g. `backend/reminders/test_reminders.py`) and start with a `sys.path.insert(0, ...)` preamble, matching existing tests.
- All Python code follows the repo style: `from backend.<pkg>.<module> import ...` absolute imports, Pydantic models, `logging.getLogger`.

---

### Task 1: Calendar link and .ics generator

**Files:**
- Create: `backend/reminders/__init__.py`
- Create: `backend/reminders/calendar_link.py`
- Test: `backend/reminders/test_calendar_link.py`

**Interfaces:**
- Consumes: nothing.
- Produces:
  - `def build_calendar_url(title: str, start_iso: str, end_iso: str, notes: str = "") -> str` — returns a `https://calendar.google.com/calendar/render?action=TEMPLATE&...` URL.
  - `def build_ics(title: str, start_iso: str, end_iso: str, notes: str = "", uid: str = "") -> str` — returns an `.ics` payload string.
  - `def appointment_end_iso(appointment_at: datetime) -> datetime` — returns `appointment_at + 60 minutes`.
  - `def to_utc_iso(value: datetime) -> str` — returns local-naive-safe UTC `%Y%m%dT%H%M%SZ` string used by Google Calendar URLs.

- [ ] **Step 1: Write the failing tests**

```python
import os
import sys
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..")))

from datetime import datetime, timezone
from backend.reminders.calendar_link import (
    build_calendar_url,
    build_ics,
    appointment_end_iso,
    to_utc_iso,
)


def test_to_utc_iso():
    dt = datetime(2026, 9, 15, 10, 30, tzinfo=timezone.utc)
    assert to_utc_iso(dt) == "20260915T103000Z"


def test_appointment_end_iso_is_sixty_minutes_later():
    dt = datetime(2026, 9, 15, 10, 30, tzinfo=timezone.utc)
    assert appointment_end_iso(dt) == datetime(2026, 9, 15, 11, 30, tzinfo=timezone.utc)


def test_build_calendar_url_contains_template_fields():
    url = build_calendar_url(
        title="Follow-up with Dr. Rao",
        start_iso="20260915T103000Z",
        end_iso="20260915T113000Z",
        notes="Bring blood report",
    )
    assert url.startswith("https://calendar.google.com/calendar/render?action=TEMPLATE")
    assert "text=Follow-up%20with%20Dr.%20Rao" in url
    assert "dates=20260915T103000Z%2F20260915T113000Z" in url


def test_build_ics_contains_required_fields():
    ics = build_ics(
        title="Follow-up with Dr. Rao",
        start_iso="20260915T103000Z",
        end_iso="20260915T113000Z",
        notes="Bring blood report",
        uid="reminder-abc",
    )
    assert "BEGIN:VCALENDAR" in ics
    assert "BEGIN:VEVENT" in ics
    assert "SUMMARY:Follow-up with Dr. Rao" in ics
    assert "DTSTART:20260915T103000Z" in ics
    assert "DTEND:20260915T113000Z" in ics
    assert "UID:reminder-abc" in ics
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `& backend\venv\Scripts\python.exe -m pytest backend/reminders/test_calendar_link.py -v`
Expected: FAIL with `ModuleNotFoundError: No module named 'backend.reminders'`

- [ ] **Step 3: Write the implementation**

`backend/reminders/__init__.py`:
```python
```

`backend/reminders/calendar_link.py`:
```python
"""
Pure helpers that turn a reminder into a Google Calendar "Add to calendar"
URL and an .ics payload. No Google API keys or network calls required.
"""
from datetime import datetime, timedelta, timezone
from urllib.parse import quote

DEFAULT_DURATION_MINUTES = 60


def to_utc_iso(value: datetime) -> str:
    """Format a datetime as a UTC string Google Calendar links expect."""
    if value.tzinfo is None:
        value = value.replace(tzinfo=timezone.utc)
    return value.astimezone(timezone.utc).strftime("%Y%m%dT%H%M%SZ")


def appointment_end_iso(appointment_at: datetime) -> datetime:
    """Return the appointment end time (start + 60 minutes)."""
    return appointment_at + timedelta(minutes=DEFAULT_DURATION_MINUTES)


def build_calendar_url(title: str, start_iso: str, end_iso: str, notes: str = "") -> str:
    """Build a Google Calendar event-creation URL for the appointment."""
    base = "https://calendar.google.com/calendar/render"
    params = {
        "action": "TEMPLATE",
        "text": title,
        "dates": f"{start_iso}/{end_iso}",
        "details": notes,
    }
    querystring = "&".join(f"{k}={quote(str(v))}" for k, v in params.items())
    return f"{base}?{querystring}"


def build_ics(title: str, start_iso: str, end_iso: str, notes: str = "", uid: str = "") -> str:
    """Build an .ics calendar file payload for the appointment."""
    now = datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%SZ")
    lines = [
        "BEGIN:VCALENDAR",
        "VERSION:2.0",
        "PRODID:-//VitaScan//Reminders//EN",
        "BEGIN:VEVENT",
        f"UID:{uid or now}-vitascan",
        f"DTSTAMP:{now}",
        f"DTSTART:{start_iso}",
        f"DTEND:{end_iso}",
        f"SUMMARY:{title}",
        f"DESCRIPTION:{notes}" if notes else "DESCRIPTION:",
        "END:VEVENT",
        "END:VCALENDAR",
    ]
    return "\r\n".join(lines)
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `& backend\venv\Scripts\python.exe -m pytest backend/reminders/test_calendar_link.py -v`
Expected: PASS (4 passed)

- [ ] **Step 5: Commit**

```bash
git add backend/reminders/__init__.py backend/reminders/calendar_link.py backend/reminders/test_calendar_link.py
git commit -m "feat(reminders): add calendar link and ics generator"
```

---

### Task 2: Reminder schemas

**Files:**
- Create: `backend/reminders/schemas.py`
- Test: `backend/reminders/test_schemas.py`

**Interfaces:**
- Consumes: nothing.
- Produces:
  - `class ReminderCreate(BaseModel)` — fields `patient_id: str`, `email: str`, `title: str`, `notes: str = ""`, `appointment_at: datetime`, `lead_minutes: int = 1440`.
  - `class Reminder(BaseModel)` — fields `id: str`, `patient_id: str`, `email: str`, `title: str`, `notes: str = ""`, `appointment_at: datetime`, `lead_minutes: int`, `status: Literal["confirmed", "sent"] = "confirmed"`, `confirmation_sent_at: Optional[datetime] = None`, `reminder_sent_at: Optional[datetime] = None`, `calendar_link: str = ""`, `ics_content: str = ""`.

- [ ] **Step 1: Write the failing tests**

```python
import os
import sys
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..")))

from datetime import datetime, timezone
from backend.reminders.schemas import ReminderCreate, Reminder


def test_reminder_create_defaults():
    rc = ReminderCreate(
        patient_id="PAT-1",
        email="a@b.com",
        title="Checkup",
        appointment_at=datetime(2026, 9, 15, 10, 30, tzinfo=timezone.utc),
    )
    assert rc.notes == ""
    assert rc.lead_minutes == 1440


def test_reminder_defaults():
    r = Reminder(
        id="uuid-1",
        patient_id="PAT-1",
        email="a@b.com",
        title="Checkup",
        appointment_at=datetime(2026, 9, 15, 10, 30, tzinfo=timezone.utc),
        lead_minutes=60,
    )
    assert r.status == "confirmed"
    assert r.confirmation_sent_at is None
    assert r.reminder_sent_at is None
    assert r.calendar_link == ""
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `& backend\venv\Scripts\python.exe -m pytest backend/reminders/test_schemas.py -v`
Expected: FAIL with `ModuleNotFoundError`

- [ ] **Step 3: Write the implementation**

`backend/reminders/schemas.py`:
```python
"""
Pydantic models for the reminder subsystem.
"""
from datetime import datetime
from typing import Literal, Optional
from pydantic import BaseModel, Field


class ReminderCreate(BaseModel):
    patient_id: str
    email: str
    title: str
    notes: str = ""
    appointment_at: datetime
    lead_minutes: int = Field(1440, description="Minutes before appointment to send reminder")


class Reminder(BaseModel):
    id: str
    patient_id: str
    email: str
    title: str
    notes: str = ""
    appointment_at: datetime
    lead_minutes: int
    status: Literal["confirmed", "sent"] = "confirmed"
    confirmation_sent_at: Optional[datetime] = None
    reminder_sent_at: Optional[datetime] = None
    calendar_link: str = ""
    ics_content: str = ""
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `& backend\venv\Scripts\python.exe -m pytest backend/reminders/test_schemas.py -v`
Expected: PASS (2 passed)

- [ ] **Step 5: Commit**

```bash
git add backend/reminders/schemas.py backend/reminders/test_schemas.py
git commit -m "feat(reminders): add reminder schemas"
```

---

### Task 3: Resend emailer

**Files:**
- Create: `backend/reminders/emailer.py`
- Test: `backend/reminders/test_emailer.py`

**Interfaces:**
- Consumes: `build_calendar_url`, `build_ics` (Task 1); `Reminder` (Task 2).
- Produces:
  - `def get_resend_key() -> Optional[str]` — returns `os.getenv("RESEND_API_KEY")` (possibly empty).
  - `def get_resend_from() -> str` — returns `os.getenv("RESEND_FROM", "VitaScan <onboarding@resend.dev>")`.
  - `def send_confirmation_email(reminder: Reminder, resend_key: Optional[str] = None) -> bool` — sends the confirmation email with calendar link + `.ics` attachment; returns whether it was attempted-and-accepted (True) or skipped/failed (False). Logs on failure.
  - `def send_reminder_email(reminder: Reminder, resend_key: Optional[str] = None) -> bool` — sends the lead-time reminder email.
  - Both functions **must** not raise even when `resend_key` is missing — they log and return `False`.

- [ ] **Step 1: Write the failing tests**

```python
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
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `& backend\venv\Scripts\python.exe -m pytest backend/reminders/test_emailer.py -v`
Expected: FAIL with `ModuleNotFoundError`

- [ ] **Step 3: Write the implementation**

`backend/reminders/emailer.py`:
```python
"""
Resend email integration for reminder confirmations and lead-time reminders.
Degrades gracefully (logs + returns False) when no API key is configured.
"""
import os
import logging
from typing import Optional

import httpx

from backend.reminders.schemas import Reminder
from backend.reminders.calendar_link import build_calendar_url, build_ics, appointment_end_iso, to_utc_iso

logger = logging.getLogger("vitascan.reminders.emailer")

RESEND_URL = "https://api.resend.com/emails"


def get_resend_key() -> Optional[str]:
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
    return (
        f"Hi,\n\n"
        f"Your appointment '{reminder.title}' is scheduled for "
        f"{_format_appointment(reminder)}.\n\n"
        f"Add it to Google Calendar: {link}\n\n"
        f"(An .ics file is attached so you can import it into any calendar.)\n\n"
        f"Notes: {reminder.notes or 'None'}\n\n"
        f"-- VitaScan",
        link,
        ics,
    )


def _send(resend_key: Optional[str], to_email: str, subject: str, html: str, ics: Optional[str] = None) -> bool:
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
        response = httpx.post(RESEND_URL, json=payload, headers={"Authorization": f"Bearer {resend_key}"}, timeout=15)
        if response.status_code >= 400:
            logger.warning("Resend returned status %s: %s", response.status_code, response.text)
            return False
        return True
    except Exception as e:  # noqa: BLE001
        logger.warning("Resend request failed: %s", e)
        return False


def send_confirmation_email(reminder: Reminder, resend_key: Optional[str] = None) -> bool:
    """Send the immediate confirmation email with a calendar link and .ics."""
    resend_key = resend_key or get_resend_key()
    body, link, ics = _build_email_body(reminder)
    html = (
        body
        + f"<hr/><p>If the link above does not work, copy-paste this into your browser:</p><p>{link}</p>"
    )
    subject = f"Medical Appointment Reminder: {reminder.title}"
    return _send(resend_key, reminder.email, subject, html, ics=ics)


def send_reminder_email(reminder: Reminder, resend_key: Optional[str] = None) -> bool:
    """Send the lead-time reminder email."""
    resend_key = resend_key or get_resend_key()
    body, link, _ = _build_email_body(reminder)
    html = (
        body
        + f"<hr/><p>Calendar link: {link}</p>"
    )
    subject = f"Reminder: {reminder.title} on {_format_appointment(reminder)}"
    return _send(resend_key, reminder.email, subject, html)
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `& backend\venv\Scripts\python.exe -m pytest backend/reminders/test_emailer.py -v`
Expected: PASS (3 passed)

- [ ] **Step 5: Commit**

```bash
git add backend/reminders/emailer.py backend/reminders/test_emailer.py
git commit -m "feat(reminders): add resend emailer with graceful fallback"
```

---

### Task 4: Reminders service (Supabase CRUD + lazy processing)

**Files:**
- Create: `backend/reminders/reminders_service.py`
- Test: `backend/reminders/test_reminders_service.py`

**Interfaces:**
- Consumes: `ReminderCreate`, `Reminder` (Task 2); `send_confirmation_email`, `send_reminder_email` (Task 3); `build_calendar_url`, `build_ics`, `appointment_end_iso`, `to_utc_iso` (Task 1).
- Produces:
  - `def create_reminder(data: ReminderCreate) -> Reminder` — sends confirmation email, stores row (Supabase or in-memory fallback), returns a `Reminder` with `calendar_link`/`ics_content` populated.
  - `def list_reminders(patient_id: str) -> List[Reminder]` — returns the patient's reminders, each with `calendar_link`/`ics_content` computed.
  - `def delete_reminder(reminder_id: str) -> bool` — deletes a reminder row; returns whether it existed.
  - `def process_due_reminders(resend_key: Optional[str] = None) -> int` — for each stored reminder with `reminder_sent_at IS NULL` and `appointment_at - lead_minutes <= now`, send the reminder email and update `reminder_sent_at`/`status='sent'`. Returns the number of reminder emails sent.
  - `def _mock_store() -> dict` / `_mock_supabase_insert(...)` etc. are private helpers for the no-Supabase fallback — lower case, only used internally.

- [ ] **Step 1: Write the failing tests**

```python
import os
import sys
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..")))

from datetime import datetime, timedelta, timezone
from unittest.mock import patch

from backend.reminders.schemas import ReminderCreate
from backend.reminders import reminders_service


def make_create(appointment_at):
    return ReminderCreate(
        patient_id="PAT-1",
        email="a@b.com",
        title="Checkup",
        appointment_at=appointment_at,
        lead_minutes=60,
    )


def test_process_due_reminders_marks_sent(monkeypatch):
    due = datetime.now(timezone.utc) - timedelta(hours=1)
    r = reminders_service.create_reminder(make_create(due))
    assert r.status == "confirmed"

    with patch("backend.reminders.reminders_service.send_reminder_email", return_value=True) as mock_send:
        count = reminders_service.process_due_reminders(resend_key="re_abc")

    assert count == 1
    mock_send.assert_called_once()
    refetched = reminders_service.list_reminders(r.patient_id)
    assert len(refetched) == 1
    assert refetched[0].reminder_sent_at is not None
    assert refetched[0].status == "sent"


def test_process_due_reminders_skips_future(monkeypatch):
    future = datetime.now(timezone.utc) + timedelta(days=1)
    reminders_service.create_reminder(make_create(future))

    with patch("backend.reminders.reminders_service.send_reminder_email", return_value=True) as mock_send:
        count = reminders_service.process_due_reminders(resend_key="re_abc")

    assert count == 0
    mock_send.assert_not_called()


def test_create_reminder_sends_confirmation_and_returns_link(monkeypatch):
    future = datetime.now(timezone.utc) + timedelta(days=1)
    with patch("backend.reminders.reminders_service.send_confirmation_email", return_value=True):
        r = reminders_service.create_reminder(make_create(future))
    assert r.status == "confirmed"
    assert r.confirmation_sent_at is not None
    assert "calendar.google.com" in r.calendar_link
    assert "BEGIN:VCALENDAR" in r.ics_content


def test_delete_reminder_returns_exists(monkeypatch):
    future = datetime.now(timezone.utc) + timedelta(days=1)
    with patch("backend.reminders.reminders_service.send_confirmation_email", return_value=True):
        r = reminders_service.create_reminder(make_create(future))
    assert reminders_service.delete_reminder(r.id) is True
    assert reminders_service.delete_reminder(r.id) is False
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `& backend\venv\Scripts\python.exe -m pytest backend/reminders/test_reminders_service.py -v`
Expected: FAIL with `ModuleNotFoundError`

- [ ] **Step 3: Write the implementation**

`backend/reminders/reminders_service.py`:
```python
"""
CRUD + lazy due-reminder processing backed by Supabase, with an in-memory
fallback store so the feature works without Supabase credentials.
"""
import logging
import uuid
from datetime import datetime, timedelta, timezone
from typing import Dict, List, Optional

from backend.reminders.schemas import Reminder, ReminderCreate
from backend.reminders.calendar_link import build_calendar_url, build_ics, appointment_end_iso, to_utc_iso
from backend.reminders.emailer import send_confirmation_email, send_reminder_email
from backend.shared.supabase_client import get_supabase_client

logger = logging.getLogger("vitascan.reminders.service")

_IN_MEMORY: Dict[str, Reminder] = {}


def _compute_calendar_fields(r: Reminder) -> Reminder:
    start_iso = to_utc_iso(r.appointment_at)
    end_iso = to_utc_iso(appointment_end_iso(r.appointment_at))
    r.calendar_link = build_calendar_url(r.title, start_iso, end_iso, r.notes)
    r.ics_content = build_ics(r.title, start_iso, end_iso, r.notes, uid=r.id)
    return r


def _now() -> datetime:
    return datetime.now(timezone.utc)


def create_reminder(data: ReminderCreate) -> Reminder:
    reminder = Reminder(
        id=str(uuid.uuid4()),
        patient_id=data.patient_id,
        email=data.email,
        title=data.title,
        notes=data.notes,
        appointment_at=data.appointment_at,
        lead_minutes=data.lead_minutes,
    )
    _compute_calendar_fields(reminder)

    confirmed = send_confirmation_email(reminder)
    if confirmed:
        reminder.confirmation_sent_at = _now()
        reminder.status = "confirmed"

    client = get_supabase_client()
    if client is not None:
        try:
            client.table("reminders").insert(
                {
                    "id": reminder.id,
                    "patient_id": reminder.patient_id,
                    "email": reminder.email,
                    "title": reminder.title,
                    "notes": reminder.notes,
                    "appointment_at": reminder.appointment_at.isoformat(),
                    "lead_minutes": reminder.lead_minutes,
                    "status": reminder.status,
                    "confirmation_sent_at": reminder.confirmation_sent_at.isoformat() if reminder.confirmation_sent_at else None,
                    "reminder_sent_at": None,
                }
            ).execute()
        except Exception as e:  # noqa: BLE001
            logger.warning("Supabase insert reminder failed (falling back to memory): %s", e)
            _IN_MEMORY[reminder.id] = reminder
    else:
        _IN_MEMORY[reminder.id] = reminder

    return reminder


def list_reminders(patient_id: str) -> List[Reminder]:
    client = get_supabase_client()
    if client is not None:
        try:
            rows = client.table("reminders").select("*").eq("patient_id", patient_id).execute()
            return [_row_to_reminder(r) for r in rows.data]
        except Exception as e:  # noqa: BLE001
            logger.warning("Supabase select reminders failed (falling back to memory): %s", e)
    return [r for r in _IN_MEMORY.values() if r.patient_id == patient_id]


def delete_reminder(reminder_id: str) -> bool:
    client = get_supabase_client()
    if client is not None:
        try:
            res = client.table("reminders").delete().eq("id", reminder_id).execute()
            if res.data:
                return True
            return reminder_id in _IN_MEMORY
        except Exception as e:  # noqa: BLE001
            logger.warning("Supabase delete reminder failed (falling back to memory): %s", e)
    existed = reminder_id in _IN_MEMORY
    _IN_MEMORY.pop(reminder_id, None)
    return existed


def _row_to_reminder(row: Dict) -> Reminder:
    r = Reminder(
        id=row.get("id", ""),
        patient_id=row.get("patient_id", ""),
        email=row.get("email", ""),
        title=row.get("title", ""),
        notes=row.get("notes", ""),
        appointment_at=datetime.fromisoformat(row.get("appointment_at")),
        lead_minutes=int(row.get("lead_minutes", 0)),
        status=row.get("status", "confirmed"),
        confirmation_sent_at=_parse_dt(row.get("confirmation_sent_at")),
        reminder_sent_at=_parse_dt(row.get("reminder_sent_at")),
    )
    return _compute_calendar_fields(r)


def _parse_dt(value) -> Optional[datetime]:
    if not value:
        return None
    try:
        return datetime.fromisoformat(str(value).replace("Z", "+00:00"))
    except ValueError:
        return None


def process_due_reminders(resend_key: Optional[str] = None) -> int:
    """Send lead-time reminder emails for overdue reminders (run on API calls)."""
    now = _now()
    sent_count = 0
    all_reminders = _all_reminders()
    for r in all_reminders:
        if r.reminder_sent_at is not None:
            continue
        due_at = r.appointment_at - timedelta(minutes=r.lead_minutes)
        if due_at > now:
            continue
        if send_reminder_email(r, resend_key=resend_key):
            r.reminder_sent_at = now
            r.status = "sent"
            _update_reminder(r)
            sent_count += 1
    return sent_count


def _all_reminders() -> List[Reminder]:
    client = get_supabase_client()
    if client is not None:
        try:
            rows = client.table("reminders").select("*").execute()
            return [_row_to_reminder(r) for r in rows.data]
        except Exception as e:  # noqa: BLE001
            logger.warning("Supabase select all reminders failed (falling back to memory): %s", e)
    return list(_IN_MEMORY.values())


def _update_reminder(r: Reminder) -> None:
    client = get_supabase_client()
    if client is not None:
        try:
            client.table("reminders").update(
                {
                    "status": r.status,
                    "reminder_sent_at": r.reminder_sent_at.isoformat() if r.reminder_sent_at else None,
                }
            ).eq("id", r.id).execute()
            return
        except Exception as e:  # noqa: BLE001
            logger.warning("Supabase update reminder failed (falling back to memory): %s", e)
    _IN_MEMORY[r.id] = r
```

Note: make sure the file imports `timedelta` (shown above in the `from datetime import datetime, timedelta, timezone` line).

- [ ] **Step 4: Run tests to verify they pass**

Run: `& backend\venv\Scripts\python.exe -m pytest backend/reminders/test_reminders_service.py -v`
Expected: PASS (4 passed)

- [ ] **Step 5: Commit**

```bash
git add backend/reminders/reminders_service.py backend/reminders/test_reminders_service.py
git commit -m "feat(reminders): add service with supabase persistence and lazy processing"
```

---

### Task 5: Backend orchestrator endpoints + env vars

**Files:**
- Modify: `backend/run_pipeline.py` (add imports, a Pydantic request body, and three endpoints near the top of the file, before the `if __name__ == "__main__"` block)
- Modify: `backend/.env.example` (add `RESEND_API_KEY` and `RESEND_FROM`)

**Interfaces:**
- Consumes: `ReminderCreate` (Task 2), `create_reminder`, `list_reminders`, `delete_reminder`, `process_due_reminders` (Task 4).
- Produces: HTTP routes `POST /reminders`, `GET /reminders`, `DELETE /reminders/{id}` for the frontend.

- [ ] **Step 1: Add env vars to `.env.example`**

Add the following to the end of `backend/.env.example`:
```text

# Resend Email Integration
RESEND_API_KEY=your_resend_api_key_here
RESEND_FROM=VitaScan <onboarding@resend.dev>
```

- [ ] **Step 2: Add the import and endpoint code**

At the top of `backend/run_pipeline.py`, next to the other `from backend.shared...` imports, add:

```python
from datetime import datetime, timezone
from backend.reminders.schemas import ReminderCreate
from backend.reminders.reminders_service import (
    create_reminder,
    list_reminders,
    delete_reminder,
    process_due_reminders,
)
```

Then add these endpoints before the `if __name__ == "__main__":` block:

```python
@app.post("/reminders")
def create_reminder_endpoint(payload: ReminderCreate):
    """Create a reminder: sends confirmation email + stores it, then fires any due reminders."""
    if payload.appointment_at <= datetime.now(timezone.utc):
        raise HTTPException(status_code=400, detail="Appointment time must be in the future")
    reminder = create_reminder(payload)
    process_due_reminders()
    return reminder.model_dump()


@app.get("/reminders")
def list_reminders_endpoint(patient_id: str):
    """List reminders for a patient, firing any due lead-time reminder emails first."""
    process_due_reminders()
    reminders = list_reminders(patient_id)
    return [r.model_dump() for r in reminders]


@app.delete("/reminders/{reminder_id}")
def delete_reminder_endpoint(reminder_id: str):
    """Delete a reminder. Returns 404 if it did not exist."""
    if not delete_reminder(reminder_id):
        raise HTTPException(status_code=404, detail="Reminder not found")
    return {"deleted": True}
```

Also ensure `HTTPException` is imported from `fastapi` (it already is, at the top of the file).

- [ ] **Step 3: Smoke-test that the app imports**

Run: `& backend\venv\Scripts\python.exe -c "import sys; sys.path.insert(0,'.'); from backend.run_pipeline import app; print('ok')"`
Expected: prints `ok` (imports cleanly)

- [ ] **Step 4: Commit**

```bash
git add backend/run_pipeline.py backend/.env.example
git commit -m "feat(reminders): add FastAPI endpoints and env vars"
```

---

### Task 6: Frontend API helpers

**Files:**
- Create: `frontend/lib/reminders.ts`

**Interfaces:**
- Consumes: nothing new (uses existing `API_BASE` pattern from `@/lib/api`).
- Produces:
  - `interface Reminder` — mirrors the backend `Reminder` model.
  - `interface ReminderCreate` — `patient_id`, `email`, `title`, `notes`, `appointment_at` (ISO string), `lead_minutes`.
  - `const LEAD_OPTIONS: { label: string; minutes: number }[]` — `[{label:'1 hour',minutes:60},{label:'2 hours',minutes:120},{label:'1 day',minutes:1440}]`.
  - `fetchReminders(patientId: string): Promise<Reminder[]>`
  - `createReminder(payload: ReminderCreate): Promise<Reminder>`
  - `deleteReminder(id: string): Promise<void>`
  - All use `process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'` and `cache: 'no-store'`.

- [ ] **Step 1: Write the helper file**

`frontend/lib/reminders.ts`:
```typescript
export interface Reminder {
  id: string;
  patient_id: string;
  email: string;
  title: string;
  notes?: string;
  appointment_at: string;
  lead_minutes: number;
  status: 'confirmed' | 'sent';
  confirmation_sent_at?: string | null;
  reminder_sent_at?: string | null;
  calendar_link?: string;
  ics_content?: string;
}

export interface ReminderCreate {
  patient_id: string;
  email: string;
  title: string;
  notes?: string;
  appointment_at: string;
  lead_minutes: number;
}

export const LEAD_OPTIONS: { label: string; minutes: number }[] = [
  { label: '1 hour before', minutes: 60 },
  { label: '2 hours before', minutes: 120 },
  { label: '1 day before', minutes: 1440 },
];

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

export async function fetchReminders(patientId: string): Promise<Reminder[]> {
  const params = new URLSearchParams({ patient_id: patientId });
  const res = await fetch(`${API_BASE}/reminders?${params.toString()}`, {
    cache: 'no-store',
  });
  if (!res.ok) throw new Error(`Fetch reminders failed: ${res.statusText}`);
  return res.json();
}

export async function createReminder(payload: ReminderCreate): Promise<Reminder> {
  const res = await fetch(`${API_BASE}/reminders`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const detail = await res.text();
    throw new Error(detail || 'Create reminder failed');
  }
  return res.json();
}

export async function deleteReminder(id: string): Promise<void> {
  const res = await fetch(`${API_BASE}/reminders/${id}`, { method: 'DELETE' });
  if (!res.ok) throw new Error(`Delete reminder failed: ${res.statusText}`);
}
```

- [ ] **Step 2: Type-check the frontend**

Run (in `frontend`): `npm run build`
Expected: build completes without TypeScript errors.

- [ ] **Step 3: Commit**

```bash
git add frontend/lib/reminders.ts
git commit -m "feat(reminders): add frontend api helpers"
```

---

### Task 7: Frontend reminders page

**Files:**
- Create: `frontend/app/reminders/page.tsx`

**Interfaces:**
- Consumes: `fetchReminders`, `createReminder`, `deleteReminder`, `LEAD_OPTIONS`, `Reminder` (Task 6); `useUser` from `@clerk/nextjs`; `@/lib/supabase`'s `fetchPatientProfileFromSupabase`.
- Produces: the `/reminders` route UI.

- [ ] **Step 1: Write the page**

`frontend/app/reminders/page.tsx`:
```tsx
'use client';

import React, { useState, useEffect } from 'react';
import { useUser } from '@clerk/nextjs';
import { Calendar, BellRing, Trash2, Plus } from 'lucide-react';
import {
  fetchReminders,
  createReminder,
  deleteReminder,
  LEAD_OPTIONS,
  Reminder,
} from '@/lib/reminders';
import { fetchPatientProfileFromSupabase } from '@/lib/supabase';

export default function RemindersPage() {
  const { user, isLoaded } = useUser();
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [patientId, setPatientId] = useState('');
  const [email, setEmail] = useState('');
  const [title, setTitle] = useState('');
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [notes, setNotes] = useState('');
  const [leadMinutes, setLeadMinutes] = useState(1440);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (!isLoaded) return;
    const fallback = user?.primaryEmailAddress?.emailAddress || '';
    setEmail(fallback);
    if (user?.id) {
      fetchPatientProfileFromSupabase(user.id).then((profile) => {
        if (profile?.patient_id) {
          setPatientId(profile.patient_id);
          localStorage.setItem('vitascan_patient_id', profile.patient_id);
          loadReminders(profile.patient_id);
        }
      });
    }
  }, [isLoaded, user]);

  async function loadReminders(pid: string) {
    try {
      const list = await fetchReminders(pid);
      setReminders(list);
    } catch (e) {
      console.warn('Could not load reminders', e);
    }
  }

  const refresh = () => {
    if (patientId) loadReminders(patientId);
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setMessage('');
    setError('');
    try {
      const pid =
        patientId ||
        localStorage.getItem('vitascan_patient_id') ||
        `PAT-${Date.now().toString().slice(-8)}`;
      const appointmentAt = new Date(`${date}T${time}:00`);
      const r = await createReminder({
        patient_id: pid,
        email,
        title,
        notes,
        appointment_at: appointmentAt.toISOString(),
        lead_minutes: leadMinutes,
      });
      setMessage(
        `Reminder saved! Check your email for the confirmation and calendar link.`
      );
      setTitle('');
      setNotes('');
      setPatientId(pid);
      setReminders((prev) => [r, ...prev]);
    } catch (err: any) {
      setError(err?.message || 'Could not create reminder. Is the backend running?');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteReminder(id);
      setReminders((prev) => prev.filter((r) => r.id !== id));
    } catch (e) {
      console.warn('Could not delete reminder', e);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8 py-4">
      <div className="flex items-center space-x-3">
        <BellRing className="w-7 h-7 text-[#1D61E7]" />
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight">Reminders</h1>
          <p className="text-slate-500 font-medium text-sm">
            Set a reminder for your doctor's appointment and get it in your inbox + calendar.
          </p>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm font-semibold">
          {error}
        </div>
      )}
      {message && (
        <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-xl text-sm font-semibold">
          {message}
        </div>
      )}

      {/* Create form */}
      <form
        onSubmit={handleCreate}
        className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200/80 shadow-xs space-y-5"
      >
        <div className="flex items-center space-x-2 text-[#1D61E7]">
          <Plus className="w-5 h-5" />
          <h2 className="text-xl font-bold text-[#1D61E7]">New Appointment Reminder</h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <div className="space-y-1.5 md:col-span-2">
            <label className="block text-xs font-bold text-slate-700">Title</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
              placeholder="e.g. Follow-up with Dr. Rao"
              className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 text-sm text-slate-900 outline-none placeholder:text-slate-400"
            />
          </div>

          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-slate-700">Date</label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              required
              className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 text-sm text-slate-900 outline-none"
            />
          </div>

          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-slate-700">Time</label>
            <input
              type="time"
              value={time}
              onChange={(e) => setTime(e.target.value)}
              required
              className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 text-sm text-slate-900 outline-none"
            />
          </div>

          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-slate-700">Remind me</label>
            <select
              value={leadMinutes}
              onChange={(e) => setLeadMinutes(Number(e.target.value))}
              className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 text-sm text-slate-900 outline-none bg-white"
            >
              {LEAD_OPTIONS.map((opt) => (
                <option key={opt.minutes} value={opt.minutes}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-slate-700">Email (optional override)</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Recipient email"
              className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 text-sm text-slate-900 outline-none placeholder:text-slate-400"
            />
          </div>

          <div className="space-y-1.5 md:col-span-2">
            <label className="block text-xs font-bold text-slate-700">Notes (optional)</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              placeholder="e.g. Bring blood report"
              className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 text-sm text-slate-900 outline-none placeholder:text-slate-400"
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={saving}
          className="px-8 py-3.5 bg-[#1D61E7] hover:bg-blue-700 disabled:bg-slate-300 text-white font-bold rounded-xl shadow-lg shadow-blue-600/20 transition-all flex items-center space-x-2 text-sm"
        >
          <Calendar className="w-4 h-4" />
          <span>{saving ? 'Saving...' : 'Save Reminder'}</span>
        </button>
      </form>

      {/* Reminders list */}
      <div className="space-y-3">
        <h2 className="text-xl font-bold text-slate-900">Your Reminders</h2>
        {reminders.length === 0 ? (
          <p className="text-slate-500 text-sm font-medium">
            No reminders yet. Create one above.
          </p>
        ) : (
          reminders.map((r) => (
            <div
              key={r.id}
              className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex items-start justify-between gap-4"
            >
              <div className="space-y-1">
                <div className="flex items-center space-x-2">
                  <span className="font-bold text-slate-900">{r.title}</span>
                  <span
                    className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide ${
                      r.status === 'sent'
                        ? 'bg-emerald-100 text-emerald-700'
                        : 'bg-blue-100 text-blue-700'
                    }`}
                  >
                    {r.status === 'sent' ? 'Reminder sent' : 'Confirmed'}
                  </span>
                </div>
                <p className="text-sm text-slate-600">
                  {new Date(r.appointment_at).toLocaleString()}
                </p>
                {r.calendar_link && (
                  <a
                    href={r.calendar_link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center space-x-1 text-sm font-semibold text-[#1D61E7] hover:underline"
                  >
                    <Calendar className="w-4 h-4" />
                    <span>Add to Google Calendar</span>
                  </a>
                )}
              </div>
              <button
                onClick={() => handleDelete(r.id)}
                className="text-slate-400 hover:text-red-600 transition-colors"
                aria-label="Delete reminder"
              >
                <Trash2 className="w-5 h-5" />
              </button>
            </div>
          ))
        )}
        <button
          onClick={refresh}
          className="text-sm font-semibold text-[#1D61E7] hover:underline"
        >
          Refresh
        </button>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Type-check**

Run (in `frontend`): `npm run build`
Expected: build completes without TypeScript errors.

- [ ] **Step 3: Commit**

```bash
git add frontend/app/reminders/page.tsx
git commit -m "feat(reminders): add reminders page"
```

---

### Task 8: Navbar link + middleware route

**Files:**
- Modify: `frontend/components/Navbar.tsx`
- Modify: `frontend/middleware.ts`

**Interfaces:**
- Consumes: nothing.
- Produces: a "Reminders" nav link and `/reminders` allowed as a public route.

- [ ] **Step 1: Add the nav link**

In `frontend/components/Navbar.tsx`, add `{ name: 'Reminders', href: '/reminders' }` to the `navLinks` array (line ~12-16):

```tsx
  const navLinks = [
    { name: 'Home', href: '/' },
    { name: 'History', href: '/results' },
    { name: 'About', href: '/#about' },
    { name: 'Reminders', href: '/reminders' },
  ];
```

- [ ] **Step 2: Allow the route in middleware**

In `frontend/middleware.ts`, add `'/reminders(.*)'` to the `isPublicRoute` matcher array:

```ts
const isPublicRoute = createRouteMatcher([
  '/',
  '/login(.*)',
  '/register(.*)',
  '/api(.*)',
  '/_next(.*)',
  '/favicon.ico',
  '/patient-details(.*)',
  '/processing(.*)',
  '/results(.*)',
  '/upload(.*)',
  '/reminders(.*)',
]);
```

- [ ] **Step 3: Type-check**

Run (in `frontend`): `npm run build`
Expected: build completes without TypeScript errors.

- [ ] **Step 4: Commit**

```bash
git add frontend/components/Navbar.tsx frontend/middleware.ts
git commit -m "feat(reminders): add navbar link and public route"
```

---

### Task 9: Supabase table + end-to-end verification

**Files:**
- Create: `docs/supabase/supabase_reminders.sql` (new SQL you run in the Supabase SQL editor)
- Modify: nothing else

**Interfaces:**
- Consumes: the `reminders` service table writes (Task 4).
- Produces: the persisted `reminders` table used by `backend/reminders/reminders_service.py`.

- [ ] **Step 1: Write the SQL migration**

Create `docs/supabase/supabase_reminders.sql`:

```sql
create table if not exists public.reminders (
  id uuid primary key default gen_random_uuid(),
  patient_id text not null,
  email text not null,
  title text not null,
  notes text default '',
  appointment_at timestamptz not null,
  lead_minutes integer not null default 1440,
  status text not null default 'confirmed',
  confirmation_sent_at timestamptz,
  reminder_sent_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.reminders enable row level security;

create index if not exists reminders_patient_id_idx on public.reminders (patient_id);
create index if not exists reminders_reminder_sent_at_idx on public.reminders (reminder_sent_at);
```

In the Supabase SQL editor, run the script above to create the table. If you use the service-role key (backend), the backend can write to it without extra RLS policies; for anon-key reads from the frontend you would add RLS policies, but the frontend reads reminders through the backend proxy, so none are required for this flow.

- [ ] **Step 2: Verify backend tests all pass**

Run (from repo root): `& backend\venv\Scripts\python.exe -m pytest backend/reminders -v`
Expected: PASS (all reminder tests)

- [ ] **Step 3: Verify frontend builds**

Run (in `frontend`): `npm run build`
Expected: build completes without errors.

- [ ] **Step 4: Manual E2E smoke test (with backend running, RESEND_API_KEY unset)**

1. Start the backend: `& backend\venv\Scripts\python.exe backend\run_pipeline.py` (or `uvicorn run_pipeline:app`).
2. Start the frontend: `npm run dev` in `frontend`.
3. Go to `/reminders`, create a reminder with a future time.
4. Confirm the reminder appears in the list with a status badge and a working "Add to Google Calendar" link.
5. Confirm a confirmation email was NOT delivered (since `RESEND_API_KEY` is unset) but the backend logged a warning — the request still succeeded.

- [ ] **Step 5: Commit**

```bash
git add docs/supabase/supabase_reminders.sql
git commit -m "docs: add reminders table migration"
```

---

## After Implementation

- Run `ruff check backend` to lint the new Python files and fix any issues (e.g. unused imports, line length).
- Update `README.md` (optional) and `backend/.env.example` already updated in Task 5.
