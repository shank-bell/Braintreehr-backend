// PUT    /api/admin/jobs/:id — edit a job posting
// DELETE /api/admin/jobs/:id — remove a job posting
// Design doc §5.2. Re-embedding on edit / embedding cleanup on delete
// (both §9.4) are Phase 5; both handlers work fully without that step.
import { NextRequest, NextResponse } from "next/server";
import { requireStaffSession, UnauthorizedError } from "@/lib/auth";
import { jobUpdateSchema } from "@/lib/validation";
import { getServiceClient } from "@/lib/supabase";
import type { Database } from "@/lib/database.types";

type JobUpdate = Database["public"]["Tables"]["jobs"]["Update"];

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    await requireStaffSession();
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

  const parsed = jobUpdateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", fields: parsed.error.flatten().fieldErrors },
      { status: 422 }
    );
  }

  const supabase = getServiceClient();
  const updates: JobUpdate = { ...parsed.data };
  if (parsed.data.status === "open") {
    updates.posted_at = new Date().toISOString();
  }

  const { data: job, error } = await supabase
    .from("jobs")
    .update(updates)
    .eq("id", params.id)
    .select("*")
    .single();

  if (error || !job) {
    console.error("job update error:", error?.message);
    return NextResponse.json({ error: "Could not update job" }, { status: 500 });
  }

  // PHASE 5: re-embed via lib/embeddings.ts

  return NextResponse.json({ job });
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    await requireStaffSession();
  } catch (err) {
    if (err instanceof UnauthorizedError) {
      return NextResponse.json({ error: err.message }, { status: 401 });
    }
    throw err;
  }

  const supabase = getServiceClient();
  const { error } = await supabase.from("jobs").delete().eq("id", params.id);

  if (error) {
    return NextResponse.json({ error: "Could not delete job" }, { status: 500 });
  }

  // PHASE 5: also delete its content_embeddings rows via lib/embeddings.ts

  return NextResponse.json({ ok: true });
}
