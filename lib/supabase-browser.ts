// Browser-only Supabase client factory — deliberately kept in its own
// file, separate from lib/supabase.ts. That file also exports
// createServerSupabaseClient(), which imports next/headers at module
// scope; next/headers can only be imported in server code, so any
// "use client" component importing anything from a file that also
// imports next/headers fails to build. Splitting avoids that entirely.
import { createBrowserClient } from "@supabase/ssr";
import type { Database } from "./database.types";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export function createBrowserSupabaseClient() {
  return createBrowserClient<Database>(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: {
      // Implicit instead of the default PKCE. PKCE stores a code verifier in
      // the requesting browser and requires the SAME browser to open the
      // emailed link — which fails constantly in practice (mail app opens a
      // different browser, user requests on desktop and opens on phone).
      // Implicit puts the tokens in the link itself, so recovery works from
      // anywhere. Only affects email link flows; password login is unchanged.
      flowType: "implicit",
      detectSessionInUrl: true,
    },
  });
}