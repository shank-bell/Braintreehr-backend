// GET /api/jobs — list open jobs, filterable by ?department=&location=&type=
// Design doc §5.1
import { NextRequest, NextResponse } from "next/server";
import { getServiceClient } from "@/lib/supabase";

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const department = searchParams.get("department");
  const location = searchParams.get("location");
  const type = searchParams.get("type");

  const supabase = getServiceClient();
  let query = supabase
    .from("jobs")
    .select("id, slug, title, department, location, employment_type, pay_range, posted_at")
    .eq("status", "open")
    .order("posted_at", { ascending: false });

  if (department) query = query.eq("department", department);
  if (location) query = query.eq("location", location);
  if (type) query = query.eq("employment_type", type);

  const { data, error } = await query;
  if (error) {
    return NextResponse.json({ error: "Could not load jobs" }, { status: 500 });
  }
  return NextResponse.json({ jobs: data });
}
