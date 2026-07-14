import { escapeHtml as esc } from "../escapeHtml";

interface Props {
  applicationId: string;
  fullName: string;
  roleApplied: string;
  email: string;
  adminUrl: string;
}

export function render(
  { applicationId, fullName, roleApplied, email, adminUrl }: Props
): { subject: string; html: string } {
  return {
    subject: `New application: ${esc(fullName)} — ${esc(roleApplied)}`,
    html: `
      <div style="font-family:Arial,sans-serif;max-width:520px;margin:0 auto;color:#15121F;">
        <h3>New application received</h3>
        <p><strong>${esc(fullName)}</strong> (${esc(email)}) applied for <strong>${esc(roleApplied)}</strong>.</p>
        <p><a href="${adminUrl}/admin/applications?id=${applicationId}" style="color:#6B43E8;">Review in the admin portal →</a></p>
      </div>
    `,
  };
}