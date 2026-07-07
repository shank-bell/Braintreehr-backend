-- 0002_rls_policies.sql
-- Row Level Security — design doc §4.8, §7.1, §12.1.
--
-- Model: public write endpoints (/api/apply, /api/contact) run
-- server-side with the service-role client (lib/supabase.ts ->
-- getServiceClient()), which bypasses RLS entirely — that's fine,
-- because those routes already do their own validation + rate limiting
-- (§5.3, §5.4) before ever touching the database. RLS's job here is to
-- be the SECOND lock on staff-only data: even if an API route had a bug
-- and used the wrong client, a signed-in non-staff session (or no
-- session at all) still can't read applications or leads directly
-- against Postgres.
--
-- Phase 5 note: when the chatbot lands, this file gets a new
-- content_embeddings section (locked to service-role only, no staff
-- access either — see the design doc §9) and chat_conversations /
-- chat_messages policies. Not here yet on purpose (§ this conversation).

-- ---------------------------------------------------------------------
-- helper: is the current session a recognized staff member?
-- ---------------------------------------------------------------------
create or replace function public.is_staff()
returns boolean
language sql stable security definer
as $$
  select exists (
    select 1 from public.staff_profiles where id = auth.uid()
  );
$$;

-- ---------------------------------------------------------------------
-- staff_profiles
-- ---------------------------------------------------------------------
alter table public.staff_profiles enable row level security;

create policy "staff can read own profile"
  on public.staff_profiles for select
  using (id = auth.uid());

-- No insert/update/delete policies for anon/authenticated on purpose —
-- staff accounts are provisioned via the service-role client (an admin
-- action, not self-serve sign-up). See §7.3.

-- ---------------------------------------------------------------------
-- jobs — public can read open roles; staff can read/write everything.
-- ---------------------------------------------------------------------
alter table public.jobs enable row level security;

create policy "anyone can read open jobs"
  on public.jobs for select
  using (status = 'open');

create policy "staff can read all jobs"
  on public.jobs for select
  using (public.is_staff());

create policy "staff can insert jobs"
  on public.jobs for insert
  with check (public.is_staff());

create policy "staff can update jobs"
  on public.jobs for update
  using (public.is_staff());

create policy "staff can delete jobs"
  on public.jobs for delete
  using (public.is_staff());

-- ---------------------------------------------------------------------
-- applications — staff-only reads/writes. Public submissions go through
-- the service-role client in POST /api/apply, not a public RLS policy
-- (§6.1, §11.1) — there is deliberately no anon insert policy here.
-- ---------------------------------------------------------------------
alter table public.applications enable row level security;

create policy "staff can read applications"
  on public.applications for select
  using (public.is_staff());

create policy "staff can update applications"
  on public.applications for update
  using (public.is_staff());

-- ---------------------------------------------------------------------
-- contact_submissions — same model as applications.
-- ---------------------------------------------------------------------
alter table public.contact_submissions enable row level security;

create policy "staff can read contact submissions"
  on public.contact_submissions for select
  using (public.is_staff());

create policy "staff can update contact submissions"
  on public.contact_submissions for update
  using (public.is_staff());

-- Note: chat_conversations, chat_messages, and content_embeddings get
-- their own RLS section in a Phase 5 migration, once those tables exist.

-- ---------------------------------------------------------------------
-- rate_limit_hits — internal bookkeeping only, service-role only.
-- ---------------------------------------------------------------------
alter table public.rate_limit_hits enable row level security;
-- (no policies defined -> RLS default-denies all access except service role)
