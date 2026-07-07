// Job postings management — create/edit/publish/close/delete.
// Design doc §7.4, §11.2
"use client";

import { useEffect, useState } from "react";
import type { Job } from "@/lib/types";

const EMPTY_FORM = {
  title: "",
  department: "",
  location: "",
  employment_type: "Full-time",
  pay_range: "",
  description: "",
  requirements: "",
  status: "draft",
};

const STATUS_PILL: Record<string, { bg: string; text: string }> = {
  open: { bg: "var(--admin-pill-bg)", text: "var(--admin-pill-text)" },
  draft: { bg: "var(--admin-pill-bg-neutral)", text: "var(--admin-pill-text-neutral)" },
  closed: { bg: "var(--admin-pill-bg-neutral)", text: "var(--admin-pill-text-neutral)" },
};

export default function AdminJobsPage() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState(EMPTY_FORM);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function loadJobs() {
    setLoading(true);
    const res = await fetch("/api/admin/jobs");
    const data = await res.json();
    setJobs(data.jobs ?? []);
    setLoading(false);
  }

  useEffect(() => {
    loadJobs();
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const url = editingId ? `/api/admin/jobs/${editingId}` : "/api/admin/jobs";
    const method = editingId ? "PUT" : "POST";

    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });

    if (!res.ok) {
      const data = await res.json();
      const fieldErrors = data.fields
        ? " — " + Object.entries(data.fields).map(([k, v]) => `${k}: ${v}`).join("; ")
        : "";
      setError((data.error ?? "Something went wrong") + fieldErrors);
      return;
    }

    setForm(EMPTY_FORM);
    setEditingId(null);
    loadJobs();
  }

  function startEdit(job: Job) {
    setEditingId(job.id);
    setForm({
      title: job.title,
      department: job.department,
      location: job.location,
      employment_type: job.employment_type,
      pay_range: job.pay_range ?? "",
      description: job.description,
      requirements: job.requirements ?? "",
      status: job.status,
    });
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this job posting?")) return;
    await fetch(`/api/admin/jobs/${id}`, { method: "DELETE" });
    loadJobs();
  }

  const inputStyle = {
    display: "block",
    width: "100%",
    padding: "8px 10px",
    marginBottom: 10,
    borderRadius: 8,
    border: "1px solid var(--admin-border)",
    background: "#fff",
    color: "var(--admin-text)",
    fontSize: 14,
  };

  const counts = {
    draft: jobs.filter((j) => j.status === "draft").length,
    open: jobs.filter((j) => j.status === "open").length,
    closed: jobs.filter((j) => j.status === "closed").length,
  };

  return (
    <div style={{ display: "grid", gridTemplateColumns: "360px 1fr", gap: 24 }}>
      <form
        onSubmit={handleSubmit}
        style={{ background: "var(--admin-card-bg)", padding: 20, borderRadius: 12, border: "1px solid var(--admin-border)" }}
      >
        <h3 style={{ marginTop: 0, fontSize: 15, fontWeight: 500 }}>{editingId ? "Edit job" : "New job"}</h3>
        <input style={inputStyle} placeholder="Title" required value={form.title}
          onChange={(e) => setForm({ ...form, title: e.target.value })} />
        <input style={inputStyle} placeholder="Department" required value={form.department}
          onChange={(e) => setForm({ ...form, department: e.target.value })} />
        <input style={inputStyle} placeholder="Location" required value={form.location}
          onChange={(e) => setForm({ ...form, location: e.target.value })} />
        <select style={inputStyle} value={form.employment_type}
          onChange={(e) => setForm({ ...form, employment_type: e.target.value })}>
          <option>Full-time</option>
          <option>Contract</option>
        </select>
        <input style={inputStyle} placeholder="Pay range (optional)" value={form.pay_range}
          onChange={(e) => setForm({ ...form, pay_range: e.target.value })} />
        <textarea style={{ ...inputStyle, minHeight: 80 }} placeholder="Description" required value={form.description}
          onChange={(e) => setForm({ ...form, description: e.target.value })} />
        <textarea style={{ ...inputStyle, minHeight: 60 }} placeholder="Requirements (optional)" value={form.requirements}
          onChange={(e) => setForm({ ...form, requirements: e.target.value })} />
        <select style={inputStyle} value={form.status}
          onChange={(e) => setForm({ ...form, status: e.target.value })}>
          <option value="draft">Draft</option>
          <option value="open">Open</option>
          <option value="closed">Closed</option>
        </select>

        {error && <p style={{ color: "var(--admin-danger)", fontSize: 13 }}>{error}</p>}

        <button
          type="submit"
          style={{ padding: "8px 16px", borderRadius: 999, border: "none", background: "var(--admin-accent)", color: "#fff", fontWeight: 500, cursor: "pointer", fontSize: 14 }}
        >
          {editingId ? "Save changes" : "Create job"}
        </button>
        {editingId && (
          <button
            type="button"
            onClick={() => { setEditingId(null); setForm(EMPTY_FORM); }}
            style={{ marginLeft: 8, padding: "8px 16px", borderRadius: 999, border: "1px solid var(--admin-border)", background: "#fff", color: "var(--admin-text)", cursor: "pointer", fontSize: 14 }}
          >
            Cancel
          </button>
        )}
      </form>

      <div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12, marginBottom: 16 }}>
          {(["draft", "open", "closed"] as const).map((s) => (
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
                  <th style={{ padding: "10px 16px", fontWeight: 500, color: "var(--admin-text-muted)" }}>Title</th>
                  <th style={{ padding: "10px 16px", fontWeight: 500, color: "var(--admin-text-muted)" }}>Department</th>
                  <th style={{ padding: "10px 16px", fontWeight: 500, color: "var(--admin-text-muted)" }}>Status</th>
                  <th style={{ padding: "10px 16px" }}></th>
                </tr>
              </thead>
              <tbody>
                {jobs.map((job) => {
                  const pill = STATUS_PILL[job.status] ?? { bg: "var(--admin-pill-bg-neutral)", text: "var(--admin-pill-text-neutral)" };
                  return (
                    <tr key={job.id} style={{ borderTop: "1px solid var(--admin-border)" }}>
                      <td style={{ padding: "10px 16px", color: "var(--admin-text)" }}>{job.title}</td>
                      <td style={{ padding: "10px 16px", color: "var(--admin-text)" }}>{job.department}</td>
                      <td style={{ padding: "10px 16px" }}>
                        <span style={{ background: pill.bg, color: pill.text, padding: "3px 10px", borderRadius: 999, fontSize: 12 }}>
                          {job.status}
                        </span>
                      </td>
                      <td style={{ padding: "10px 16px", textAlign: "right" }}>
                        <button onClick={() => startEdit(job)} style={{ marginRight: 12, cursor: "pointer", color: "var(--admin-accent)", background: "none", border: "none", fontSize: 13 }}>
                          Edit
                        </button>
                        <button onClick={() => handleDelete(job.id)} style={{ cursor: "pointer", color: "var(--admin-danger)", background: "none", border: "none", fontSize: 13 }}>
                          Delete
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
    </div>
  );
}