import { escapeHtml as esc } from "../escapeHtml";

interface Props {
  submissionId: string;
  name: string;
  email: string;
  topic: string;
  adminUrl: string;
}

export function render(
  { submissionId, name, email, topic, adminUrl }: Props
): { subject: string; html: string } {
  return {
    subject: `New lead (${esc(topic)}): ${esc(name)}`,
    html: `
      <div style="font-family:Arial,sans-serif;max-width:520px;margin:0 auto;color:#15121F;">
        <h3>New contact submission</h3>
        <p><strong>${esc(name)}</strong> (${esc(email)}) — topic: <strong>${esc(topic)}</strong></p>
        <p><a href="${adminUrl}/admin/leads?id=${submissionId}" style="color:#6B43E8;">Review in the admin portal →</a></p>
      </div>
    `,
  };
}