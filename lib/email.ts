// Resend wrapper + template dispatch — design doc §3.4, §8.
import { Resend } from "resend";
import { render as applicationConfirmation } from "./email-templates/application-confirmation";
import { render as internalApplicationAlert } from "./email-templates/internal-application-alert";
import { render as contactAcknowledgement } from "./email-templates/contact-acknowledgement";
import { render as internalContactAlert } from "./email-templates/internal-contact-alert";

const FROM = process.env.EMAIL_FROM ?? "BrainTree HR <onboarding@resend.dev>";
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

// Resend's constructor throws immediately if the key is missing/empty —
// which would crash `next build` (it imports route modules to collect
// page data) and every route that imports this file, any time the key
// isn't set yet. Constructing lazily, on first actual send, means the
// project builds and every non-email code path works fine with no key
// configured — email sending is simply a no-op until one is added.
let resendClient: Resend | null = null;
function getResendClient(): Resend | null {
  if (!process.env.RESEND_API_KEY) return null;
  if (!resendClient) resendClient = new Resend(process.env.RESEND_API_KEY);
  return resendClient;
}

// Every send is wrapped so a Resend outage/error (or no key configured
// yet) never takes down the actual form submission — the
// application/contact row is already committed to the database by the
// time these are called; a failed/skipped email is logged, not thrown.
async function safeSend(params: Parameters<Resend["emails"]["send"]>[0]) {
  const client = getResendClient();
  if (!client) {
    console.warn("RESEND_API_KEY not set — skipping email send:", params.subject);
    return;
  }
  try {
    const { error } = await client.emails.send(params);
    if (error) console.error("Resend send error:", error.message);
  } catch (err) {
    console.error("Resend send threw:", err);
  }
}

export async function sendApplicationConfirmation(to: string, roleApplied: string, fullName: string) {
  const { subject, html } = applicationConfirmation({ fullName, roleApplied });
  await safeSend({ from: FROM, to, subject, html });
}

export async function sendInternalApplicationAlert(
  applicationId: string,
  fullName: string,
  roleApplied: string,
  email: string
) {
  const adminAlertEmail = process.env.ADMIN_ALERT_EMAIL;
  if (!adminAlertEmail) return; // not configured yet — skip rather than throw
  const { subject, html } = internalApplicationAlert({
    applicationId,
    fullName,
    roleApplied,
    email,
    adminUrl: SITE_URL,
  });
  await safeSend({ from: FROM, to: adminAlertEmail, subject, html });
}

export async function sendContactAcknowledgement(to: string, topic: string, name: string) {
  const { subject, html } = contactAcknowledgement({ name, topic });
  await safeSend({ from: FROM, to, subject, html });
}

export async function sendInternalContactAlert(
  submissionId: string,
  name: string,
  email: string,
  topic: string
) {
  const adminAlertEmail = process.env.ADMIN_ALERT_EMAIL;
  if (!adminAlertEmail) return;
  const { subject, html } = internalContactAlert({
    submissionId,
    name,
    email,
    topic,
    adminUrl: SITE_URL,
  });
  await safeSend({ from: FROM, to: adminAlertEmail, subject, html });
}
