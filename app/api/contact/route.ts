// POST /api/contact — contact / hiring-lead submission
// Design doc §5.1, §5.3, §11.3
import { NextRequest, NextResponse } from "next/server";
import { contactSchema } from "@/lib/validation";
import { allowRequest, getClientIp, hashIp } from "@/lib/rateLimit";
import { sendContactAcknowledgement, sendInternalContactAlert } from "@/lib/email";
import { getServiceClient } from "@/lib/supabase";

export async function POST(req: NextRequest) {
  const ipHash = hashIp(getClientIp(req.headers));
  const allowed = await allowRequest(ipHash, "contact", 5, 600);
  if (!allowed) {
    return NextResponse.json({ error: "Too many requests, try again shortly." }, { status: 429 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
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
    return NextResponse.json({ ok: true }); // honeypot, §5.4
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
