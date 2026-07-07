// GET /api/admin/contact — list contact/lead submissions
// Design doc §5.2
import { NextRequest, NextResponse } from "next/server";
import { requireStaffSession, UnauthorizedError } from "@/lib/auth";
import { getServiceClient } from "@/lib/supabase";

export async function GET(req: NextRequest) {
  try {
    await requireStaffSession();
  } catch (err) {
    if (err instanceof UnauthorizedError) {
      return NextResponse.json({ error: err.message }, { status: 401 });
    }
    throw err;
  }

  const { searchParams } = req.nextUrl;
  const status = searchParams.get("status");
  const topic = searchParams.get("topic");

  const supabase = getServiceClient();
  let query = supabase
    .from("contact_submissions")
    .select("*")
    .order("submitted_at", { ascending: false });

  if (status) query = query.eq("status", status);
  if (topic) query = query.eq("topic", topic);

  const { data, error } = await query;
  if (error) {
    return NextResponse.json({ error: "Could not load submissions" }, { status: 500 });
  }
  return NextResponse.json({ leads: data });
}
