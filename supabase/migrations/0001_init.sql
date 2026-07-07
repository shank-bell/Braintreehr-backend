-- 0001_init.sql
-- Core schema — design doc §4.2-§4.5, §5.4 (rate limiting table).
-- Run in the Supabase SQL editor or via `supabase migration up`.

create extension if not exists "pgcrypto"; -- gen_random_uuid()

-- ---------------------------------------------------------------------
-- staff_profiles — extends Supabase's own auth.users (§4.5). We never
-- create or touch auth.users directly; Supabase Auth owns that table.
-- ---------------------------------------------------------------------
create table if not exists public.staff_profiles (
  id          uuid primary key references auth.users (id) on delete cascade,
  full_name   text not null,
  role        text not null default 'admin' check (role in ('admin', 'recruiter')),
  created_at  timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- jobs (§4.2)
-- ---------------------------------------------------------------------
create table if not exists public.jobs (
  id               uuid primary key default gen_random_uuid(),
  slug             text not null unique,
  title            text not null,
  department       text not null,
  location         text not null,
  employment_type  text not null check (employment_type in ('Full-time', 'Contract')),
  pay_range        text,
  description      text not null,
  requirements     text,
  status           text not null default 'draft' check (status in ('draft', 'open', 'closed')),
  posted_at        timestamptz,
  created_by       uuid references public.staff_profiles (id),
  updated_at       timestamptz not null default now()
);

create index if not exists jobs_status_idx on public.jobs (status);
create index if not exists jobs_department_idx on public.jobs (department);
create index if not exists jobs_location_idx on public.jobs (location);
create unique index if not exists jobs_slug_idx on public.jobs (slug);

-- ---------------------------------------------------------------------
-- applications (§4.3)
-- ---------------------------------------------------------------------
create table if not exists public.applications (
  id                uuid primary key default gen_random_uuid(),
  job_id            uuid references public.jobs (id) on delete set null,
  role_applied      text not null,
  full_name         text not null,
  email             text not null,
  phone             text not null,
  location          text,
  current_company   text,
  years_experience  text,
  linkedin_url      text,
  notice_period     text,
  resume_path       text not null,
  resume_filename   text not null,
  cover_note        text,
  status            text not null default 'new'
                       check (status in ('new', 'reviewed', 'shortlisted', 'rejected', 'hired')),
  ip_hash           text not null,
  submitted_at      timestamptz not null default now()
);

create index if not exists applications_status_idx on public.applications (status);
create index if not exists applications_job_id_idx on public.applications (job_id);
-- Supports cursor pagination on (submitted_at, id) — design doc §10.1.
create index if not exists applications_cursor_idx on public.applications (submitted_at, id);

-- ---------------------------------------------------------------------
-- contact_submissions (§4.4)
-- ---------------------------------------------------------------------
create table if not exists public.contact_submissions (
  id            uuid primary key default gen_random_uuid(),
  name          text not null,
  email         text not null,
  company       text,
  topic         text not null check (topic in ('hire', 'job_seeker', 'press', 'partnership', 'other')),
  budget_band   text,
  message       text,
  status        text not null default 'new' check (status in ('new', 'responded', 'archived')),
  submitted_at  timestamptz not null default now()
);

create index if not exists contact_submissions_status_idx on public.contact_submissions (status);
create index if not exists contact_submissions_topic_idx on public.contact_submissions (topic);
create index if not exists contact_submissions_cursor_idx on public.contact_submissions (submitted_at, id);

-- Note: chat_conversations, chat_messages, and content_embeddings (§4.6, §4.7)
-- are deliberately NOT created here. They're chatbot-only tables, deferred
-- to a Phase 5 migration alongside the rest of the RAG pipeline.

-- ---------------------------------------------------------------------
-- rate_limit_hits — design doc §5.4/§10.1/§10.4. Replaces Revision 1's
-- Vercel KV/Redis design with a plain table; fine at this traffic volume.
-- ---------------------------------------------------------------------
create table if not exists public.rate_limit_hits (
  ip_hash       text not null,
  route         text not null,
  window_start  timestamptz not null,
  count         int not null default 1,
  primary key (ip_hash, route, window_start)
);

create index if not exists rate_limit_hits_lookup_idx on public.rate_limit_hits (ip_hash, route, window_start);

-- ---------------------------------------------------------------------
-- updated_at trigger for jobs (kept simple — one table needs it)
-- ---------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists jobs_set_updated_at on public.jobs;
create trigger jobs_set_updated_at
  before update on public.jobs
  for each row execute function public.set_updated_at();
