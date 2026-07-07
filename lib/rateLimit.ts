// Postgres-backed rate limiting — design doc §5.4, §9.5, §10.1, §10.4.
// Backs onto the rate_limit_hits table (0001_init.sql). Uses the
// service-role client since this runs before we know who the caller is
// (public routes, no session yet) — RLS on this table denies everyone
// but service-role anyway (0002_rls_policies.sql).
import { createHash } from "crypto";
import { getServiceClient } from "./supabase";

/**
 * Returns true if the request is allowed, false if it should be rejected
 * with 429. `windowSec` buckets hits into fixed windows (not a true
 * sliding window) — simple, and plenty accurate at this traffic volume.
 */
export async function allowRequest(
  ipHash: string,
  route: string,
  limit = 5,
  windowSec = 600
): Promise<boolean> {
  const supabase = getServiceClient();
  const windowStart = new Date(
    Math.floor(Date.now() / (windowSec * 1000)) * windowSec * 1000
  ).toISOString();

  // Upsert-and-increment in one round trip: try to insert count=1, and on
  // conflict (same ip_hash/route/window_start already exists) bump count.
  const { data, error } = await supabase.rpc("increment_rate_limit", {
    p_ip_hash: ipHash,
    p_route: route,
    p_window_start: windowStart,
  });

  if (error) {
    // Fail open rather than closed — a rate-limiter bug should not be
    // able to take down the apply/contact forms entirely. Logged so it's
    // visible, not silently swallowed.
    console.error("rateLimit.allowRequest error:", error.message);
    return true;
  }

  const count = data as number;
  return count <= limit;
}

/** SHA-256 hash of the caller's IP — never store raw IPs (§11.2). */
export function hashIp(ip: string): string {
  return createHash("sha256").update(ip).digest("hex");
}

/**
 * Pulls the caller's IP out of standard proxy headers (Vercel sets
 * x-forwarded-for). Falls back to a constant so local dev without a
 * proxy in front doesn't crash — rate limiting just becomes a no-op
 * per-machine bucket in that case, which is fine for local testing.
 */
export function getClientIp(headers: Headers): string {
  const forwarded = headers.get("x-forwarded-for");
  if (forwarded) return (forwarded.split(",")[0] ?? forwarded).trim();
  return headers.get("x-real-ip") ?? "unknown";
}
