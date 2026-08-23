// Forgot password — sends a Supabase-issued reset link to the given email.
// Lives outside app/admin/(protected)/ on purpose, same reason login does:
// it must be reachable without a session.
"use client";

import { useState } from "react";
import Link from "next/link";
import { createBrowserSupabaseClient } from "@/lib/supabase-browser";

// Hardcoded on purpose. This page only ever runs on the backend's own dev
// server — never on the port Live Server serves SignIn.html from — but
// window.location.origin still depends on whatever port the browser
// happens to be on, which once caused a reset link to get mailed with a
// stale port baked in. Update this to the real domain before deploying.
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "sending" | "sent">("idle");
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setStatus("sending");

    const supabase = createBrowserSupabaseClient();
    const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${SITE_URL}/admin/reset-password`,
    });

    if (resetError) {
      // Surface the real reason (rate limits, unauthorized address, etc.)
      // instead of a generic message — the generic one made this
      // impossible to diagnose. Revisit before this is public-facing if
      // you'd rather not leak details to anonymous users.
      setError(resetError.message);
      setStatus("idle");
      return;
    }

    // Deliberately show the same message whether or not the email matched
    // an account — don't leak which emails exist in the system.
    setStatus("sent");
  }

  return (
    <div
      style={{
        position: "relative",
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "#0B0E1A",
        overflow: "hidden",
        padding: 24,
      }}
    >
      <div
        style={{
          position: "absolute",
          top: -160,
          left: "50%",
          transform: "translateX(-50%)",
          width: 640,
          height: 400,
          background:
            "radial-gradient(ellipse at center, rgba(107,67,232,0.35) 0%, rgba(107,67,232,0) 70%)",
          pointerEvents: "none",
        }}
      />

      <form
        onSubmit={handleSubmit}
        style={{
          position: "relative",
          background: "#141B2E",
          padding: 40,
          borderRadius: 20,
          width: 400,
          maxWidth: "100%",
          color: "#F5F3FA",
          border: "1px solid #232D45",
          boxShadow: "0 30px 80px -20px rgba(107, 67, 232, 0.35)",
        }}
      >
        <span
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 8,
            fontSize: 12,
            letterSpacing: "0.08em",
            textTransform: "uppercase",
            color: "#8A7FE0",
            marginBottom: 18,
          }}
        >
          <span
            style={{
              width: 6,
              height: 6,
              borderRadius: "50%",
              background: "#6B43E8",
              display: "inline-block",
            }}
          />
          Password reset
        </span>

        <h1 style={{ fontSize: 26, marginBottom: 8, fontWeight: 600 }}>Reset your password</h1>

        {status === "sent" ? (
          <>
            <p style={{ fontSize: 14, color: "#8B8CA3", marginBottom: 28, lineHeight: 1.6 }}>
              If an account exists for that email, a reset link is on its way. Check your inbox
              (and spam folder) — use it soon, it expires after a while.
            </p>
            <Link
              href="/admin/login"
              style={{
                fontSize: 13,
                color: "#8A7FE0",
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
              }}
            >
              ← Back to sign in
            </Link>
          </>
        ) : (
          <>
            <p style={{ fontSize: 14, color: "#8B8CA3", marginBottom: 28, lineHeight: 1.5 }}>
              Enter your work email and we'll send you a link to set a new password.
            </p>

            <label style={{ fontSize: 13, display: "block", marginBottom: 6 }}>Work email</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@braintreehr.com"
              style={{
                width: "100%",
                padding: "10px 12px",
                borderRadius: 8,
                border: "1px solid #232D45",
                background: "#0B1220",
                color: "#F5F3FA",
                marginBottom: 16,
              }}
            />

            {error && <p style={{ color: "#F87171", fontSize: 13, marginBottom: 16 }}>{error}</p>}

            <button
              type="submit"
              disabled={status === "sending"}
              style={{
                width: "100%",
                padding: "12px 12px",
                borderRadius: 999,
                border: "none",
                background: "#6B43E8",
                color: "#fff",
                fontWeight: 500,
                cursor: status === "sending" ? "default" : "pointer",
                opacity: status === "sending" ? 0.7 : 1,
                marginBottom: 20,
              }}
            >
              {status === "sending" ? "Sending…" : "Send reset link →"}
            </button>

            <Link
              href="/admin/login"
              style={{ fontSize: 13, color: "#8B8CA3", display: "block", textAlign: "center" }}
            >
              ← Back to sign in
            </Link>
          </>
        )}
      </form>
    </div>
  );
}