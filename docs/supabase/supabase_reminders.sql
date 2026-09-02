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