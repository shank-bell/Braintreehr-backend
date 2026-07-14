// Cloudflare Turnstile verification. No-op (returns true) unless
// TURNSTILE_SECRET_KEY is set, so local/dev and preview keep working.
// Sign up free at cloudflare.com → Turnstile, add a widget, then set
// TURNSTILE_SECRET_KEY (server) and the site key (frontend, public).
export async function verifyTurnstile(
  token: unknown,
  remoteIp?: string
): Promise<boolean> {
  const secret = process.env.TURNSTILE_SECRET_KEY;
  if (!secret) return true; // not configured yet → skip

  if (typeof token !== "string" || !token) return false;

  try {
    const form = new URLSearchParams();
    form.append("secret", secret);
    form.append("response", token);
    if (remoteIp && remoteIp !== "unknown") form.append("remoteip", remoteIp);

    const res = await fetch(
      "https://challenges.cloudflare.com/turnstile/v0/siteverify",
      { method: "POST", body: form }
    );
    const data = (await res.json()) as { success?: boolean };
    return data.success === true;
  } catch (err) {
    console.error("turnstile verify error:", err);
    return false; // fail closed on verification errors
  }
}