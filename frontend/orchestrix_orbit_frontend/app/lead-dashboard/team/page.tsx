"use client";

import React, { useState } from "react";

interface Member {
  id: string;
  name: string;
  role: string;
  email: string;
  status: "Active" | "Pending" | "Inactive";
  projects: string[];
  permission: "Read/Write" | "Read Only";
}

const INITIAL_MEMBERS: Member[] = [
  { id: "1", name: "Dinuka Kavinda", role: "Research Lead", email: "dk@institution.edu", status: "Active", projects: ["Project Alpha Core", "Nexus Protocol"], permission: "Read/Write" },
  { id: "2", name: "Shehara Karunarathna", role: "Researcher", email: "sk@institution.edu", status: "Active", projects: ["Project Alpha Core", "Nexus Protocol"], permission: "Read/Write" },
  { id: "3", name: "Chalani K.", role: "Senior Researcher", email: "ck@institution.edu", status: "Active", projects: ["Project Alpha Core"], permission: "Read/Write" },
  { id: "4", name: "Amara P.", role: "Cryptography Lead", email: "ap@institution.edu", status: "Active", projects: ["Beta Synthesis", "Project Alpha Core"], permission: "Read/Write" },
  { id: "5", name: "Marcus N.", role: "Systems Researcher", email: "mn@institution.edu", status: "Active", projects: ["Beta Synthesis"], permission: "Read Only" },
];

export default function TeamPage() {
  const [members, setMembers] = useState<Member[]>(INITIAL_MEMBERS);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [nameInput, setNameInput] = useState("");
  const [emailInput, setEmailInput] = useState("");
  const [roleInput, setRoleInput] = useState("Researcher");
  const [selectedProjects, setSelectedProjects] = useState<string[]>(["Project Alpha Core"]);
  const [permissionInput, setPermissionInput] = useState<"Read/Write" | "Read Only">("Read/Write");
  const [inviteSuccess, setInviteSuccess] = useState(false);
  const [selectedMember, setSelectedMember] = useState<Member | null>(null);

  const handleToggleProject = (proj: string) => {
    setSelectedProjects((prev) =>
      prev.includes(proj) ? prev.filter((p) => p !== proj) : [...prev, proj]
    );
  };

  const handleAddMember = (e: React.FormEvent) => {
    e.preventDefault();
    if (!nameInput.trim() || !emailInput.trim()) return;

    const newMember: Member = {
      id: `${Date.now()}`,
      name: nameInput.trim(),
      email: emailInput.trim(),
      role: roleInput,
      status: "Active",
      projects: selectedProjects.length > 0 ? selectedProjects : ["Project Alpha Core"],
      permission: permissionInput,
    };

    setMembers((prev) => [...prev, newMember]);
    setInviteSuccess(true);

    setTimeout(() => {
      setInviteSuccess(false);
      setShowInviteModal(false);
      setNameInput("");
      setEmailInput("");
    }, 1200);
  };

  const handleRemoveMember = (id: string) => {
    setMembers((prev) => prev.filter((m) => m.id !== id));
    if (selectedMember?.id === id) setSelectedMember(null);
  };

  return (
    <div>
      {/* ── Page Header ────────────────────────────────────────────────────── */}
      <div style={s.headerRow}>
        <div>
          <h1 style={s.pageTitle}>Team & Roster</h1>
          <p style={s.pageSub}>
            Assign researchers to isolated workspaces, manage contributor roles, and define project permissions (FR-AUTH-04).
          </p>
        </div>

        <button
          id="btn-invite-member"
          onClick={() => setShowInviteModal(true)}
          style={s.btnPrimary}
        >
          + Add Researcher / Invite
        </button>
      </div>

      {/* ── Metric Stat Cards ────────────────────────────────────────────────── */}
      <div style={s.statGrid}>
        <div style={s.statCard}>
          <span style={s.statLabel}>TOTAL MEMBERS</span>
          <span style={s.statValue}>{members.length}</span>
          <span style={s.statSub}>Across all projects</span>
        </div>
        <div style={s.statCard}>
          <span style={s.statLabel}>ACTIVE ROLES</span>
          <span style={s.statValue}>4</span>
          <span style={s.statSub}>Lead, Senior, Researcher, Intern</span>
        </div>
        <div style={s.statCard}>
          <span style={s.statLabel}>ENCRYPTED SEATS</span>
          <span style={s.statValue}>{members.length} / 10</span>
          <span style={s.statSub}>Tenant quota</span>
        </div>
        <div style={s.statCard}>
          <span style={s.statLabel}>PROJECT ACCESS</span>
          <span style={s.statValue}>STRICT</span>
          <span style={s.statSub}>Multi-tenant isolation</span>
        </div>
      </div>

      {/* ── Researcher Directory Table Card ─────────────────────────────────── */}
      <div style={s.tableCard}>
        <div style={s.tableHeaderRow}>
          <p style={s.sectionLabel}>RESEARCHER DIRECTORY & ASSIGNED WORKSPACES</p>
          <span style={{ fontSize: 12, color: "#9e9e9e", marginRight: 16 }}>
            {members.length} Registered Members
          </span>
        </div>

        <table style={s.table}>
          <thead>
            <tr>
              <th style={s.th}>Researcher Name</th>
              <th style={s.th}>Institutional Role</th>
              <th style={s.th}>Email Address</th>
              <th style={s.th}>Assigned Projects</th>
              <th style={s.th}>Access Level</th>
              <th style={{ ...s.th, textAlign: "right" }}>Status</th>
            </tr>
          </thead>
          <tbody>
            {members.map((m) => (
              <tr 
                key={m.id} 
                style={s.tr}
                onClick={() => setSelectedMember(m)}
                className="cursor-pointer hover:bg-slate-50"
              >
                <td style={s.td}>
                  <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                    <strong>{m.name}</strong>
                    <span style={{ fontSize: 11, color: "#9e9e9e" }}>Click to view access policies</span>
                  </div>
                </td>
                <td style={{ ...s.td, color: "#616161" }}>{m.role}</td>
                <td style={{ ...s.td, color: "#9e9e9e", fontFamily: "monospace", fontSize: 12 }}>
                  {m.email}
                </td>
                <td style={s.td}>
                  <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
                    {m.projects.map((p, i) => (
                      <span key={i} style={s.badgeProject}>{p}</span>
                    ))}
                  </div>
                </td>
                <td style={{ ...s.td, color: "#161616", fontSize: 12, fontWeight: 500 }}>
                  {m.permission}
                </td>
                <td style={{ ...s.td, textAlign: "right" }}>
                  <span style={s.badgeActive}>{m.status}</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* ── Add Researcher / Invite Modal ────────────────────────────────────── */}
      {showInviteModal && (
        <div style={m.overlay}>
          <div style={m.modal}>
            <div style={m.header}>
              <div>
                <h3 style={m.title}>Add Researcher to Project</h3>
                <p style={m.sub}>Assign project workspace access and roles (FR-AUTH-04).</p>
              </div>
              <button onClick={() => setShowInviteModal(false)} style={m.closeBtn}>✕</button>
            </div>

            {inviteSuccess ? (
              <div style={{ padding: "36px 24px", textAlign: "center" }}>
                <span style={{ fontSize: 28 }}>✓</span>
                <h4 style={{ fontSize: 16, fontWeight: 700, color: "#161616", marginTop: 8 }}>
                  Researcher Added & Provisioned!
                </h4>
                <p style={{ fontSize: 13, color: "#616161", marginTop: 4 }}>
                  Project encryption keys and access permissions granted.
                </p>
              </div>
            ) : (
              <form onSubmit={handleAddMember} style={m.body}>
                <div style={m.field}>
                  <label style={m.label}>RESEARCHER FULL NAME *</label>
                  <input
                    required
                    placeholder="e.g. Dr. Jennifer Vance"
                    value={nameInput}
                    onChange={(e) => setNameInput(e.target.value)}
                    style={m.input}
                  />
                </div>

                <div style={m.field}>
                  <label style={m.label}>INSTITUTIONAL EMAIL *</label>
                  <input
                    required
                    type="email"
                    placeholder="e.g. jvance@institution.edu"
                    value={emailInput}
                    onChange={(e) => setEmailInput(e.target.value)}
                    style={m.input}
                  />
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                  <div style={m.field}>
                    <label style={m.label}>ASSIGNED ROLE</label>
                    <select
                      value={roleInput}
                      onChange={(e) => setRoleInput(e.target.value)}
                      style={m.select}
                    >
                      <option value="Researcher">Researcher</option>
                      <option value="Senior Researcher">Senior Researcher</option>
                      <option value="Postdoctoral Fellow">Postdoctoral Fellow</option>
                      <option value="Cryptography Specialist">Cryptography Specialist</option>
                      <option value="Graduate Intern">Graduate Intern</option>
                    </select>
                  </div>

                  <div style={m.field}>
                    <label style={m.label}>PROJECT ACCESS LEVEL</label>
                    <select
                      value={permissionInput}
                      onChange={(e) => setPermissionInput(e.target.value as "Read/Write" | "Read Only")}
                      style={m.select}
                    >
                      <option value="Read/Write">Read & Write (Full Tasking)</option>
                      <option value="Read Only">Read Only (Observer)</option>
                    </select>
                  </div>
                </div>

                <div style={m.field}>
                  <label style={m.label}>ASSIGN TO WORKSPACES</label>
                  <div style={{ display: "flex", flexDirection: "column", gap: 6, marginTop: 4 }}>
                    {["Project Alpha Core", "Nexus Protocol", "Beta Synthesis"].map((proj) => (
                      <label key={proj} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: "#161616", cursor: "pointer" }}>
                        <input
                          type="checkbox"
                          checked={selectedProjects.includes(proj)}
                          onChange={() => handleToggleProject(proj)}
                        />
                        <span>{proj}</span>
                      </label>
                    ))}
                  </div>
                </div>

                <div style={m.footer}>
                  <button
                    type="button"
                    onClick={() => setShowInviteModal(false)}
                    style={m.btnSecondary}
                  >
                    Cancel
                  </button>
                  <button type="submit" style={m.btnPrimary}>
                    Add Researcher
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* ── Researcher Detail Modal ──────────────────────────────────────────── */}
      {selectedMember && (
        <div style={m.overlay}>
          <div style={m.modal}>
            <div style={m.header}>
              <div>
                <h3 style={m.title}>{selectedMember.name}</h3>
                <p style={m.sub}>{selectedMember.role} • {selectedMember.email}</p>
              </div>
              <button onClick={() => setSelectedMember(null)} style={m.closeBtn}>✕</button>
            </div>

            <div style={m.body}>
              <div style={m.section}>
                <span style={m.label}>ASSIGNED PROJECT WORKSPACES</span>
                <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 6 }}>
                  {selectedMember.projects.map((p, i) => (
                    <span key={i} style={s.badgeProject}>{p}</span>
                  ))}
                </div>
              </div>

              <div style={m.section}>
                <span style={m.label}>PROJECT ACCESS PERMISSIONS</span>
                <p style={{ fontSize: 13, fontWeight: 600, color: "#161616", marginTop: 4 }}>
                  {selectedMember.permission} — Strict Multi-Tenant Schema Boundary Enforced
                </p>
              </div>

              <div style={{ ...m.section, borderBottom: "none", paddingBottom: 0 }}>
                <span style={m.label}>ENCRYPTED SEAT STATUS</span>
                <p style={{ fontSize: 13, color: "#2e7d32", fontWeight: 600, marginTop: 4 }}>
                  ✓ Active AES-256 Key Exchanged & Verified
                </p>
              </div>
            </div>

            <div style={m.footer}>
              {selectedMember.role !== "Research Lead" ? (
                <button
                  type="button"
                  onClick={() => handleRemoveMember(selectedMember.id)}
                  style={{ background: "none", border: "none", color: "#c62828", fontSize: 12, fontWeight: 600, cursor: "pointer" }}
                >
                  Revoke Project Access
                </button>
              ) : (
                <span style={{ fontSize: 11, color: "#9e9e9e" }}>Lead account cannot be revoked</span>
              )}

              <button onClick={() => setSelectedMember(null)} style={m.btnPrimary}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

const s: Record<string, React.CSSProperties> = {
  headerRow: { display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: 24 },
  pageTitle: { fontSize: 28, fontWeight: 700, color: "#161616", letterSpacing: "-0.5px", marginBottom: 4 },
  pageSub: { fontSize: 13, color: "#9e9e9e" },
  btnPrimary: { background: "#161616", color: "#ffffff", border: "none", borderRadius: 4, padding: "9px 16px", fontSize: 13, fontWeight: 600, cursor: "pointer" },
  statGrid: { display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16, marginBottom: 32 },
  statCard: { background: "#ffffff", border: "1px solid #e0e0e0", borderRadius: 6, padding: "18px 20px 20px", display: "flex", flexDirection: "column", gap: 6 },
  statLabel: { fontSize: 11, fontWeight: 600, color: "#9e9e9e", letterSpacing: "0.5px", textTransform: "uppercase" as const },
  statValue: { fontSize: 32, fontWeight: 700, color: "#161616", letterSpacing: "-1px", lineHeight: 1.1 },
  statSub: { fontSize: 12, color: "#9e9e9e" },
  tableCard: { background: "#ffffff", border: "1px solid #e0e0e0", borderRadius: 6, overflow: "hidden" },
  tableHeaderRow: { display: "flex", alignItems: "center", justifyContent: "space-between" },
  sectionLabel: { fontSize: 11, fontWeight: 600, color: "#9e9e9e", letterSpacing: "0.6px", textTransform: "uppercase" as const, padding: "16px 20px 12px" },
  table: { width: "100%", borderCollapse: "collapse" as const, fontSize: 13 },
  th: { textAlign: "left" as const, padding: "8px 16px", fontSize: 12, fontWeight: 500, color: "#9e9e9e", borderBottom: "1px solid #eeeeee", borderTop: "1px solid #eeeeee", background: "#fafafa" },
  tr: { borderBottom: "1px solid #f0f0f0" },
  td: { padding: "12px 16px", color: "#161616", fontSize: 13, verticalAlign: "middle" as const },
  badgeProject: { fontSize: 11, background: "#f5f5f5", border: "1px solid #e0e0e0", borderRadius: 3, padding: "2px 6px", color: "#424242" },
  badgeActive: { background: "#161616", color: "#ffffff", padding: "3px 8px", borderRadius: 4, fontSize: 11, fontWeight: 600 },
};

const m: Record<string, React.CSSProperties> = {
  overlay: {
    position: "fixed" as const,
    inset: 0,
    background: "rgba(0, 0, 0, 0.4)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 100,
    padding: 20,
  },
  modal: {
    background: "#ffffff",
    border: "1px solid #e0e0e0",
    borderRadius: 6,
    width: "100%",
    maxWidth: 520,
    boxShadow: "0 10px 25px rgba(0, 0, 0, 0.1)",
  },
  header: {
    padding: "18px 24px",
    borderBottom: "1px solid #eeeeee",
    display: "flex",
    alignItems: "flex-start",
    justifyContent: "space-between",
  },
  title: {
    fontSize: 16,
    fontWeight: 700,
    color: "#161616",
  },
  sub: {
    fontSize: 12,
    color: "#9e9e9e",
    marginTop: 2,
  },
  closeBtn: {
    background: "none",
    border: "none",
    fontSize: 15,
    color: "#9e9e9e",
    cursor: "pointer",
  },
  body: {
    padding: "20px 24px",
    display: "flex",
    flexDirection: "column",
    gap: 14,
  },
  section: {
    borderBottom: "1px solid #f0f0f0",
    paddingBottom: 12,
  },
  label: {
    fontSize: 11,
    fontWeight: 600,
    color: "#9e9e9e",
    letterSpacing: "0.5px",
    display: "block",
  },
  field: {
    display: "flex",
    flexDirection: "column",
    gap: 6,
  },
  input: {
    padding: "8px 12px",
    fontSize: 13,
    border: "1px solid #d0d0d0",
    borderRadius: 4,
    outline: "none",
    background: "#ffffff",
  },
  select: {
    padding: "8px 12px",
    fontSize: 13,
    border: "1px solid #d0d0d0",
    borderRadius: 4,
    background: "#ffffff",
    outline: "none",
  },
  footer: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 8,
    paddingTop: 10,
  },
  btnPrimary: {
    padding: "8px 16px",
    background: "#161616",
    color: "#ffffff",
    border: "none",
    borderRadius: 4,
    fontSize: 13,
    fontWeight: 600,
    cursor: "pointer",
  },
  btnSecondary: {
    padding: "8px 14px",
    background: "#ffffff",
    color: "#424242",
    border: "1px solid #d0d0d0",
    borderRadius: 4,
    fontSize: 13,
    fontWeight: 500,
    cursor: "pointer",
  },
};
