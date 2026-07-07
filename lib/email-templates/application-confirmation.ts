// Design doc §8.1, §8.3 — on-brand HTML, versioned in-repo.
interface Props {
  fullName: string;
  roleApplied: string;
}

export function render({ fullName, roleApplied }: Props): { subject: string; html: string } {
  return {
    subject: `We've received your application for ${roleApplied}`,
    html: `
      <div style="font-family:Arial,sans-serif;max-width:520px;margin:0 auto;color:#15121F;">
        <div style="background:#08070D;padding:24px;border-radius:12px 12px 0 0;">
          <span style="color:#F5F3FA;font-size:18px;font-weight:bold;">BrainTree<span style="color:#6B43E8;">HR</span></span>
        </div>
        <div style="padding:28px;background:#F5F3FA;border-radius:0 0 12px 12px;">
          <h2 style="margin-top:0;">Hi ${fullName},</h2>
          <p>Thanks for applying to <strong>${roleApplied}</strong> at BrainTree HR. A recruiter reviews every application personally — expect to hear back within a few working days.</p>
          <p style="margin-top:24px;color:#56516A;font-size:13px;">We're paid by hiring companies, never by candidates. Your details stay confidential.</p>
        </div>
      </div>
    `,
  };
}
