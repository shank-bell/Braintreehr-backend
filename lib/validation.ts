// Request validation — design doc §5.3, §11.1-11.3.
// Every field here maps directly to the existing frontend forms
// (Apply.html, Contact.html) — see the field audit in the backend design
// doc §1.1. Server-side validation is required regardless of what the
// browser already checks (§12.3) — never trust client input.
import { z } from "zod";

// ---------------------------------------------------------------------
// Public: /api/apply
// ---------------------------------------------------------------------
// Accepts "linkedin.com/in/x" as readily as "https://linkedin.com/in/x" —
// almost nobody types the protocol into a form field by hand.
const linkedinUrlSchema = z
  .string()
  .trim()
  .transform((val) => (val === "" ? val : /^https?:\/\//i.test(val) ? val : `https://${val}`))
  .pipe(z.string().url().max(300))
  .or(z.literal(""));
export const applySchema = z.object({
  full_name: z.string().trim().min(2).max(120),
  email: z.string().trim().email(),
  phone: z.string().trim().min(6).max(20),
  location: z.string().trim().max(160).optional(),
  role: z.string().trim().min(2).max(160),
  current_company: z.string().trim().max(160).optional(),
  years_experience: z.string().trim().max(40).optional(),
  linkedin_url: linkedinUrlSchema.optional(),
  notice_period: z.string().trim().max(40).optional(),
  // Must match the exact shape createResumeUploadUrl() generates:
  //   <epoch>-<uuid>-<filename>.<pdf|doc|docx>
  // [^/\\] blocks path traversal; the prefix blocks pointing at arbitrary
  // bucket objects. (#1)
  resume_path: z
    .string()
    .trim()
    .min(1, "Résumé upload is required")
    .regex(
      /^\d{10,}-[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}-[^/\\]+\.(pdf|doc|docx)$/i,
      "Invalid résumé reference"
    ),
  resume_filename: z.string().trim().min(1),
  cover_note: z.string().trim().max(2000).optional(),
  // honeypot — real users never fill this in (§5.4); if present, the
  // route handler accepts the request but silently drops it.
  company_website: z.string().max(0).optional(),
});
export type ApplyInput = z.infer<typeof applySchema>;

// ---------------------------------------------------------------------
// Public: /api/contact
// ---------------------------------------------------------------------
export const contactTopicEnum = z.enum(["hire", "job_seeker", "press", "partnership", "other"]);

export const contactSchema = z.object({
  name: z.string().trim().min(2).max(120),
  email: z.string().trim().email(),
  company: z.string().trim().max(160).optional(),
  topic: contactTopicEnum,
  // Only meaningful when topic === "hire" — the frontend only shows this
  // field in that case, but we don't enforce that coupling server-side;
  // an unrelated value here is harmless.
  budget_band: z.string().trim().max(60).optional(),
  message: z.string().trim().max(4000).optional(),
  company_website: z.string().max(0).optional(), // honeypot
});
export type ContactInput = z.infer<typeof contactSchema>;

// ---------------------------------------------------------------------
// Public: /api/upload-url
// ---------------------------------------------------------------------
export const ALLOWED_RESUME_EXTENSIONS = [".pdf", ".doc", ".docx"] as const;
export const MAX_RESUME_BYTES = 10 * 1024 * 1024; // 10MB — matches the Apply.html copy

export const uploadUrlSchema = z.object({
  fileName: z.string().trim().min(1).max(200).refine(
    (name) => ALLOWED_RESUME_EXTENSIONS.some((ext) => name.toLowerCase().endsWith(ext)),
    { message: `File must be one of: ${ALLOWED_RESUME_EXTENSIONS.join(", ")}` }
  ),
  contentType: z.string().trim().min(1).max(120),
  fileSizeBytes: z.number().int().positive().max(MAX_RESUME_BYTES),
});
export type UploadUrlInput = z.infer<typeof uploadUrlSchema>;

// chatSchema removed for now — comes back in Phase 5 alongside /api/chat.

// ---------------------------------------------------------------------
// Admin: jobs
// ---------------------------------------------------------------------
export const jobStatusEnum = z.enum(["draft", "open", "closed"]);
export const employmentTypeEnum = z.enum(["Full-time", "Contract"]);

export const jobSchema = z.object({
  title: z.string().trim().min(2).max(160),
  department: z.string().trim().min(2).max(80),
  location: z.string().trim().min(2).max(160),
  employment_type: employmentTypeEnum,
  pay_range: z.string().trim().max(80).optional(),
  description: z.string().trim().min(10).max(8000),
  requirements: z.string().trim().max(8000).optional(),
  status: jobStatusEnum.default("draft"),
});
export type JobInput = z.infer<typeof jobSchema>;

export const jobUpdateSchema = jobSchema.partial();
export type JobUpdateInput = z.infer<typeof jobUpdateSchema>;

// ---------------------------------------------------------------------
// Admin: application status updates
// ---------------------------------------------------------------------
export const applicationStatusEnum = z.enum([
  "new",
  "reviewed",
  "shortlisted",
  "rejected",
  "hired",
]);

export const applicationStatusUpdateSchema = z.object({
  status: applicationStatusEnum,
});
export type ApplicationStatusUpdateInput = z.infer<typeof applicationStatusUpdateSchema>;

// ---------------------------------------------------------------------
// Admin: contact/lead status updates
// ---------------------------------------------------------------------
export const contactStatusEnum = z.enum(["new", "responded", "archived"]);

export const contactStatusUpdateSchema = z.object({
  status: contactStatusEnum,
});
export type ContactStatusUpdateInput = z.infer<typeof contactStatusUpdateSchema>;

// ---------------------------------------------------------------------
// Shared: query-param parsing helpers (kept simple — Zod isn't a great
// fit for URLSearchParams directly, so route handlers call these after
// pulling values out of req.nextUrl.searchParams).
// ---------------------------------------------------------------------
export const paginationQuerySchema = z.object({
  cursor: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(100).default(25),
});
