// POST /api/upload-url — issue a short-lived signed upload URL for a résumé
import { NextRequest, NextResponse } from "next/server";
import { uploadUrlSchema } from "@/lib/validation";
import { createResumeUploadUrl } from "@/lib/storage";
import { allowRequest, getClientIp, hashIp } from "@/lib/rateLimit";

export async function POST(req: NextRequest) {
  const ipHash = hashIp(getClientIp(req.headers));
  const allowed = await allowRequest(ipHash, "upload-url", 10, 600);
  if (!allowed) {
    return NextResponse.json({ error: "Too many requests, try again shortly." }, { status: 429 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = uploadUrlSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", fields: parsed.error.flatten().fieldErrors },
      { status: 422 }
    );
  }

  try {
    const { signedUrl, token, path } = await createResumeUploadUrl(
      parsed.data.fileName,
      parsed.data.contentType,
      ipHash
    );
    return NextResponse.json({ signedUrl, token, path });
  } catch (err) {
    console.error("upload-url error:", err);
    return NextResponse.json({ error: "Could not create upload URL" }, { status: 500 });
  }
}