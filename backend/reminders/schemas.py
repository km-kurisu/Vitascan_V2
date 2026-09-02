"""
Pydantic models for the reminder subsystem.
"""
from datetime import datetime
from typing import Literal

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
    confirmation_sent_at: datetime | None = None
    reminder_sent_at: datetime | None = None
    calendar_link: str = ""
    ics_content: str = ""
