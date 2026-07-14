// Postgres-backed rate limiting — design doc §5.4, §9.5, §10.1, §10.4.
import { createHash } from "crypto";
import { getServiceClient } from "./supabase";

/**
 * Returns true if allowed, false if it should be rejected with 429.
 * `failClosed`: when the DB call itself errors, reject instead of allow.
 * Use failClosed=true on routes where an unbounded flood is expensive
 * (they send email); leave it false where availability matters more
 * (e.g. admin login shouldn't lock out during a DB blip).
 */
export async function allowRequest(
  ipHash: string,
  route: string,
  limit = 5,
  windowSec = 600,
  failClosed = false
): Promise<boolean> {
  const supabase = getServiceClient();
  const windowStart = new Date(
    Math.floor(Date.now() / (windowSec * 1000)) * windowSec * 1000
  ).toISOString();

  const { data, error } = await supabase.rpc("increment_rate_limit", {
    p_ip_hash: ipHash,
    p_route: route,
    p_window_start: windowStart,
  });

  if (error) {
    console.error("rateLimit.allowRequest error:", error.message);
    return !failClosed; // fail open unless caller asked otherwise
  }

  const count = data as number;
  return count <= limit;
}

/** SHA-256 hash of the caller's IP — never store raw IPs (§11.2). */
export function hashIp(ip: string): string {
  return createHash("sha256").update(ip).digest("hex");
}

/**
 * Resolve the caller's IP. On Vercel, `x-real-ip` is set by the platform
 * to the true edge client IP and is NOT client-appendable — prefer it.
 * `x-forwarded-for` is client-controllable at the head of the list, so if
 * we fall back to it we take the LAST hop, not the first.
 */
export function getClientIp(headers: Headers): string {
  const realIp = headers.get("x-real-ip");
  if (realIp) return realIp.trim();

  const forwarded = headers.get("x-forwarded-for");
  if (forwarded) {
    const parts = forwarded.split(",").map((p) => p.trim()).filter(Boolean);
    if (parts.length) return parts[parts.length - 1]; // last = closest trusted hop
  }
  return "unknown";
}