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
    subject: `New application: ${fullName} — ${roleApplied}`,
    html: `
      <div style="font-family:Arial,sans-serif;max-width:520px;margin:0 auto;color:#15121F;">
        <h3>New application received</h3>
        <p><strong>${fullName}</strong> (${email}) applied for <strong>${roleApplied}</strong>.</p>
        <p><a href="${adminUrl}/admin/applications?id=${applicationId}" style="color:#6B43E8;">Review in the admin portal →</a></p>
      </div>
    `,
  };
}
