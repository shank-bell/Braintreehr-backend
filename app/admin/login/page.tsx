// Staff sign-in — calls supabase.auth.signInWithPassword() directly against
// Supabase Auth from the browser. No custom /api/admin/auth/login endpoint
// exists on purpose (§7.1) — Supabase issues and manages the session itself.
// Styled to match the "Employees only" branded page on the marketing site,
// since that page now just links here instead of duplicating the login.
"use client";

import { useState } from "react";
import Link from "next/link";
import { createBrowserSupabaseClient } from "@/lib/supabase-browser";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const supabase = createBrowserSupabaseClient();
    const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });

    setLoading(false);

    if (signInError) {
      setError("Incorrect email or password.");
      return;
    }

    // Full page navigation (not router.push) so the server-rendered
    // (protected) layout re-checks the session fresh on next load,
    // rather than relying on client-side route transition.
    window.location.href = "/admin/jobs";
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "var(--admin-nav-bg)",
        padding: 24,
      }}
    >
      <form
        onSubmit={handleSubmit}
        style={{
          background: "#141B2E",
          padding: 40,
          borderRadius: 20,
          width: 400,
          maxWidth: "100%",
          color: "var(--admin-nav-text)",
          border: "1px solid #232D45",
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
            color: "var(--admin-nav-accent)",
            marginBottom: 18,
          }}
        >
          <span
            style={{
              width: 6,
              height: 6,
              borderRadius: "50%",
              background: "var(--admin-nav-accent)",
              display: "inline-block",
            }}
          />
          Employees only
        </span>

        <h1 style={{ fontSize: 26, marginBottom: 8, fontWeight: 600 }}>Employee sign in</h1>
        <p
          style={{
            fontSize: 14,
            color: "var(--admin-nav-text-muted)",
            marginBottom: 28,
            lineHeight: 1.5,
          }}
        >
          Sign in with your BrainTree HR work email to access the internal portal.
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
            color: "var(--admin-nav-text)",
            marginBottom: 16,
          }}
        />

        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "baseline",
            marginBottom: 6,
          }}
        >
          <label style={{ fontSize: 13 }}>Password</label>
          <Link href="/admin/forgot-password" style={{ fontSize: 13, color: "var(--admin-nav-accent)" }}>
            Forgot password?
          </Link>
        </div>
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
            color: "var(--admin-nav-text)",
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
            background: "var(--admin-nav-accent)",
            color: "#fff",
            fontWeight: 500,
            cursor: loading ? "default" : "pointer",
            opacity: loading ? 0.7 : 1,
            marginBottom: 20,
          }}
        >
          {loading ? "Signing in…" : "Sign in →"}
        </button>

        <p
          style={{
            fontSize: 13,
            color: "var(--admin-nav-text-muted)",
            textAlign: "center",
            lineHeight: 1.6,
          }}
        >
          Access is restricted to BrainTree HR employees.
          <br />
          Trouble signing in?{" "}
          <a href="mailto:info@braintreehr.com" style={{ color: "var(--admin-nav-accent)" }}>
            Contact IT
          </a>
          .
        </p>
      </form>
    </div>
  );
}
