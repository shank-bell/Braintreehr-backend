// POST /api/apply — candidate application submission
import { NextRequest, NextResponse } from "next/server";
import { applySchema } from "@/lib/validation";
import { verifyResumeMagicBytes, consumeIssuedUpload } from "@/lib/storage";
import { allowRequest, getClientIp, hashIp } from "@/lib/rateLimit";
import { verifyTurnstile } from "@/lib/turnstile";
import { sendApplicationConfirmation, sendInternalApplicationAlert } from "@/lib/email";
import { getServiceClient } from "@/lib/supabase";

export async function POST(req: NextRequest) {
  const ipHash = hashIp(getClientIp(req.headers));
  const allowed = await allowRequest(ipHash, "apply", 5, 600, true); // fail closed (#3)
  if (!allowed) {
    return NextResponse.json({ error: "Too many requests, try again shortly." }, { status: 429 });
  }

  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  // Bot check — no-op unless TURNSTILE_SECRET_KEY is set (#3).
  const humanOk = await verifyTurnstile(body?.captchaToken, getClientIp(req.headers));
  if (!humanOk) {
    return NextResponse.json({ error: "Verification failed. Please try again." }, { status: 403 });
  }

  const parsed = applySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", fields: parsed.error.flatten().fieldErrors },
      { status: 422 }
    );
  }
  const input = parsed.data;

  // Honeypot: silently accept-and-drop (§5.4).
  if (input.company_website) {
    return NextResponse.json({ ok: true });
  }

  // (#1) Only accept a résumé path we issued to THIS IP, and consume it once.
  const pathOk = await consumeIssuedUpload(input.resume_path, ipHash);
  if (!pathOk) {
    return NextResponse.json(
      { error: "Résumé reference is invalid or expired. Please re-upload." },
      { status: 422 }
    );
  }

  const magicBytesOk = await verifyResumeMagicBytes(input.resume_path);
  if (!magicBytesOk) {
    return NextResponse.json(
      { error: "That file doesn't look like a valid PDF/DOC/DOCX. Please re-upload." },
      { status: 422 }
    );
  }

  const supabase = getServiceClient();

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

  void sendApplicationConfirmation(input.email, input.role, input.full_name);
  void sendInternalApplicationAlert(application.id, input.full_name, input.role, input.email);

  return NextResponse.json({ ok: true, applicationId: application.id });
}