// POST /api/apply — candidate application submission
// Design doc §5.1, §5.3, §6.1, §11.1
import { NextRequest, NextResponse } from "next/server";
import { applySchema } from "@/lib/validation";
import { verifyResumeMagicBytes } from "@/lib/storage";
import { allowRequest, getClientIp, hashIp } from "@/lib/rateLimit";
import { sendApplicationConfirmation, sendInternalApplicationAlert } from "@/lib/email";
import { getServiceClient } from "@/lib/supabase";

export async function POST(req: NextRequest) {
  const ipHash = hashIp(getClientIp(req.headers));
  const allowed = await allowRequest(ipHash, "apply", 5, 600);
  if (!allowed) {
    return NextResponse.json({ error: "Too many requests, try again shortly." }, { status: 429 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = applySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", fields: parsed.error.flatten().fieldErrors },
      { status: 422 }
    );
  }
  const input = parsed.data;

  // Honeypot: silently accept-and-drop, never surface to the admin portal (§5.4).
  if (input.company_website) {
    return NextResponse.json({ ok: true });
  }

  const magicBytesOk = await verifyResumeMagicBytes(input.resume_path);
  if (!magicBytesOk) {
    return NextResponse.json(
      { error: "That file doesn't look like a valid PDF/DOC/DOCX. Please re-upload." },
      { status: 422 }
    );
  }

  const supabase = getServiceClient();

  // Best-effort link to a live job listing by matching the free-text role
  // against a title — left null if nothing matches, never blocks the
  // application (§4.3, §11.1).
  const { data: matchedJob } = await supabase
    .from("jobs")
    .select("id")
    .ilike("title", input.role)
    .eq("status", "open")
    .maybeSingle();

  const { data: application, error } = await supabase
    .from("applications")
    .insert({
      job_id: matchedJob?.id ?? null,
      role_applied: input.role,
      full_name: input.full_name,
      email: input.email,
      phone: input.phone,
      location: input.location ?? null,
      current_company: input.current_company ?? null,
      years_experience: input.years_experience ?? null,
      linkedin_url: input.linkedin_url || null,
      notice_period: input.notice_period ?? null,
      resume_path: input.resume_path,
      resume_filename: input.resume_filename,
      cover_note: input.cover_note ?? null,
      ip_hash: ipHash,
    })
    .select("id")
    .single();

  if (error || !application) {
    console.error("apply insert error:", error?.message);
    return NextResponse.json({ error: "Could not save application" }, { status: 500 });
  }

  // Fire-and-forget — a slow/failed email should never make the candidate
  // wait or see an error after their application already saved (§8, §11.1).
  void sendApplicationConfirmation(input.email, input.role, input.full_name);
  void sendInternalApplicationAlert(application.id, input.full_name, input.role, input.email);

  return NextResponse.json({ ok: true, applicationId: application.id });
}
