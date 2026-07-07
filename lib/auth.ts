// Session verification for admin route handlers.
// Design doc §7.1 (Supabase Auth), §7.3 (role model), §12.1 (defense in depth —
// this check is the app-layer half; Row Level Security policies in
// supabase/migrations/0002_rls_policies.sql are the database-layer half).
import { createServerSupabaseClient } from "./supabase";
import type { StaffProfile } from "./types";

export class UnauthorizedError extends Error {
  constructor(message = "Unauthorized") {
    super(message);
    this.name = "UnauthorizedError";
  }
}

export interface StaffSession {
  userId: string;
  email: string | undefined;
  profile: StaffProfile;
}

/**
 * Verifies the caller has a valid Supabase session AND a corresponding
 * staff_profiles row. Throws UnauthorizedError otherwise — callers should
 * catch this and return a 401 (see the pattern in any app/api/admin/** route).
 *
 * This does not replace Row Level Security — a bug here is not the only
 * thing standing between an unauthenticated request and staff-only data,
 * because the RLS policies re-check the same condition at the database
 * layer regardless of what the API layer does (§4.8, §12.1).
 */
export async function requireStaffSession(): Promise<StaffSession> {
  const supabase = await createServerSupabaseClient();

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    throw new UnauthorizedError("No active session");
  }

  const { data: profile, error: profileError } = await supabase
    .from("staff_profiles")
    .select("id, full_name, role, created_at")
    .eq("id", user.id)
    .single();

  if (profileError || !profile) {
    // A valid Supabase Auth session that isn't a staff member — e.g. if
    // Auth is ever reused for a candidate/employer-facing surface later.
    throw new UnauthorizedError("Not a recognized staff account");
  }

  return {
    userId: user.id,
    email: user.email,
    profile: profile as StaffProfile,
  };
}

/**
 * Convenience wrapper for route handlers: runs requireStaffSession() and
 * returns a standard 401 NextResponse instead of throwing, so handlers can
 * do:  const session = await staffSessionOrResponse(); if (session instanceof Response) return session;
 */
export async function staffSessionOrResponse() {
  try {
    return await requireStaffSession();
  } catch (err) {
    const { NextResponse } = await import("next/server");
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Unauthorized" },
      { status: 401 }
    );
  }
}
