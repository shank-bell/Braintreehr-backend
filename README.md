# BrainTree HR — Backend

Next.js (App Router) backend for braintreehr.com: job board API, candidate
applications, contact/lead capture, and the internal staff admin portal.
Companion to the marketing site (the separate static HTML/CSS/JS frontend)
and to `BrainTreeHR_Backend_System_Design.docx` — every file here is
cross-referenced back to a section of that doc (`§x.x` in comments) so the
reasoning behind each piece is easy to find.

## Status — Phases 1-3 fully implemented, Phase 4 not started

The chatbot (Phase 5) is deliberately not scaffolded — see the design doc's
own note in `supabase/migrations/0002_rls_policies.sql` for where it comes
back in.

**Real, working code (not stubs) — verified via `tsc --noEmit` and
`next build`, both clean:**

- `lib/types.ts`, `lib/database.types.ts` — schema + Supabase client typing
- `lib/supabase.ts` (server + service-role clients) and
  `lib/supabase-browser.ts` (browser client — deliberately a separate file;
  see the comment at the top of `lib/supabase.ts` for why)
- `lib/auth.ts` — `requireStaffSession()`
- `lib/validation.ts` — every Zod schema
- `lib/slug.ts` — job slug generation
- `lib/rateLimit.ts` — Postgres-backed rate limiting (needs
  `0003_rate_limit_rpc.sql` run — see below)
- `lib/storage.ts` — signed résumé upload/download URLs, magic-byte validation
- `lib/email.ts` + 4 templates — Resend integration, lazily initialized so
  a missing `RESEND_API_KEY` never breaks the build, only skips sending
- `middleware.ts` — Supabase session refresh
- All 16 API routes: `/api/jobs`, `/api/jobs/[slug]`, `/api/apply`,
  `/api/contact`, `/api/upload-url`, and all 8 `/api/admin/*` routes
- Admin portal: login page, auth-guarded layout (route-grouped so the
  login page itself isn't guarded — see `app/admin/(protected)/`), and
  working jobs/applications/leads management pages

**⚠️ Action needed on the live Supabase project:** a third migration,
`supabase/migrations/0003_rate_limit_rpc.sql`, was added after `0001` and
`0002` were already run. It needs to be run too — `lib/rateLimit.ts` calls
an RPC function (`increment_rate_limit`) that this migration creates;
without it, every rate-limited route (`/api/apply`, `/api/contact`,
`/api/upload-url`) will error at runtime.

**Not started:** Phase 4 (deploy + go live) and everything it depends on —
real Supabase/Resend/Anthropic credentials have not been plugged in
anywhere yet, by design (API key integration deferred to last). The actual
static frontend forms (Apply.html/Contact.html) also haven't been wired to
call this API yet — that's part of Phase 4, not done here.

## Setup

```bash
npm install
cp .env.example .env.local   # fill in real Supabase/Resend values when ready
```

Run all three migrations against your Supabase project, in order:

```
0001_init.sql
0002_rls_policies.sql
0003_rate_limit_rpc.sql
```

Create a staff account (Auth → Users → Add user), then link it:

```sql
insert into public.staff_profiles (id, full_name, role)
values ('<the-user-uid>', 'Your Name', 'admin');
```

```bash
npm run dev
```

## Layout

```
/app
  /api            Public + admin route handlers (§5)
  /admin
    /login        Unauthenticated — outside the (protected) route group
    /(protected)   Auth-guarded via layout.tsx — jobs/applications/leads
/lib              Everything route handlers and pages import from (§3, §9-§10)
/supabase/migrations   Schema, RLS policies, rate-limit RPC (§4)
```

## Known non-blocking build warning

`next build` shows a warning about `process.version` and the Edge Runtime,
sourced from `@supabase/supabase-js`. This is a confirmed, widely-reported
upstream cosmetic issue (a guarded deprecation check that Next's static
analyzer flags but never actually executes on Edge) — not a bug in this
codebase, and it doesn't affect middleware working correctly.
