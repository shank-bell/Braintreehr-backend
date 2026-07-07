// Contact/lead inbox — filter by topic, status tracking.
// Design doc §7.4, §11.3
"use client";

import { useEffect, useState } from "react";
import type { ContactSubmission, ContactStatus } from "@/lib/types";

const STATUSES: ContactStatus[] = ["new", "responded", "archived"];

const STATUS_PILL: Record<string, { bg: string; text: string }> = {
  new: { bg: "var(--admin-pill-bg-neutral)", text: "var(--admin-pill-text-neutral)" },
  responded: { bg: "var(--admin-pill-bg)", text: "var(--admin-pill-text)" },
  archived: { bg: "var(--admin-pill-bg-neutral)", text: "var(--admin-pill-text-neutral)" },
};

export default function AdminLeadsPage() {
  const [leads, setLeads] = useState<ContactSubmission[]>([]);
  const [topicFilter, setTopicFilter] = useState("");
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    const qs = topicFilter ? `?topic=${topicFilter}` : "";
    const res = await fetch(`/api/admin/contact${qs}`);
    const data = await res.json();
    setLeads(data.leads ?? []);
    setLoading(false);
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [topicFilter]);

  async function updateStatus(id: string, status: ContactStatus) {
    await fetch(`/api/admin/contact/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    load();
  }

  const selectStyle = {
    padding: "4px 8px",
    fontSize: 13,
    borderRadius: 6,
    border: "1px solid var(--admin-border)",
    background: "#fff",
    color: "var(--admin-text)",
  };

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 16 }}>
        <h3 style={{ margin: 0, fontSize: 18, fontWeight: 500, color: "var(--admin-text)" }}>Leads</h3>
        <select value={topicFilter} onChange={(e) => setTopicFilter(e.target.value)} style={selectStyle}>
          <option value="">All topics</option>
          <option value="hire">Hire</option>
          <option value="job_seeker">Job seeker</option>
          <option value="press">Press</option>
          <option value="partnership">Partnership</option>
          <option value="other">Other</option>
        </select>
      </div>

      {loading ? (
        <p style={{ color: "var(--admin-text-muted)" }}>Loading…</p>
      ) : (
        <div style={{ background: "var(--admin-card-bg)", borderRadius: 12, border: "1px solid var(--admin-border)", overflow: "hidden" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
            <thead>
              <tr style={{ textAlign: "left", background: "var(--admin-table-header-bg)" }}>
                <th style={{ padding: "10px 16px", fontWeight: 500, color: "var(--admin-text-muted)" }}>Name</th>
                <th style={{ padding: "10px 16px", fontWeight: 500, color: "var(--admin-text-muted)" }}>Company</th>
                <th style={{ padding: "10px 16px", fontWeight: 500, color: "var(--admin-text-muted)" }}>Topic</th>
                <th style={{ padding: "10px 16px", fontWeight: 500, color: "var(--admin-text-muted)" }}>Message</th>
                <th style={{ padding: "10px 16px", fontWeight: 500, color: "var(--admin-text-muted)" }}>Status</th>
              </tr>
            </thead>
            <tbody>
              {leads.map((lead) => {
                const pill = STATUS_PILL[lead.status] ?? STATUS_PILL.new;
                return (
                  <tr key={lead.id} style={{ borderTop: "1px solid var(--admin-border)" }}>
                    <td style={{ padding: "10px 16px", color: "var(--admin-text)" }}>
                      {lead.name}
                      <br />
                      <small style={{ color: "var(--admin-text-muted)" }}>{lead.email}</small>
                    </td>
                    <td style={{ padding: "10px 16px", color: "var(--admin-text)" }}>{lead.company ?? "—"}</td>
                    <td style={{ padding: "10px 16px", color: "var(--admin-text)" }}>{lead.topic}</td>
                    <td style={{ padding: "10px 16px", maxWidth: 300, color: "var(--admin-text)" }}>{lead.message ?? "—"}</td>
                    <td style={{ padding: "10px 16px" }}>
                      <select
                        value={lead.status}
                        onChange={(e) => updateStatus(lead.id, e.target.value as ContactStatus)}
                        style={selectStyle}
                      >
                        {STATUSES.map((s) => (
                          <option key={s} value={s}>{s}</option>
                        ))}
                      </select>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}