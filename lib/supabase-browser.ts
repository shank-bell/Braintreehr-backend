// Browser-only Supabase client factories — deliberately kept in their own
// file, separate from lib/supabase.ts. That file also exports
// createServerSupabaseClient(), which imports next/headers at module
// scope; next/headers can only be imported in server code, so any
// "use client" component importing anything from a file that also
// imports next/headers fails to build. Splitting avoids that entirely.
import { createBrowserClient } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "./database.types";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

// Cookie-backed client. Used by the login page, because the session it
// creates has to be readable by createServerSupabaseClient() in the
// (protected) layout. Always PKCE — see the note on the recovery client.
export function createBrowserSupabaseClient() {
  return createBrowserClient<Database>(SUPABASE_URL, SUPABASE_ANON_KEY);
}

// Recovery-only client for forgot-password / reset-password.
//
// It does NOT use @supabase/ssr's createBrowserClient, because that
// function hardcodes `flowType: "pkce"` AFTER spreading the caller's
// auth options — so passing flowType: "implicit" to it is silently
// ignored. PKCE stores a code verifier in the requesting browser and
// requires the SAME browser to open the emailed link, which fails
// constantly in practice (mail app opens a different browser, user
// requests on desktop and opens on phone).
//
// Plain createClient honors flowType, so recovery links carry the tokens
// in the URL hash and work from anywhere. Session lands in localStorage
// rather than cookies — fine here, since these pages only need it long
// enough to call updateUser(), and the user signs in normally afterward.
export function createRecoverySupabaseClient() {
  return createClient<Database>(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: {
      flowType: "implicit",
      detectSessionInUrl: true,
      persistSession: true,
    },
  });
}