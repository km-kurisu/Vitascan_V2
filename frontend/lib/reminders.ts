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