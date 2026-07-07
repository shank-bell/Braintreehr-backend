// GET /api/admin/applications — filterable by ?status=&job_id=, cursor-paginated
// Design doc §5.2, §10.1
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
  const jobId = searchParams.get("job_id");
  const cursor = searchParams.get("cursor"); // format: "<submitted_at>_<id>"
  const limit = Math.min(Number(searchParams.get("limit") ?? 25) || 25, 100);

  const supabase = getServiceClient();
  let query = supabase
    .from("applications")
    .select("*")
    .order("submitted_at", { ascending: false })
    .order("id", { ascending: false })
    .limit(limit);

  if (status) query = query.eq("status", status);
  if (jobId) query = query.eq("job_id", jobId);
  if (cursor) {
    const [submittedAt, id] = cursor.split("_");
    if (submittedAt && id) {
      // Keyset pagination (§10.1) — strictly older than the last row seen.
      query = query.or(
        `submitted_at.lt.${submittedAt},and(submitted_at.eq.${submittedAt},id.lt.${id})`
      );
    }
  }

  const { data, error } = await query;
  if (error) {
    return NextResponse.json({ error: "Could not load applications" }, { status: 500 });
  }

  const last = data.at(-1);
  const nextCursor = data.length === limit && last ? `${last.submitted_at}_${last.id}` : null;

  return NextResponse.json({ applications: data, nextCursor });
}
