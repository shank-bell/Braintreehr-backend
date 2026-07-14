// Supabase Storage signed URL helpers — design doc §6.1, §6.2, §6.3.
import { getServiceClient } from "./supabase";
import { ALLOWED_RESUME_EXTENSIONS, MAX_RESUME_BYTES } from "./validation";

const RESUME_BUCKET = "resumes";

const MAGIC_BYTES: Record<string, number[][]> = {
  pdf: [[0x25, 0x50, 0x44, 0x46]], // %PDF
  doc: [[0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1]],
  docx: [[0x50, 0x4b, 0x03, 0x04]], // PK.. (zip)
};

function getExtension(fileName: string): string {
  const match = fileName.toLowerCase().match(/\.([a-z0-9]+)$/);
  return match?.[1] ?? "";
}

/**
 * Issues a short-lived signed upload URL for a résumé AND records the
 * generated path bound to the caller's IP hash, so /api/apply can later
 * confirm the path was one we actually issued (and consume it once).
 */
export async function createResumeUploadUrl(
  fileName: string,
  _contentType: string,
  ipHash: string
) {
  const ext = getExtension(fileName);
  if (!ALLOWED_RESUME_EXTENSIONS.includes(`.${ext}` as (typeof ALLOWED_RESUME_EXTENSIONS)[number])) {
    throw new Error(`Unsupported file type: .${ext}`);
  }

  const supabase = getServiceClient();
  const path = `${Date.now()}-${crypto.randomUUID()}-${fileName}`;

  const { data, error } = await supabase.storage
    .from(RESUME_BUCKET)
    .createSignedUploadUrl(path);

  if (error || !data) {
    throw new Error(`Failed to create upload URL: ${error?.message ?? "unknown error"}`);
  }

  // Record the path we handed out, bound to this IP. (#1)
  const { error: trackErr } = await (supabase as any)
    .from("issued_uploads")
    .insert({ path, ip_hash: ipHash });
  if (trackErr) {
    throw new Error(`Failed to record upload token: ${trackErr.message}`);
  }

  return { signedUrl: data.signedUrl, token: data.token, path };
}

/**
 * Verify `path` was issued by us to this IP, and consume it (one-time).
 * Returns false if it wasn't issued, was already used, or IP doesn't match.
 */
export async function consumeIssuedUpload(path: string, ipHash: string): Promise<boolean> {
  const supabase = getServiceClient();
  const { data, error } = await (supabase as any)
    .from("issued_uploads")
    .delete()
    .eq("path", path)
    .eq("ip_hash", ipHash)
    .select("path")
    .maybeSingle();

  if (error) {
    console.error("consumeIssuedUpload error:", error.message);
    return false;
  }
  return !!data;
}

/** Short-lived signed GET URL for admin résumé review (§6.3, §11.5). */
export async function createResumeDownloadUrl(path: string) {
  const supabase = getServiceClient();
  const { data, error } = await supabase.storage
    .from(RESUME_BUCKET)
    .createSignedUrl(path, 60 * 5);

  if (error || !data) {
    throw new Error(`Failed to create download URL: ${error?.message ?? "unknown error"}`);
  }
  return data.signedUrl;
}

export async function verifyResumeMagicBytes(path: string): Promise<boolean> {
  const supabase = getServiceClient();
  const { data, error } = await supabase.storage.from(RESUME_BUCKET).download(path);
  if (error || !data) return false;

  const buf = new Uint8Array(await data.slice(0, 8).arrayBuffer());
  const ext = getExtension(path.split("-").slice(2).join("-"));
  const signatures = MAGIC_BYTES[ext === "doc" ? "doc" : ext === "docx" ? "docx" : "pdf"] ?? [];
  return signatures.some((sig) => sig.every((byte, i) => buf[i] === byte));
}

export async function deleteResume(path: string): Promise<void> {
  const supabase = getServiceClient();
  await supabase.storage.from(RESUME_BUCKET).remove([path]);
}

export { MAX_RESUME_BYTES };