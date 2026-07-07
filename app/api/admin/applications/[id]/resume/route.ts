// GET /api/admin/applications/:id/resume — short-lived signed download URL
// Design doc §5.2, §6.3, §11.5
import { NextRequest, NextResponse } from "next/server";
import { requireStaffSession, UnauthorizedError } from "@/lib/auth";
import { createResumeDownloadUrl } from "@/lib/storage";
import { getServiceClient } from "@/lib/supabase";

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    await requireStaffSession();
  } catch (err) {
    if (err instanceof UnauthorizedError) {
      return NextResponse.json({ error: err.message }, { status: 401 });
    }
    throw err;
  }

  const supabase = getServiceClient();
  const { data: application, error } = await supabase
    .from("applications")
    .select("resume_path")
    .eq("id", params.id)
    .single();

  if (error || !application) {
    return NextResponse.json({ error: "Application not found" }, { status: 404 });
  }

  try {
    const url = await createResumeDownloadUrl(application.resume_path);
    return NextResponse.json({ url });
  } catch (err) {
    console.error("resume download url error:", err);
    return NextResponse.json({ error: "Could not create download URL" }, { status: 500 });
  }
}
