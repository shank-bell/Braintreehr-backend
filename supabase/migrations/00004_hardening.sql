-- 0004_hardening.sql — security hardening (bucket limits + upload binding)

-- (#2) Enforce résumé size + type at the storage layer — the only place
-- that can't be bypassed, since the browser uploads directly to Storage.
update storage.buckets
set
  public = false,
  file_size_limit = 10485760,  -- 10 MB
  allowed_mime_types = array[
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  ]
where id = 'resumes';

-- (#1) Track every upload path we hand out, bound to the requesting IP,
-- so /api/apply can only accept a path THIS flow actually issued — and
-- only once. Service-role only (no RLS policies = default deny).
create table if not exists public.issued_uploads (
  path       text primary key,
  ip_hash    text not null,
  created_at timestamptz not null default now()
);

alter table public.issued_uploads enable row level security;

create index if not exists issued_uploads_created_at_idx
  on public.issued_uploads (created_at);

-- Optional housekeeping: drop stale unconsumed tokens older than 1 day.
-- Run manually or via a scheduled job.
-- delete from public.issued_uploads where created_at < now() - interval '1 day';