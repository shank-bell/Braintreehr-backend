// GET /api/jobs/:slug — single job detail
// Design doc §5.1
import { NextRequest, NextResponse } from "next/server";
import { getServiceClient } from "@/lib/supabase";

export async function GET(req: NextRequest, { params }: { params: { slug: string } }) {
  const supabase = getServiceClient();
  const { data: job, error } = await supabase
    .from("jobs")
    .select("*")
    .eq("slug", params.slug)
    .eq("status", "open")
    .single();

  if (error || !job) {
    return NextResponse.json({ error: "Job not found" }, { status: 404 });
  }
  return NextResponse.json({ job });
}
