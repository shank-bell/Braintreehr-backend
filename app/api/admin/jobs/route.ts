// GET  /api/admin/jobs — all jobs incl. draft/closed
// POST /api/admin/jobs — create a job posting
// Design doc §5.2, §11.2. Re-embedding (§9.4) is Phase 5 — this handler
// works fully without it, chatbot content just won't include this job
// until Phase 5 lands.
import { NextRequest, NextResponse } from "next/server";
import { requireStaffSession, UnauthorizedError } from "@/lib/auth";
import { jobSchema } from "@/lib/validation";
import { makeSlug } from "@/lib/slug";
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

  const supabase = getServiceClient();
  const { data, error } = await supabase
    .from("jobs")
    .select("*")
    .order("updated_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: "Could not load jobs" }, { status: 500 });
  }
  return NextResponse.json({ jobs: data });
}

export async function POST(req: NextRequest) {
  let session;
  try {
    session = await requireStaffSession();
  } catch (err) {
    if (err instanceof UnauthorizedError) {
      return NextResponse.json({ error: err.message }, { status: 401 });
    }
    throw err;
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = jobSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", fields: parsed.error.flatten().fieldErrors },
      { status: 422 }
    );
  }
  const input = parsed.data;

  const supabase = getServiceClient();

  const { data: existing } = await supabase.from("jobs").select("slug");
  const slug = makeSlug(input.title, (existing ?? []).map((j) => j.slug));

  const { data: job, error } = await supabase
    .from("jobs")
    .insert({
      slug,
      title: input.title,
      department: input.department,
      location: input.location,
      employment_type: input.employment_type,
      pay_range: input.pay_range ?? null,
      description: input.description,
      requirements: input.requirements ?? null,
      status: input.status,
      posted_at: input.status === "open" ? new Date().toISOString() : null,
      created_by: session.userId,
    })
    .select("*")
    .single();

  if (error || !job) {
    console.error("job insert error:", error?.message);
    return NextResponse.json({ error: "Could not create job" }, { status: 500 });
  }

  // PHASE 5: chunk + embed job text, upsert into content_embeddings (lib/embeddings.ts)

  return NextResponse.json({ job });
}
