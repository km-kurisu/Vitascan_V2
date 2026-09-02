# Reminder System — Design

**Date:** 2026-08-31
**Status:** Approved (design chat)
**Scope:** Add a doctor's-appointment reminder system to VitaScan.

## Summary

Users can create an appointment reminder (title, date, time, notes). On save the
system immediately sends a confirmation email (via **Resend**) that includes a
**Google Calendar link** and an **.ics** file so the user can add the appointment
to their own calendar. No Google API, keys, or OAuth are required. The reminder is
persisted in a new Supabase `reminders` table. Later, with a lazy check (there is
no scheduler), a **lead-time reminder email** is sent once when the appointment
minus the chosen lead time has passed.

## Goals / non-goals

**Goals**
- Let the user create and list/delete appointment reminders.
- Email a confirmation (with calendar link + .ics) immediately on creation.
- Send a single lead-time reminder email before the appointment.
- Persist reminders in Supabase and reuse the existing lazy-fallback pattern so the
  app remains runnable without external keys.

**Non-goals**
- No real-time scheduler; reminders fire lazily on API calls.
- No Google Calendar API integration; calendar is delivered as a link + .ics.
- No SMS / push notifications.

## Architecture

```
frontend /reminders (form + list)
      |  POST/GET/DELETE /reminders (proxied via next.config rewrite to :8000)
      v
FastAPI orchestrator (run_pipeline.py)
      |  reminders_service.process_due_reminders()  (lazy check)
      |         |  emailer (Resend)  -> confirmation + lead-time email
      |         |  calendar_link    -> Google Calendar URL + .ics
      v
Supabase `reminders` table
```

### Components

1. **Backend module `backend/reminders/`**
   - `schemas.py` — Pydantic models for creating and returning reminders.
   - `calendar_link.py` — pure functions to build a Google Calendar event URL and
     an `.ics` payload from reminder fields. No external dependencies.
   - `emailer.py` — wraps the Resend API (`POST https://api.resend.com/emails`)
     via `httpx`. Sends the confirmation email (with calendar link + .ics
     attachment) and the lead-time reminder email. Falls back to logging when
     `RESEND_API_KEY` is unset.
   - `reminders_service.py` — Supabase CRUD (create / list / delete) and the
     `process_due_reminders()` lazy-check routine.

2. **Backend orchestrator (`run_pipeline.py`)**
   - `POST /reminders` — validates input, builds calendar link, sends
     confirmation email, stores the reminder, then runs `process_due_reminders()`.
   - `GET /reminders?patient_id=` — lists reminders for a patient.
   - `DELETE /reminders/{id}` — deletes a reminder.
   - Calls `process_due_reminders()` at the start of reminder endpoints so due
     lead-time emails fire without a scheduler.

3. **Frontend**
   - New `app/reminders/page.tsx` — create form + list of reminders.
   - New `frontend/lib/reminders.ts` — typed API helpers.
   - Add "Reminders" link to `components/Navbar.tsx`.
   - Add `/reminders` to public routes in `middleware.ts`.

## Data model — Supabase `reminders` table

| column                  | type        | notes                                    |
|-------------------------|-------------|------------------------------------------|
| `id`                    | uuid PK     | created server-side                       |
| `patient_id`            | text        | VitaScan patient id                       |
| `email`                 | text        | recipient (from Clerk or form override)   |
| `title`                 | text        | appointment title                         |
| `notes`                 | text        | optional                                 |
| `appointment_at`        | timestamptz | appointment date/time                     |
| `lead_minutes`          | int         | lead time before appointment              |
| `confirmation_sent_at`  | timestamptz | null until sent                           |
| `reminder_sent_at`      | timestamptz | null until lead-time email sent           |
| `status`                | text        | `confirmed` \| `sent`                     |
| `created_at`            | timestamptz | default now()                             |
| `updated_at`            | timestamptz | default now()                             |

`calendar_link` and the `.ics` file are computed on read/at send time, not stored.

## Reminder lifecycle

1. **Create** (`POST /reminders`): validate `appointment_at` is in the future.
   Generate calendar URL + .ics. Send **confirmation email**. Insert row with
   `status=confirmed`, `confirmation_sent_at=now()`.
2. **Lead-time**: when `appointment_at - lead_minutes <= now` and
   `reminder_sent_at IS NULL`, send the **reminder email** and set
   `reminder_sent_at=now()`, `status=sent`. This runs inside `process_due_reminders()`
   which is invoked on reminder API calls.
3. **Complete**: left for the caller to interpret (`status=sent`); no auto-cleanup.

## API

### `POST /reminders`

Request body:
```json
{
  "patient_id": "PAT-XXXX",
  "email": "user@example.com",
  "title": "Follow-up with Dr. Rao",
  "notes": "Bring blood report",
  "appointment_at": "2026-09-15T10:30:00Z",
  "lead_minutes": 1440
}
```
Response `201`:
```json
{
  "id": "uuid",
  "patient_id": "PAT-XXXX",
  "email": "user@example.com",
  "title": "Follow-up with Dr. Rao",
  "notes": "Bring blood report",
  "appointment_at": "2026-09-15T10:30:00Z",
  "lead_minutes": 1440,
  "status": "confirmed",
  "confirmation_sent_at": "2026-08-31T09:00:00Z",
  "reminder_sent_at": null,
  "calendar_link": "https://calendar.google.com/calendar/render?action=TEMPLATE&...",
  "ics_content": "BEGIN:VCALENDAR..."
}
```
Errors: `400` if `appointment_at` is in the past or validation fails.

### `GET /reminders?patient_id=PAT-XXXX`

Returns `200` with an array of reminder records (including computed
`calendar_link` and `ics_content`).

### `DELETE /reminders/{id}`

Returns `200 { "deleted": true }` on success; `404` if not found.

## Email content (Resend)

- **From:** configured sender (env `RESEND_FROM`, default a placeholder).
- **Confirmation email** — subject: `Medical Appointment Reminder: {title}`.
  Body includes appointment date/time, the Google Calendar link, and attaches the
  `.ics` file.
- **Lead-time reminder email** — subject: `Reminder: {title} on {date}`. Body
  includes appointment time and the calendar link.

When `RESEND_API_KEY` is unset or the call fails, the email is logged as skipped
and the reminder is still stored / returned normally (mirrors the existing
mock-fallback pattern for Supabase).

## Environment variables (backend)

- `RESEND_API_KEY` — Resend API key (used to send emails).
- `RESEND_FROM` — sender email address (default `VitaScan <onboarding@resend.dev>`).

Add both (with placeholder values) to `backend/.env.example`.

## Frontend behavior

- `/reminders` shows a form (title, appointment date, appointment time,
  lead-time select, notes, optional email override) and a list of the user's
  reminders (title, date/time, status, calendar link, delete button).
- Email source defaults to the logged-in Clerk user's email
  (`useUser().user.primaryEmailAddress`), overridable in the form.
- Lead-time options: `1 hour` (60), `2 hours` (120), `1 day` (1440).
- On create success, show the calendar link and a success message.

## Error handling

- Past appointment → `400`.
- Missing patient/email → `400`.
- Resend failures → log and continue (reminder still stored).
- Supabase unavailable → mirror existing lazy-fallback behavior (reminders stored
  in-memory / logged), so the app stays runnable locally.

## Testing

**Backend (pytest)** — new `tests/test_reminders.py`:
- `calendar_link.py`: URL and `.ics` correctness for a known title/date.
- `process_due_reminders()`: sends email only when due and only once; ignores
  reminders whose `reminder_sent_at` is set; skips future reminders.
- Reminder CRUD with mocked Supabase and mocked Resend.
- Past appointment rejected.

**Frontend** — `npm run build` (type check) and manual flow against a local
backend with `RESEND_API_KEY` unset (verify fallback logging).

## Open decisions (resolved)

- Calendar: no Google API — Google Calendar link + `.ics` (user-selected).
- Email timing: immediate confirmation + lazy single lead-time email (user-selected).
- Storage: Supabase `reminders` table, lazy check, no scheduler (user-selected).
- UI: dedicated `/reminders` page + navbar link (user-selected).
