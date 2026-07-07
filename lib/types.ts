// Shared types mirroring the Postgres schema — design doc §4.
// Keep these in sync with supabase/migrations/*.sql; there's no ORM/codegen
// layer in this stack (§3.6), so this file is the single source of truth
// for shapes used across route handlers and the admin portal.

export type JobStatus = "draft" | "open" | "closed";
export type EmploymentType = "Full-time" | "Contract";

export interface Job {
  id: string;
  slug: string;
  title: string;
  department: string;
  location: string;
  employment_type: EmploymentType;
  pay_range: string | null;
  description: string;
  requirements: string | null;
  status: JobStatus;
  posted_at: string | null;
  created_by: string | null;
  updated_at: string;
}

export type ApplicationStatus = "new" | "reviewed" | "shortlisted" | "rejected" | "hired";

export interface Application {
  id: string;
  job_id: string | null;
  role_applied: string;
  full_name: string;
  email: string;
  phone: string;
  location: string | null;
  current_company: string | null;
  years_experience: string | null;
  linkedin_url: string | null;
  notice_period: string | null;
  resume_path: string;
  resume_filename: string;
  cover_note: string | null;
  status: ApplicationStatus;
  ip_hash: string;
  submitted_at: string;
}

export type ContactTopic = "hire" | "job_seeker" | "press" | "partnership" | "other";
export type ContactStatus = "new" | "responded" | "archived";

export interface ContactSubmission {
  id: string;
  name: string;
  email: string;
  company: string | null;
  topic: ContactTopic;
  budget_band: string | null;
  message: string | null;
  status: ContactStatus;
  submitted_at: string;
}

export type StaffRole = "admin" | "recruiter";

export interface StaffProfile {
  id: string; // == auth.users.id
  full_name: string;
  role: StaffRole;
  created_at: string;
}

// ChatConversation, ChatMessage, ContentEmbedding types intentionally
// removed for now — those tables don't exist until the Phase 5 migration.
// They'll come back here alongside that migration.
