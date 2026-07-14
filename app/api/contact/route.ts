// POST /api/contact — contact / hiring-lead submission
import { NextRequest, NextResponse } from "next/server";
import { contactSchema } from "@/lib/validation";
import { allowRequest, getClientIp, hashIp } from "@/lib/rateLimit";
import { verifyTurnstile } from "@/lib/turnstile";
import { sendContactAcknowledgement, sendInternalContactAlert } from "@/lib/email";
import { getServiceClient } from "@/lib/supabase";

export async function POST(req: NextRequest) {
  const ipHash = hashIp(getClientIp(req.headers));
  const allowed = await allowRequest(ipHash, "contact", 5, 600, true); // fail closed (#3)
  if (!allowed) {
    return NextResponse.json({ error: "Too many requests, try again shortly." }, { status: 429 });
  }

  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const humanOk = await verifyTurnstile(body?.captchaToken, getClientIp(req.headers));
  if (!humanOk) {
    return NextResponse.json({ error: "Verification failed. Please try again." }, { status: 403 });
  }

  const parsed = contactSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", fields: parsed.error.flatten().fieldErrors },
      { status: 422 }
    );
  }
  const input = parsed.data;

  if (input.company_website) {
    return NextResponse.json({ ok: true }); // honeypot
  }

  const supabase = getServiceClient();
  const { data: submission, error } = await supabase
    .from("contact_submissions")
    .insert({
      name: input.name,
      email: input.email,
      company: input.company ?? null,
      topic: input.topic,
      budget_band: input.budget_band ?? null,
      message: input.message ?? null,
    })
    .select("id")
    .single();

  if (error || !submission) {
    console.error("contact insert error:", error?.message);
    return NextResponse.json({ error: "Could not save submission" }, { status: 500 });
  }

  void sendContactAcknowledgement(input.email, input.topic, input.name);
  void sendInternalContactAlert(submission.id, input.name, input.email, input.topic);

  return NextResponse.json({ ok: true });
}