// Applications triage — filter by status, résumé download, status updates.
// Design doc §7.4, §11.1
"use client";

import { useEffect, useState } from "react";
import type { Application, ApplicationStatus } from "@/lib/types";

const STATUSES: ApplicationStatus[] = ["new", "reviewed", "shortlisted", "rejected", "hired"];

const STATUS_PILL: Record<string, { bg: string; text: string }> = {
  new: { bg: "var(--admin-pill-bg-neutral)", text: "var(--admin-pill-text-neutral)" },
  reviewed: { bg: "var(--admin-pill-bg)", text: "var(--admin-pill-text)" },
  shortlisted: { bg: "var(--admin-pill-bg)", text: "var(--admin-pill-text)" },
  rejected: { bg: "var(--admin-pill-bg-neutral)", text: "var(--admin-pill-text-neutral)" },
  hired: { bg: "var(--admin-pill-bg)", text: "var(--admin-pill-text)" },
};

export default function AdminApplicationsPage() {
  const [applications, setApplications] = useState<Application[]>([]);
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    const qs = statusFilter ? `?status=${statusFilter}` : "";
    const res = await fetch(`/api/admin/applications${qs}`);
    const data = await res.json();
    setApplications(data.applications ?? []);
    setLoading(false);
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statusFilter]);

  async function updateStatus(id: string, status: ApplicationStatus) {
    await fetch(`/api/admin/applications/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    load();
  }

  async function downloadResume(id: string) {
    const res = await fetch(`/api/admin/applications/${id}/resume`);
    const data = await res.json();
    if (data.url) window.open(data.url, "_blank");
  }

  const selectStyle = {
    padding: "4px 8px",
    fontSize: 13,
    borderRadius: 6,
    border: "1px solid var(--admin-border)",
    background: "#fff",
    color: "var(--admin-text)",
  };

  const counts = {
    new: applications.filter((a) => a.status === "new").length,
    reviewed: applications.filter((a) => a.status === "reviewed").length,
    shortlisted: applications.filter((a) => a.status === "shortlisted").length,
  };

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 16 }}>
        <h3 style={{ margin: 0, fontSize: 18, fontWeight: 500, color: "var(--admin-text)" }}>Applications</h3>
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} style={selectStyle}>
          <option value="">All statuses</option>
          {STATUSES.map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12, marginBottom: 16 }}>
        {(["new", "reviewed", "shortlisted"] as const).map((s) => (
          <div key={s} style={{ background: "var(--admin-card-bg)", borderRadius: 12, padding: "14px 16px", border: "1px solid var(--admin-border)" }}>
            <div style={{ fontSize: 13, color: "var(--admin-text-muted)", marginBottom: 4, textTransform: "capitalize" }}>{s}</div>
            <div style={{ fontSize: 22, fontWeight: 500, color: "var(--admin-text)" }}>{counts[s]}</div>
          </div>
        ))}
      </div>

      {loading ? (
        <p style={{ color: "var(--admin-text-muted)" }}>Loading…</p>
      ) : (
        <div style={{ background: "var(--admin-card-bg)", borderRadius: 12, border: "1px solid var(--admin-border)", overflow: "hidden" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
            <thead>
              <tr style={{ textAlign: "left", background: "var(--admin-table-header-bg)" }}>
                <th style={{ padding: "10px 16px", fontWeight: 500, color: "var(--admin-text-muted)" }}>Name</th>
                <th style={{ padding: "10px 16px", fontWeight: 500, color: "var(--admin-text-muted)" }}>Role</th>
                <th style={{ padding: "10px 16px", fontWeight: 500, color: "var(--admin-text-muted)" }}>Email</th>
                <th style={{ padding: "10px 16px", fontWeight: 500, color: "var(--admin-text-muted)" }}>Status</th>
                <th style={{ padding: "10px 16px", fontWeight: 500, color: "var(--admin-text-muted)" }}>Résumé</th>
              </tr>
            </thead>
            <tbody>
              {applications.map((app) => {
                const pill = STATUS_PILL[app.status] ?? STATUS_PILL.new;
                return (
                  <tr key={app.id} style={{ borderTop: "1px solid var(--admin-border)" }}>
                    <td style={{ padding: "10px 16px", color: "var(--admin-text)" }}>{app.full_name}</td>
                    <td style={{ padding: "10px 16px", color: "var(--admin-text)" }}>{app.role_applied}</td>
                    <td style={{ padding: "10px 16px", color: "var(--admin-text)" }}>{app.email}</td>
                    <td style={{ padding: "10px 16px" }}>
                      <select
                        value={app.status}
                        onChange={(e) => updateStatus(app.id, e.target.value as ApplicationStatus)}
                        style={selectStyle}
                      >
                        {STATUSES.map((s) => (
                          <option key={s} value={s}>{s}</option>
                        ))}
                      </select>
                    </td>
                    <td style={{ padding: "10px 16px" }}>
                      <button
                        onClick={() => downloadResume(app.id)}
                        style={{ cursor: "pointer", color: "var(--admin-accent)", background: "none", border: "none", fontSize: 13, padding: 0 }}
                      >
                        Download
                      </button>
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