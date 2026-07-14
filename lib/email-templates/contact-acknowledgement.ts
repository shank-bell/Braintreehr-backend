import { escapeHtml as esc } from "../escapeHtml";

interface Props {
  name: string;
  topic: string;
}

const TOPIC_LABELS: Record<string, string> = {
  hire: "hiring inquiry",
  job_seeker: "job seeker inquiry",
  press: "press inquiry",
  partnership: "partnership inquiry",
  other: "message",
};

export function render({ name, topic }: Props): { subject: string; html: string } {
  const label = TOPIC_LABELS[topic] ?? "message";
  return {
    subject: "We've got your message",
    html: `
      <div style="font-family:Arial,sans-serif;max-width:520px;margin:0 auto;color:#15121F;">
        <div style="background:#08070D;padding:24px;border-radius:12px 12px 0 0;">
          <span style="color:#F5F3FA;font-size:18px;font-weight:bold;">BrainTree<span style="color:#6B43E8;">HR</span></span>
        </div>
        <div style="padding:28px;background:#F5F3FA;border-radius:0 0 12px 12px;">
          <h2 style="margin-top:0;">Hi ${esc(name)},</h2>
          <p>Thanks for your ${label} — a real person on our team will get back to you, typically within a few working hours.</p>
        </div>
      </div>
    `,
  };
}