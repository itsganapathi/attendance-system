-- Run this in the Supabase SQL Editor (Project -> SQL Editor -> New query)

create extension if not exists "pgcrypto";

do $$ begin
  create type user_role as enum ('admin', 'student');
exception when duplicate_object then null; end $$;

do $$ begin
  create type attendance_status as enum ('present', 'absent', 'late');
exception when duplicate_object then null; end $$;

do $$ begin
  create type leave_status as enum ('pending', 'approved', 'rejected');
exception when duplicate_object then null; end $$;

create table if not exists users (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  email text not null unique,
  password text not null,              -- bcrypt hash, never the raw password
  role user_role not null default 'student',
  roll_number text,
  department text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists attendance (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references users(id) on delete cascade,
  date date not null,
  status attendance_status not null,
  marked_by uuid references users(id),
  remarks text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (student_id, date)
);

create table if not exists leaves (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references users(id) on delete cascade,
  from_date date not null,
  to_date date not null,
  reason text not null,
  status leave_status not null default 'pending',
  reviewed_by uuid references users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_attendance_student on attendance(student_id);
create index if not exists idx_attendance_date on attendance(date);
create index if not exists idx_leaves_student on leaves(student_id);

-- Row Level Security: enabled with NO policies. The backend talks to Supabase
-- using the service_role key, which bypasses RLS entirely, so the app keeps
-- working. This just blocks the anon/public key from reading these tables
-- directly (e.g. if it were ever exposed in frontend code by mistake).
alter table users enable row level security;
alter table attendance enable row level security;
alter table leaves enable row level security;
