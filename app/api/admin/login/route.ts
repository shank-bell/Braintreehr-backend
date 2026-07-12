// Custom staff login endpoint — exists ONLY so SignIn.html (a separate
// origin from the admin app) can perform a real Supabase sign-in and
// receive the session cookie on THIS domain. The browser Supabase SDK
// can't write a cookie across origins on its own — this route does the
// sign-in server-side instead, so the Set-Cookie response header lands
// on this origin correctly.
//
// Mirrors the same signInWithPassword + staff_profiles check already used
// in app/admin/login/page.tsx and app/admin/(protected)/layout.tsx.
//
// Rate limited — this is a login endpoint, so it's a natural target for
// password-guessing. 5 attempts per 10 minutes per IP, same defaults used
// on the other public routes (lib/rateLimit.ts).
import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase";
import { allowRequest, getClientIp, hashIp } from "@/lib/rateLimit";

export async function POST(request: Request) {
  const ipHash = hashIp(getClientIp(request.headers));
  const allowed = await allowRequest(ipHash, "admin_login", 5, 600);

  if (!allowed) {
    return NextResponse.json(
      { error: "Too many sign-in attempts. Please wait a few minutes and try again." },
      { status: 429 }
    );
  }

  const body = await request.json().catch(() => null);
  const email = body?.email;
  const password = body?.password;

  if (!email || !password) {
    return NextResponse.json({ error: "Email and password are required." }, { status: 400 });
  }

  const supabase = await createServerSupabaseClient();

  const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
  if (signInError) {
    return NextResponse.json({ error: "Incorrect email or password." }, { status: 401 });
  }

  // Same staff check as the (protected) layout — reject accounts that
  // authenticated fine with Supabase but aren't recognized staff.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    const { data: profile } = await supabase
      .from("staff_profiles")
      .select("id")
      .eq("id", user.id)
      .single();

    if (!profile) {
      await supabase.auth.signOut();
      return NextResponse.json(
        { error: "This account isn't authorized for admin access." },
        { status: 403 }
      );
    }
  }

  return NextResponse.json({ success: true });
}
