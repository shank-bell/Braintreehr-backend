// Supabase Storage signed URL helpers — design doc §6.1, §6.2, §6.3.
import { getServiceClient } from "./supabase";
import { ALLOWED_RESUME_EXTENSIONS, MAX_RESUME_BYTES } from "./validation";

const RESUME_BUCKET = "resumes";

// First bytes of each allowed file type — used to verify a file's real
// content, not just its declared extension/content-type (§6.2, §11.3).
const MAGIC_BYTES: Record<string, number[][]> = {
  pdf: [[0x25, 0x50, 0x44, 0x46]], // %PDF
  // .doc (legacy binary OLE format) and .docx (a zip) have different
  // signatures; docx is far more common today but both are accepted
  // since the form's accept attribute allows both.
  doc: [[0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1]],
  docx: [[0x50, 0x4b, 0x03, 0x04]], // PK.. (zip)
};

function getExtension(fileName: string): string {
  const match = fileName.toLowerCase().match(/\.([a-z0-9]+)$/);
  return match?.[1] ?? "";
}

/**
 * Issues a short-lived signed upload URL for a résumé. The browser
 * uploads directly to Storage with this URL — the file never passes
 * through a Next.js route handler body, which has a 4.5MB hard limit
 * well below the 10MB résumé cap already advertised on Apply.html (§6.1).
 */
export async function createResumeUploadUrl(fileName: string, contentType: string) {
  const ext = getExtension(fileName);
  if (!ALLOWED_RESUME_EXTENSIONS.includes(`.${ext}` as (typeof ALLOWED_RESUME_EXTENSIONS)[number])) {
    throw new Error(`Unsupported file type: .${ext}`);
  }

  const supabase = getServiceClient();
  // Path includes a random-ish prefix (timestamp) so two candidates
  // uploading "Resume.pdf" on the same day never collide.
  const path = `${Date.now()}-${crypto.randomUUID()}-${fileName}`;

  const { data, error } = await supabase.storage
    .from(RESUME_BUCKET)
    .createSignedUploadUrl(path);

  if (error || !data) {
    throw new Error(`Failed to create upload URL: ${error?.message ?? "unknown error"}`);
  }

  return { signedUrl: data.signedUrl, token: data.token, path };
}

/**
 * Short-lived signed GET URL for admin résumé review (§6.3, §11.5).
 * Never a public/permanent URL — expires in 5 minutes.
 */
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

/**
 * Downloads the first bytes of an uploaded résumé and checks them
 * against known file signatures (§6.2) — the declared content-type is
 * never trusted, since it's trivial for a client to lie about it.
 */
export async function verifyResumeMagicBytes(path: string): Promise<boolean> {
  const supabase = getServiceClient();
  const { data, error } = await supabase.storage.from(RESUME_BUCKET).download(path);

  if (error || !data) return false;

  const buf = new Uint8Array(await data.slice(0, 8).arrayBuffer());
  const ext = getExtension(path.split("-").slice(2).join("-")); // strip our timestamp-uuid prefix

  const signatures = MAGIC_BYTES[ext === "doc" ? "doc" : ext === "docx" ? "docx" : "pdf"] ?? [];
  return signatures.some((sig) => sig.every((byte, i) => buf[i] === byte));
}

export async function deleteResume(path: string): Promise<void> {
  const supabase = getServiceClient();
  await supabase.storage.from(RESUME_BUCKET).remove([path]);
}

export { MAX_RESUME_BYTES };
