// Supabase client factories — design doc §3.2, §7.1, §12.1.
//
// Server-only file: both exports below are for route handlers, Server
// Components, and Server Actions. The browser-side client factory lives
// in lib/supabase-browser.ts instead — kept separate on purpose, since
// this file imports next/headers at module scope, which breaks any
// "use client" component that imports anything from a file that does.
//
//   - server client  : used in route handlers / server components. Reads the
//                       caller's session from cookies, so every query runs as
//                       that user — Row Level Security (§4.8) applies.
//   - service client  : bypasses RLS entirely. Only for trusted server-only
//                       work that isn't tied to a specific user's session
//                       (rate-limit counters, re-embedding jobs, admin
//                       actions already gated by requireStaffSession()).
//                       NEVER import this into anything that runs in the browser.
import { createServerClient } from "@supabase/ssr";
import type { CookieOptions } from "@supabase/ssr";
import { createClient as createRawClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import type { Database } from "./database.types";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
// Supabase's newer projects call this the "publishable key"; same value/role
// as the classic anon key. Keeping the ANON_KEY name to match the design
// doc's Appendix A env var list.
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

/**
 * Route Handler / Server Component usage. Reads the signed-in staff
 * member's session from cookies, so RLS policies apply as that user.
 */
export async function createServerSupabaseClient() {
  const cookieStore = await cookies();

  return createServerClient<Database>(SUPABASE_URL, SUPABASE_ANON_KEY, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet: { name: string; value: string; options: CookieOptions }[]) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieStore.set(name, value, options);
          });
        } catch {
          // Called from a Server Component render — safe to ignore since
          // middleware refreshes the session on the next request anyway.
        }
      },
    },
  });
}

let serviceClient: ReturnType<typeof createRawClient<Database>> | null = null;

/**
 * Service-role client — bypasses Row Level Security. Use only for:
 *   - rate_limit_hits table access (lib/rateLimit.ts)
 *   - anything already protected upstream by requireStaffSession() (lib/auth.ts)
 * (Phase 5 adds a third use: content_embeddings writes from lib/embeddings.ts,
 * once that file exists again.)
 * Never expose this client or its key to the browser.
 */
export function getServiceClient() {
  if (!serviceClient) {
    serviceClient = createRawClient<Database>(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
      auth: { persistSession: false },
    });
  }
  return serviceClient;
}
