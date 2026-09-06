// Staff sign-in lives on the marketing site (SignIn.html) and posts to
// /api/admin/login, which sets the session cookie on THIS origin. This app
// has no login page of its own — every unauthenticated path redirects out
// to the public site instead.
import { redirect } from "next/navigation";
import Link from "next/link";
import { createServerSupabaseClient } from "@/lib/supabase";
import { SIGN_IN_URL, HOME_URL } from "@/lib/site-urls";

async function logout() {
  "use server";
  const supabase = await createServerSupabaseClient();
  await supabase.auth.signOut();
  redirect(HOME_URL);
}
export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(SIGN_IN_URL);
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
    redirect(SIGN_IN_URL);
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
        <form action={logout}>
          <button
            type="submit"
            style={{
              fontSize: 13,
              color: "var(--admin-nav-text-muted)",
              background: "none",
              border: "none",
              cursor: "pointer",
              textDecoration: "underline",
              padding: 0,
              fontFamily: "inherit",
            }}
          >
            Log out
          </button>
        </form>
      </nav>
      <main style={{ padding: "24px" }}>{children}</main>
    </div>
  );
}