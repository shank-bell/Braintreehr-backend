// Staff sign-in — calls supabase.auth.signInWithPassword() directly against
// Supabase Auth from the browser. No custom /api/admin/auth/login endpoint
// exists on purpose (§7.1) — Supabase issues and manages the session itself.
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createBrowserSupabaseClient } from "@/lib/supabase-browser";

export default function LoginPage() {
  const router = useRouter();
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
      }}
    >
      <form
        onSubmit={handleSubmit}
        style={{
          background: "#141B2E",
          padding: 32,
          borderRadius: 16,
          width: 360,
          color: "var(--admin-nav-text)",
          border: "1px solid #232D45",
        }}
      >
        <h1 style={{ fontSize: 20, marginBottom: 4, fontWeight: 500 }}>
          BrainTree<span style={{ color: "var(--admin-nav-accent)" }}>HR</span>
        </h1>
        <p style={{ fontSize: 13, color: "var(--admin-nav-text-muted)", marginBottom: 24 }}>
          Staff sign-in
        </p>

        <label style={{ fontSize: 13, display: "block", marginBottom: 6 }}>Email</label>
        <input
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
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

        <label style={{ fontSize: 13, display: "block", marginBottom: 6 }}>Password</label>
        <input
          type="password"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
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

        {error && (
          <p style={{ color: "#F87171", fontSize: 13, marginBottom: 16 }}>{error}</p>
        )}

        <button
          type="submit"
          disabled={loading}
          style={{
            width: "100%",
            padding: "10px 12px",
            borderRadius: 999,
            border: "none",
            background: "var(--admin-nav-accent)",
            color: "#fff",
            fontWeight: 500,
            cursor: loading ? "default" : "pointer",
            opacity: loading ? 0.7 : 1,
          }}
        >
          {loading ? "Signing in…" : "Sign in"}
        </button>
      </form>
    </div>
  );
}