// Reset password — the page the emailed link points to.
// Handles both PKCE (?code=) and legacy hash (#access_token=) styles,
// uses ONE client instance for verify + update, and guards against
// React Strict Mode double-invoking the single-use code exchange.
"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import { createBrowserSupabaseClient } from "@/lib/supabase-browser";

export default function ResetPasswordPage() {
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [ready, setReady] = useState(false);
  const [checking, setChecking] = useState(true);
  const [done, setDone] = useState(false);
  const [loading, setLoading] = useState(false);

  // One client for the whole page — the session the exchange creates must
  // still be there when handleSubmit runs.
  const supabase = useMemo(() => createBrowserSupabaseClient(), []);
  const exchanged = useRef(false);

  useEffect(() => {
    // Strict Mode runs effects twice in dev. The recovery code is
    // single-use, so a second exchange would fail and clobber the session.
    if (exchanged.current) return;
    exchanged.current = true;

    const { data: listener } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY" || event === "SIGNED_IN") {
        setReady(true);
        setChecking(false);
      }
    });

    (async () => {
      const url = new URL(window.location.href);
      const code = url.searchParams.get("code");
      const errDesc =
        url.searchParams.get("error_description") ||
        new URLSearchParams(window.location.hash.slice(1)).get("error_description");

      if (errDesc) {
        setError(decodeURIComponent(errDesc));
        setChecking(false);
        return;
      }

      if (code) {
        const { error: exErr } = await supabase.auth.exchangeCodeForSession(code);
        if (exErr) {
          setError(`Link couldn't be verified: ${exErr.message}`);
          setChecking(false);
          return;
        }
        // Tidy the URL so a refresh doesn't retry a spent code.
        window.history.replaceState({}, "", window.location.pathname);
        setReady(true);
        setChecking(false);
        return;
      }

      // Hash-style links (#access_token=...) are picked up automatically by
      // the client; just confirm a session landed.
      const { data } = await supabase.auth.getSession();
      if (data.session) setReady(true);
      else setError("No valid reset link found. Request a new one.");
      setChecking(false);
    })();

    return () => listener.subscription.unsubscribe();
  }, [supabase]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }
    if (password !== confirm) {
      setError("Passwords don't match.");
      return;
    }

    setLoading(true);
    const { error: updateError } = await supabase.auth.updateUser({ password });
    setLoading(false);

    if (updateError) {
      // Show what actually went wrong instead of always blaming expiry.
      setError(updateError.message);
      return;
    }

    setDone(true);
    setTimeout(() => {
      window.location.href = "/admin/login";
    }, 2500);
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

        <h1 style={{ fontSize: 26, marginBottom: 8, fontWeight: 600 }}>Set a new password</h1>

        {done ? (
          <p style={{ fontSize: 14, color: "#8B8CA3", lineHeight: 1.6 }}>
            Password updated — redirecting you to sign in…
          </p>
        ) : checking ? (
          <p style={{ fontSize: 14, color: "#8B8CA3", lineHeight: 1.6 }}>
            Verifying your reset link…
          </p>
        ) : !ready ? (
          <>
            <p style={{ color: "#F87171", fontSize: 14, marginBottom: 20, lineHeight: 1.6 }}>
              {error || "This reset link isn't valid."}
            </p>
            <a href="/admin/forgot-password" style={{ fontSize: 13, color: "#8A7FE0" }}>
              ← Request a new link
            </a>
          </>
        ) : (
          <>
            <p style={{ fontSize: 14, color: "#8B8CA3", marginBottom: 28, lineHeight: 1.5 }}>
              Choose a new password for your account.
            </p>

            <label style={{ fontSize: 13, display: "block", marginBottom: 6 }}>New password</label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
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

            <label style={{ fontSize: 13, display: "block", marginBottom: 6 }}>
              Confirm password
            </label>
            <input
              type="password"
              required
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              placeholder="••••••••"
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
              disabled={loading}
              style={{
                width: "100%",
                padding: "12px 12px",
                borderRadius: 999,
                border: "none",
                background: "#6B43E8",
                color: "#fff",
                fontWeight: 500,
                cursor: loading ? "default" : "pointer",
                opacity: loading ? 0.7 : 1,
              }}
            >
              {loading ? "Updating…" : "Update password →"}
            </button>
          </>
        )}
      </form>
    </div>
  );
}