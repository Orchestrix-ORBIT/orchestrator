"use client";

import React, { useState } from "react";

interface DocItem {
  id: string;
  title: string;
  category: "Meeting Minutes" | "Experimental Protocol" | "Pre-Print Paper" | "Archived Dataset";
  version: string;
  date: string;
  author: string;
  status: "Drafting" | "Under Review" | "Approved" | "Archived";
  content: string;
}

const INITIAL_DOCS: DocItem[] = [
  {
    id: "DOC-101",
    title: "Quantum Decoherence Mitigation & Thermal Calibration Protocol",
    category: "Experimental Protocol",
    version: "v2.1",
    date: "Aug 20, 2026",
    author: "Dinuka K., Dr. Aris",
    status: "Under Review",
    content: "## 1. Objective\nThis protocol establishes the standardized procedure for mitigating 1.4°C thermal drift in Chamber 3 quantum simulation runs.\n\n## 2. Experimental Steps\n1. Isolate the Chamber 3 cryo-coolant sub-manifold.\n2. Execute automated 4-point thermocouple calibration script.\n3. Validate telemetry stream hash with observer node.\n4. Commit encrypted SHA-256 report to S3 cold storage.",
  },
  {
    id: "DOC-102",
    title: "Weekly Research Steering Committee Meeting Minutes",
    category: "Meeting Minutes",
    version: "v1.0",
    date: "Aug 19, 2026",
    author: "Shehara K., Dinuka K.",
    status: "Approved",
    content: "## Meeting Minutes: Q3 Consensus & Enclave Architecture\n**Attendees:** Dinuka K. (Lead), Shehara K., Chalani K., Amara P.\n\n### Key Discussion Points:\n- **Multi-Tenant Isolation:** Reviewed PostgreSQL single-tenant schema separation.\n- **AI Action Extraction:** LangChain pipeline successfully extracted 4 tasks from chat logs.\n- **Next Milestones:** Pre-print publication submission scheduled for September.",
  },
  {
    id: "DOC-103",
    title: "Privacy-Preserving Consensus in Multi-Tenant Enclaves",
    category: "Pre-Print Paper",
    version: "v1.4",
    date: "Aug 15, 2026",
    author: "Amara P., Dinuka K.",
    status: "Under Review",
    content: "## Abstract\nWe propose an on-premise single-tenant architecture utilizing AES-256 application-layer encryption and zero-knowledge proofs to eliminate third-party data leakage in academic research environments.",
  },
  {
    id: "DOC-104",
    title: "2023 Historical Telemetry Cold-Storage Index",
    category: "Archived Dataset",
    version: "v3.0",
    date: "Oct 12, 2023",
    author: "Marcus N.",
    status: "Archived",
    content: "Archived telemetry data snapshot for the 2023 Beta testing phase. Verified with SHA-256 checksum.",
  },
];

export default function DocumentsPage() {
  const [docs, setDocs] = useState<DocItem[]>(INITIAL_DOCS);
  const [selectedDoc, setSelectedDoc] = useState<DocItem | null>(null);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [titleInput, setTitleInput] = useState("");
  const [categoryInput, setCategoryInput] = useState<DocItem["category"]>("Meeting Minutes");
  const [contentInput, setContentInput] = useState("");
  const [editContent, setEditContent] = useState("");
  const [isEditing, setIsEditing] = useState(false);

  const openDoc = (doc: DocItem) => {
    setSelectedDoc(doc);
    setEditContent(doc.content);
    setIsEditing(false);
  };

  const handleSaveDoc = () => {
    if (!selectedDoc) return;
    setDocs((prev) =>
      prev.map((d) => (d.id === selectedDoc.id ? { ...d, content: editContent, date: "Just now" } : d))
    );
    setSelectedDoc((prev) => (prev ? { ...prev, content: editContent, date: "Just now" } : null));
    setIsEditing(false);
  };

  const handleCreateDoc = (e: React.FormEvent) => {
    e.preventDefault();
    if (!titleInput.trim()) return;

    const newDoc: DocItem = {
      id: `DOC-${Date.now().toString().slice(-3)}`,
      title: titleInput.trim(),
      category: categoryInput,
      version: "v1.0",
      date: "Today",
      author: "Dinuka K. (Lead)",
      status: "Drafting",
      content: contentInput || "## Initial Document Draft\nDocument created by Research Lead.",
    };

    setDocs((prev) => [newDoc, ...prev]);
    setShowUploadModal(false);
    setTitleInput("");
    setContentInput("");
  };

  return (
    <div>
      {/* ── Page Header ────────────────────────────────────────────────────── */}
      <div style={s.headerRow}>
        <div>
          <h1 style={s.pageTitle}>Documents & Protocols</h1>
          <p style={s.pageSub}>
            Collaborative meeting minutes, experimental protocols, research papers, and encrypted pre-prints (FR-COLLAB-02).
          </p>
        </div>

        <button onClick={() => setShowUploadModal(true)} style={s.btnPrimary}>
          + Create / Upload Document
        </button>
      </div>

      {/* ── Metric Stat Cards ────────────────────────────────────────────────── */}
      <div style={s.statGrid}>
        <div style={s.statCard}>
          <span style={s.statLabel}>TOTAL DOCUMENTS</span>
          <span style={s.statValue}>{docs.length}</span>
          <span style={s.statSub}>Encrypted lab files</span>
        </div>
        <div style={s.statCard}>
          <span style={s.statLabel}>MEETING MINUTES</span>
          <span style={s.statValue}>
            {docs.filter((d) => d.category === "Meeting Minutes").length}
          </span>
          <span style={s.statSub}>Collaborative drafts</span>
        </div>
        <div style={s.statCard}>
          <span style={s.statLabel}>LAB PROTOCOLS</span>
          <span style={s.statValue}>
            {docs.filter((d) => d.category === "Experimental Protocol").length}
          </span>
          <span style={s.statSub}>Bench procedures</span>
        </div>
        <div style={s.statCard}>
          <span style={s.statLabel}>STORAGE CIPHER</span>
          <span style={s.statValue}>AES-256</span>
          <span style={s.statSub}>Encrypted at rest (MinIO S3)</span>
        </div>
      </div>

      {/* ── Documents Table Card ────────────────────────────────────────────── */}
      <div style={s.tableCard}>
        <div style={s.tableHeaderRow}>
          <p style={s.sectionLabel}>RESEARCH REPOSITORY & DOCUMENTATION HUB</p>
          <span style={{ fontSize: 12, color: "#9e9e9e", marginRight: 16 }}>
            {docs.length} Files Available
          </span>
        </div>

        <table style={s.table}>
          <thead>
            <tr>
              <th style={s.th}>Document Title</th>
              <th style={s.th}>Category</th>
              <th style={s.th}>Version</th>
              <th style={s.th}>Authors</th>
              <th style={s.th}>Last Updated</th>
              <th style={s.th}>Status</th>
              <th style={{ ...s.th, textAlign: "right" }}>Action</th>
            </tr>
          </thead>
          <tbody>
            {docs.map((doc) => (
              <tr key={doc.id} style={s.tr}>
                <td style={s.td}>
                  <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                    <strong>{doc.title}</strong>
                    <span style={{ fontSize: 11, color: "#9e9e9e" }}>ID: {doc.id}</span>
                  </div>
                </td>
                <td style={{ ...s.td, color: "#616161" }}>{doc.category}</td>
                <td style={{ ...s.td, color: "#9e9e9e", fontFamily: "monospace", fontSize: 12 }}>
                  {doc.version}
                </td>
                <td style={s.td}>{doc.author}</td>
                <td style={{ ...s.td, color: "#9e9e9e" }}>{doc.date}</td>
                <td style={s.td}>
                  <span
                    style={{
                      ...s.badge,
                      ...(doc.status === "Approved"
                        ? s.badgeApproved
                        : doc.status === "Under Review"
                        ? s.badgeReview
                        : s.badgeDefault),
                    }}
                  >
                    {doc.status}
                  </span>
                </td>
                <td style={{ ...s.td, textAlign: "right" }}>
                  <button onClick={() => openDoc(doc)} style={s.btnOpen}>
                    Open Editor →
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* ── Collaborative Document Editor Modal ─────────────────────────────── */}
      {selectedDoc && (
        <div style={m.overlay}>
          <div style={m.modalLarge}>
            {/* Modal Top */}
            <div style={m.header}>
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <h3 style={m.title}>{selectedDoc.title}</h3>
                  <span style={s.badgeProject}>{selectedDoc.category}</span>
                  <span style={{ fontSize: 11, fontFamily: "monospace", color: "#9e9e9e" }}>
                    {selectedDoc.version}
                  </span>
                </div>
                <p style={m.sub}>
                  Authors: <strong>{selectedDoc.author}</strong> • Last Updated: {selectedDoc.date} • End-to-End Encrypted (AES-256)
                </p>
              </div>

              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                {!isEditing ? (
                  <button onClick={() => setIsEditing(true)} style={s.btnPrimary}>
                    ✏ Edit Document
                  </button>
                ) : (
                  <button onClick={handleSaveDoc} style={s.btnSave}>
                    💾 Save Changes
                  </button>
                )}
                <button onClick={() => setSelectedDoc(null)} style={m.closeBtn}>✕</button>
              </div>
            </div>

            {/* Document Body */}
            <div style={m.bodyLarge}>
              {isEditing ? (
                <textarea
                  rows={14}
                  value={editContent}
                  onChange={(e) => setEditContent(e.target.value)}
                  style={m.editorTextarea}
                />
              ) : (
                <div style={m.renderedDoc}>
                  <pre style={m.docPre}>{selectedDoc.content}</pre>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div style={m.footer}>
              <span style={{ fontSize: 12, color: "#2e7d32", fontWeight: 600 }}>
                🔒 Operational Transform Sync Active • Zero Cloud Leakage
              </span>
              <button onClick={() => setSelectedDoc(null)} style={m.btnSecondary}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Create / Upload Document Modal ──────────────────────────────────── */}
      {showUploadModal && (
        <div style={m.overlay}>
          <div style={m.modal}>
            <div style={m.header}>
              <div>
                <h3 style={m.title}>Create Research Document</h3>
                <p style={m.sub}>Initialize collaborative meeting minutes or lab protocol.</p>
              </div>
              <button onClick={() => setShowUploadModal(false)} style={m.closeBtn}>✕</button>
            </div>

            <form onSubmit={handleCreateDoc} style={m.body}>
              <div style={m.field}>
                <label style={m.label}>DOCUMENT TITLE *</label>
                <input
                  required
                  placeholder="e.g. Synthesis Protocol for Next Batch"
                  value={titleInput}
                  onChange={(e) => setTitleInput(e.target.value)}
                  style={m.input}
                />
              </div>

              <div style={m.field}>
                <label style={m.label}>DOCUMENT CATEGORY</label>
                <select
                  value={categoryInput}
                  onChange={(e) => setCategoryInput(e.target.value as DocItem["category"])}
                  style={m.select}
                >
                  <option value="Meeting Minutes">Meeting Minutes</option>
                  <option value="Experimental Protocol">Experimental Protocol</option>
                  <option value="Pre-Print Paper">Pre-Print Paper</option>
                  <option value="Archived Dataset">Archived Dataset</option>
                </select>
              </div>

              <div style={m.field}>
                <label style={m.label}>INITIAL CONTENT / OUTLINE</label>
                <textarea
                  rows={4}
                  placeholder="Document outline, notes, or agenda..."
                  value={contentInput}
                  onChange={(e) => setContentInput(e.target.value)}
                  style={m.textarea}
                />
              </div>

              <div style={m.footer}>
                <button
                  type="button"
                  onClick={() => setShowUploadModal(false)}
                  style={m.btnSecondary}
                >
                  Cancel
                </button>
                <button type="submit" style={m.btnPrimary}>
                  Create Document
                </button>
              </div>
            </form>
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
  btnSave: { background: "#2e7d32", color: "#ffffff", border: "none", borderRadius: 4, padding: "9px 16px", fontSize: 13, fontWeight: 600, cursor: "pointer" },
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
  badge: { fontSize: 11, fontWeight: 600, padding: "3px 8px", borderRadius: 4 },
  badgeApproved: { background: "#161616", color: "#ffffff" },
  badgeReview: { background: "#fff8e1", color: "#f57f17", border: "1px solid #ffe082" },
  badgeDefault: { background: "transparent", color: "#616161", border: "1px solid #d0d0d0" },
  badgeProject: { fontSize: 11, background: "#f5f5f5", border: "1px solid #e0e0e0", borderRadius: 3, padding: "2px 6px", color: "#424242" },
  btnOpen: { padding: "5px 12px", background: "#f5f5f5", border: "1px solid #d0d0d0", borderRadius: 4, fontSize: 12, fontWeight: 600, color: "#161616", cursor: "pointer" },
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
  modalLarge: {
    background: "#ffffff",
    border: "1px solid #e0e0e0",
    borderRadius: 6,
    width: "100%",
    maxWidth: 780,
    boxShadow: "0 10px 25px rgba(0, 0, 0, 0.1)",
    maxHeight: "90vh",
    display: "flex",
    flexDirection: "column",
  },
  header: {
    padding: "18px 24px",
    borderBottom: "1px solid #eeeeee",
    display: "flex",
    alignItems: "flex-start",
    justifyContent: "space-between",
    background: "#fafafa",
  },
  title: { fontSize: 16, fontWeight: 700, color: "#161616" },
  sub: { fontSize: 12, color: "#9e9e9e", marginTop: 4 },
  closeBtn: { background: "none", border: "none", fontSize: 15, color: "#9e9e9e", cursor: "pointer" },
  body: { padding: "20px 24px", display: "flex", flexDirection: "column", gap: 14 },
  bodyLarge: { padding: "24px", flex: 1, overflowY: "auto" },
  editorTextarea: {
    width: "100%",
    padding: "14px 16px",
    fontSize: 14,
    fontFamily: "monospace",
    lineHeight: 1.6,
    border: "1px solid #d0d0d0",
    borderRadius: 4,
    outline: "none",
    color: "#161616",
    background: "#ffffff",
    resize: "vertical",
    minHeight: 280,
  },
  renderedDoc: {
    background: "#fdfdfd",
    padding: "20px 24px",
    border: "1px solid #eeeeee",
    borderRadius: 4,
  },
  docPre: {
    fontSize: 13,
    fontFamily: "var(--font)",
    lineHeight: 1.6,
    color: "#333333",
    whiteSpace: "pre-wrap" as const,
    margin: 0,
  },
  field: { display: "flex", flexDirection: "column", gap: 6 },
  label: { fontSize: 11, fontWeight: 600, color: "#9e9e9e", letterSpacing: "0.5px" },
  input: { padding: "8px 12px", fontSize: 13, border: "1px solid #d0d0d0", borderRadius: 4, outline: "none", background: "#ffffff" },
  textarea: { padding: "8px 12px", fontSize: 13, border: "1px solid #d0d0d0", borderRadius: 4, outline: "none", resize: "none" },
  select: { padding: "8px 12px", fontSize: 13, border: "1px solid #d0d0d0", borderRadius: 4, background: "#ffffff", outline: "none" },
  footer: { padding: "14px 24px", borderTop: "1px solid #eeeeee", background: "#fafafa", display: "flex", justifyContent: "space-between", alignItems: "center" },
  btnPrimary: { padding: "8px 16px", background: "#161616", color: "#ffffff", border: "none", borderRadius: 4, fontSize: 13, fontWeight: 600, cursor: "pointer" },
  btnSecondary: { padding: "8px 14px", background: "#ffffff", color: "#424242", border: "1px solid #d0d0d0", borderRadius: 4, fontSize: 13, fontWeight: 500, cursor: "pointer" },
};
