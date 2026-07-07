// Admin shell: nav + auth guard — design doc §7, §7.4.
// Server Component so the redirect happens before any admin HTML ships,
// not as a client-side flash-then-redirect.
import { redirect } from "next/navigation";
import Link from "next/link";
import { createServerSupabaseClient } from "@/lib/supabase";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Login page lives inside /admin too but must render without a session —
  // everything else under /admin requires one.
  if (!user) {
    redirect("/admin/login");
  }

  const { data: profile } = await supabase
    .from("staff_profiles")
    .select("id, full_name, role")
    .eq("id", user.id)
    .single();

  if (!profile) {
    // Valid Supabase session, but not a recognized staff account (§7.1) —
    // sign them out rather than leave them stuck on a page they can't use.
    await supabase.auth.signOut();
    redirect("/admin/login");
  }

  return (
    <div style={{ minHeight: "100vh" }}>
      <nav
        style={{
          display: "flex",
          alignItems: "center",
          gap: 28,
          padding: "14px 24px",
          background: "var(--admin-nav-bg)",
          color: "var(--admin-nav-text)",
        }}
      >
        <strong style={{ fontSize: 16 }}>
          BrainTree<span style={{ color: "var(--admin-nav-accent)" }}>HR</span>
        </strong>
        <Link href="/admin/jobs" style={{ color: "var(--admin-nav-text-muted)", fontSize: 14, textDecoration: "none" }}>
          Jobs
        </Link>
        <Link href="/admin/applications" style={{ color: "var(--admin-nav-text-muted)", fontSize: 14, textDecoration: "none" }}>
          Applications
        </Link>
        <Link href="/admin/leads" style={{ color: "var(--admin-nav-text-muted)", fontSize: 14, textDecoration: "none" }}>
          Leads
        </Link>
        <span style={{ marginLeft: "auto", fontSize: 13, color: "var(--admin-nav-text-muted)" }}>
          Admin
        </span>
      </nav>
      <main style={{ padding: "24px" }}>{children}</main>
    </div>
  );
}