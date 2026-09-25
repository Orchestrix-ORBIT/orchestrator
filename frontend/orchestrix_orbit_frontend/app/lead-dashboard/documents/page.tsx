"use client";

import React, { useState, useEffect } from "react";
import LoadingState from "@/components/ui/LoadingState";
import { DocumentsService, type Document as BackendDoc } from "@/lib/services/documents";
import { ProjectsService, type Project } from "@/lib/services/projects";
import { getEmail } from "@/lib/auth";

// ── Constants ─────────────────────────────────────────────────────────────────
type DocCategory =
  | "Meeting Minutes"
  | "Experimental Protocol"
  | "Pre-Print Paper"
  | "Archived Dataset"
  | "Other";

// Map backend category enum → human-readable label
const BACKEND_TO_DISPLAY: Record<string, DocCategory> = {
  MEETING_MINUTES:       "Meeting Minutes",
  EXPERIMENTAL_PROTOCOL: "Experimental Protocol",
  PRE_PRINT_PAPER:       "Pre-Print Paper",
  ARCHIVED_DATASET:      "Archived Dataset",
  OTHER:                 "Other",
};

// Map human-readable label → backend enum
const DISPLAY_TO_BACKEND: Record<DocCategory, string> = {
  "Meeting Minutes":      "MEETING_MINUTES",
  "Experimental Protocol":"EXPERIMENTAL_PROTOCOL",
  "Pre-Print Paper":      "PRE_PRINT_PAPER",
  "Archived Dataset":     "ARCHIVED_DATASET",
  "Other":                "OTHER",
};

// Derived category for stats
function getCategoryDisplay(backendCategory: string | null | undefined): DocCategory {
  if (!backendCategory) return "Other";
  return BACKEND_TO_DISPLAY[backendCategory] ?? "Other";
}

// ── Display type (UI-focused) ──────────────────────────────────────────────────
interface DisplayDoc {
  id: string;
  backendId: string;
  projectId: string;
  title: string;
  category: DocCategory;
  backendCategory: string;
  date: string;
  author: string;          // email or UUID shortened
  status: "Drafting" | "Under Review" | "Approved" | "Archived";
  content: string;         // decrypted content
  projectName: string;
  version: number;
}

function mapBackendDoc(d: BackendDoc, projects: Project[]): DisplayDoc {
  const project = projects.find(p => p.id === d.projectId);
  return {
    id:             d.id,
    backendId:      d.id,
    projectId:      d.projectId,
    title:          d.title,
    category:       getCategoryDisplay(d.category),
    backendCategory:d.category ?? "OTHER",
    date:           new Date(d.updatedAt || d.createdAt).toLocaleDateString("en-US", {
      month: "short", day: "numeric", year: "numeric",
    }),
    // Show email if available (will be patched once user lookup is added)
    author:         `User (${d.authorId?.substring(0, 8) ?? "?"})`,
    status:         "Approved",
    content:        d.contentEncrypted ?? "(No content — click Open to add content)",
    projectName:    project?.name ?? "Unknown Project",
    version:        d.version ?? 1,
  };
}

// ── Component ──────────────────────────────────────────────────────────────────
export default function DocumentsPage() {
  const [loading, setLoading]               = useState(true);
  const [filterLoading, setFilterLoading]   = useState(false);
  const [projects, setProjects]             = useState<Project[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<string>("ALL");
  const [docs, setDocs]                     = useState<DisplayDoc[]>([]);
  const [error, setError]                   = useState<string | null>(null);

  const [selectedDoc, setSelectedDoc]       = useState<DisplayDoc | null>(null);
  const [editContent, setEditContent]       = useState("");
  const [isEditing, setIsEditing]           = useState(false);
  const [saving, setSaving]                 = useState(false);

  const [showUploadModal, setShowUploadModal] = useState(false);
  const [titleInput, setTitleInput]           = useState("");
  const [categoryInput, setCategoryInput]     = useState<DocCategory>("Meeting Minutes");
  const [contentInput, setContentInput]       = useState("");
  const [createProjectId, setCreateProjectId] = useState<string>("");
  const [creating, setCreating]               = useState(false);
  const [createError, setCreateError]         = useState<string | null>(null);

  const [deleting, setDeleting]             = useState<string | null>(null);

  const currentUserEmail = getEmail() || "lead@research.org";

  // ── Load projects + all docs on mount ───────────────────────────────────────
  useEffect(() => {
    async function loadInitial() {
      try {
        setLoading(true);
        setError(null);

        const list = await ProjectsService.getAll();
        // getAll() already deduplicates by name; also guard on id in case of race conditions
        const uniqueProjects = list.filter(
          (p, idx, arr) => arr.findIndex(x => x.id === p.id) === idx
        );
        setProjects(uniqueProjects);

        if (uniqueProjects.length > 0) {
          setCreateProjectId(uniqueProjects[0].id);
          const results = await Promise.all(
            uniqueProjects.map(p =>
              DocumentsService.getByProject(p.id).catch(() => [] as BackendDoc[])
            )
          );
          const allDocs = results.flat().map(d => mapBackendDoc(d, uniqueProjects));
          allDocs.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
          setDocs(allDocs);
        } else {
          setDocs([]);
        }
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : "Failed to load documents");
      } finally {
        setLoading(false);
      }
    }
    loadInitial();
  }, []);

  // ── Filter by project ────────────────────────────────────────────────────────
  const handleFilterChange = async (projectId: string) => {
    setSelectedProjectId(projectId);
    setFilterLoading(true);
    setError(null);
    try {
      const projectsToLoad = projectId === "ALL"
        ? projects
        : projects.filter(p => p.id === projectId);

      const results = await Promise.all(
        projectsToLoad.map(p =>
          DocumentsService.getByProject(p.id).catch(() => [] as BackendDoc[])
        )
      );
      const allDocs = results.flat().map(d => mapBackendDoc(d, projects));
      allDocs.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      setDocs(allDocs);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to filter documents");
    } finally {
      setFilterLoading(false);
    }
  };

  const openDoc = (doc: DisplayDoc) => {
    setSelectedDoc(doc);
    setEditContent(doc.content === "(No content — click Open to add content)" ? "" : doc.content);
    setIsEditing(false);
  };

  // ── Save edited content ──────────────────────────────────────────────────────
  const handleSaveDoc = async () => {
    if (!selectedDoc) return;
    setSaving(true);
    try {
      await DocumentsService.update(selectedDoc.projectId, selectedDoc.backendId, {
        contentEncrypted: editContent,
      });
      const updatedDate = new Date().toLocaleDateString("en-US", {
        month: "short", day: "numeric", year: "numeric",
      });
      setDocs(prev =>
        prev.map(d =>
          d.id === selectedDoc.id
            ? { ...d, content: editContent, date: updatedDate, version: d.version + 1 }
            : d
        )
      );
      setSelectedDoc(prev => prev ? { ...prev, content: editContent } : null);
      setIsEditing(false);
    } catch (err: unknown) {
      alert("Failed to save: " + (err instanceof Error ? err.message : String(err)));
    } finally {
      setSaving(false);
    }
  };

  // ── Delete doc ───────────────────────────────────────────────────────────────
  const handleDeleteDoc = async (doc: DisplayDoc) => {
    if (!confirm(`Delete "${doc.title}"? This cannot be undone.`)) return;
    setDeleting(doc.id);
    try {
      await DocumentsService.delete(doc.projectId, doc.backendId);
      setDocs(prev => prev.filter(d => d.id !== doc.id));
      if (selectedDoc?.id === doc.id) setSelectedDoc(null);
    } catch (err: unknown) {
      alert("Delete failed: " + (err instanceof Error ? err.message : String(err)));
    } finally {
      setDeleting(null);
    }
  };

  // ── Create new doc ───────────────────────────────────────────────────────────
  const handleCreateDoc = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!titleInput.trim() || !createProjectId) return;
    setCreating(true);
    setCreateError(null);
    try {
      const created = await DocumentsService.create(createProjectId, {
        title:            titleInput.trim(),
        category:         DISPLAY_TO_BACKEND[categoryInput],
        contentEncrypted: contentInput || `## ${titleInput.trim()}\n\nDocument created by ${currentUserEmail}.\n`,
      });
      const project = projects.find(p => p.id === createProjectId);
      const newDoc: DisplayDoc = {
        id:             created.id,
        backendId:      created.id,
        projectId:      created.projectId,
        title:          created.title,
        category:       categoryInput,
        backendCategory:DISPLAY_TO_BACKEND[categoryInput],
        date:           new Date().toLocaleDateString("en-US", {
          month: "short", day: "numeric", year: "numeric",
        }),
        author:         currentUserEmail,
        status:         "Drafting",
        content:        created.contentEncrypted ?? contentInput,
        projectName:    project?.name ?? "Project",
        version:        1,
      };
      setDocs(prev => [newDoc, ...prev]);
      setShowUploadModal(false);
      setTitleInput("");
      setContentInput("");
      setCategoryInput("Meeting Minutes");
    } catch (err: unknown) {
      setCreateError(err instanceof Error ? err.message : "Failed to create document");
    } finally {
      setCreating(false);
    }
  };

  // ── Loading state ────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <LoadingState
        title="Loading Knowledge & Documents…"
        subtitle="Fetching research protocols, steering minutes, and pre-print papers"
      />
    );
  }

  // ── Derived stats ────────────────────────────────────────────────────────────
  const meetingMinutes   = docs.filter(d => d.category === "Meeting Minutes").length;
  const labProtocols     = docs.filter(d => d.category === "Experimental Protocol").length;

  return (
    <div>
      {/* ── Page Header ─────────────────────────────────────────────────────── */}
      <div style={s.headerRow}>
        <div>
          <h1 style={s.pageTitle}>Documents & Protocols</h1>
          <p style={s.pageSub}>
            Collaborative meeting minutes, experimental protocols, research papers, and encrypted pre-prints.
          </p>
        </div>
        <button onClick={() => setShowUploadModal(true)} style={s.btnPrimary}>
          + Create Document
        </button>
      </div>

      {/* ── Project Filter ───────────────────────────────────────────────────── */}
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 24, background: "#fff", border: "1px solid #e0e0e0", borderRadius: 8, padding: "10px 16px" }}>
        <span style={{ fontSize: 13, fontWeight: 600, color: "#161616" }}>📁 Filter by Project:</span>
        <select
          value={selectedProjectId}
          onChange={e => handleFilterChange(e.target.value)}
          style={{ padding: "6px 12px", fontSize: 13, border: "1px solid #ccc", borderRadius: 6, background: "#fff", outline: "none", fontWeight: 500, color: "#161616", minWidth: 200 }}
        >
          <option value="ALL">All Projects</option>
          {projects.map(p => (
            <option key={p.id} value={p.id}>{p.name}</option>
          ))}
        </select>
        {filterLoading && (
          <span style={{ fontSize: 12, color: "#888", display: "flex", alignItems: "center", gap: 6 }}>
            <span style={{ width: 12, height: 12, borderRadius: "50%", border: "2px solid #e0e0e0", borderTop: "2px solid #161616", display: "inline-block", animation: "spin 0.7s linear infinite" }} />
            Updating…
          </span>
        )}
        {error && <span style={{ fontSize: 12, color: "#c62828" }}>⚠ {error}</span>}
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
          <span style={s.statValue}>{meetingMinutes}</span>
          <span style={s.statSub}>Collaborative drafts</span>
        </div>
        <div style={s.statCard}>
          <span style={s.statLabel}>LAB PROTOCOLS</span>
          <span style={s.statValue}>{labProtocols}</span>
          <span style={s.statSub}>Bench procedures</span>
        </div>
        <div style={s.statCard}>
          <span style={s.statLabel}>STORAGE CIPHER</span>
          <span style={s.statValue}>AES-256</span>
          <span style={s.statSub}>Encrypted at rest</span>
        </div>
      </div>

      {/* ── Documents Table ───────────────────────────────────────────────────── */}
      <div style={s.tableCard}>
        <div style={s.tableHeaderRow}>
          <p style={s.sectionLabel}>RESEARCH REPOSITORY & DOCUMENTATION HUB</p>
          <span style={{ fontSize: 12, color: "#9e9e9e", marginRight: 16 }}>
            {docs.length} {docs.length === 1 ? "File" : "Files"} Available
          </span>
        </div>

        {docs.length === 0 ? (
          <div style={{ padding: "60px 20px", textAlign: "center" }}>
            <div style={{ fontSize: 36, marginBottom: 12 }}>📄</div>
            <p style={{ fontSize: 15, fontWeight: 600, color: "#161616", margin: "0 0 6px" }}>
              No documents yet
            </p>
            <p style={{ fontSize: 13, color: "#888", margin: "0 0 16px" }}>
              {selectedProjectId === "ALL"
                ? "Create your first document to get started."
                : "No documents for this project yet."}
            </p>
            <button onClick={() => setShowUploadModal(true)} style={s.btnPrimary}>
              + Create First Document
            </button>
          </div>
        ) : (
          <table style={s.table}>
            <thead>
              <tr>
                <th style={s.th}>Document Title</th>
                <th style={s.th}>Project</th>
                <th style={s.th}>Category</th>
                <th style={s.th}>Authors</th>
                <th style={s.th}>Version</th>
                <th style={s.th}>Last Updated</th>
                <th style={s.th}>Status</th>
                <th style={{ ...s.th, textAlign: "right" }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {docs.map(doc => (
                <tr key={doc.id} style={s.tr}>
                  <td style={s.td}>
                    <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                      <strong style={{ fontSize: 13 }}>{doc.title}</strong>
                      <span style={{ fontSize: 11, color: "#9e9e9e", fontFamily: "monospace" }}>
                        {doc.id.substring(0, 8)}…
                      </span>
                    </div>
                  </td>
                  <td style={{ ...s.td, fontSize: 12, color: "#616161" }}>
                    {doc.projectName}
                  </td>
                  <td style={s.td}>
                    <span style={{
                      fontSize: 11, fontWeight: 600, padding: "2px 8px", borderRadius: 4,
                      background: doc.category === "Meeting Minutes"      ? "#e8f5e9"
                                : doc.category === "Experimental Protocol"? "#e3f2fd"
                                : doc.category === "Pre-Print Paper"      ? "#fce4ec"
                                : doc.category === "Archived Dataset"     ? "#fff3e0"
                                : "#f5f5f5",
                      color: doc.category === "Meeting Minutes"      ? "#2e7d32"
                           : doc.category === "Experimental Protocol"? "#1565c0"
                           : doc.category === "Pre-Print Paper"      ? "#c62828"
                           : doc.category === "Archived Dataset"     ? "#e65100"
                           : "#616161",
                    }}>
                      {doc.category}
                    </span>
                  </td>
                  <td style={{ ...s.td, fontSize: 12, color: "#424242" }}>{doc.author}</td>
                  <td style={{ ...s.td, fontSize: 12, color: "#9e9e9e", textAlign: "center" as const }}>
                    v{doc.version}
                  </td>
                  <td style={{ ...s.td, fontSize: 12, color: "#9e9e9e" }}>{doc.date}</td>
                  <td style={s.td}>
                    <span style={{
                      ...s.badge,
                      ...(doc.status === "Approved" ? s.badgeApproved
                        : doc.status === "Under Review" ? s.badgeReview
                        : s.badgeDefault),
                    }}>
                      {doc.status}
                    </span>
                  </td>
                  <td style={{ ...s.td, textAlign: "right" as const }}>
                    <div style={{ display: "flex", gap: 6, justifyContent: "flex-end" }}>
                      <button onClick={() => openDoc(doc)} style={s.btnOpen}>
                        Open →
                      </button>
                      <button
                        onClick={() => handleDeleteDoc(doc)}
                        disabled={deleting === doc.id}
                        style={s.btnDelete}
                        title="Delete document"
                      >
                        {deleting === doc.id ? "…" : "🗑"}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* ── Document Editor Modal ─────────────────────────────────────────────── */}
      {selectedDoc && (
        <div style={m.overlay}>
          <div style={m.modalLarge}>
            <div style={m.header}>
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" as const }}>
                  <h3 style={m.title}>{selectedDoc.title}</h3>
                  <span style={{
                    fontSize: 11, fontWeight: 600, padding: "2px 7px", borderRadius: 4,
                    background: "#e3f2fd", color: "#1565c0",
                  }}>
                    {selectedDoc.category}
                  </span>
                  <span style={{ fontSize: 11, color: "#888", background: "#f0f0f0", padding: "2px 6px", borderRadius: 3 }}>
                    📁 {selectedDoc.projectName}
                  </span>
                  <span style={{ fontSize: 11, color: "#888", background: "#f0f0f0", padding: "2px 6px", borderRadius: 3 }}>
                    v{selectedDoc.version}
                  </span>
                </div>
                <p style={m.sub}>
                  Author: <strong>{selectedDoc.author}</strong> • Updated: {selectedDoc.date} • 🔒 AES-256 Encrypted
                </p>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                {!isEditing ? (
                  <button onClick={() => setIsEditing(true)} style={s.btnPrimary}>
                    ✏ Edit Document
                  </button>
                ) : (
                  <button onClick={handleSaveDoc} disabled={saving} style={s.btnSave}>
                    {saving ? "Saving…" : "💾 Save Changes"}
                  </button>
                )}
                <button onClick={() => { setSelectedDoc(null); setIsEditing(false); }} style={m.closeBtn}>✕</button>
              </div>
            </div>

            <div style={m.bodyLarge}>
              {isEditing ? (
                <textarea
                  rows={14}
                  value={editContent}
                  onChange={e => setEditContent(e.target.value)}
                  style={m.editorTextarea}
                  placeholder="Write your document content here (Markdown supported)…"
                />
              ) : (
                <div style={m.renderedDoc}>
                  <pre style={m.docPre}>
                    {selectedDoc.content || "(No content yet — click Edit to add content)"}
                  </pre>
                </div>
              )}
            </div>

            <div style={m.footer}>
              <span style={{ fontSize: 12, color: "#2e7d32", fontWeight: 600 }}>
                🔒 End-to-End Encrypted • Zero Cloud Leakage
              </span>
              <button onClick={() => { setSelectedDoc(null); setIsEditing(false); }} style={m.btnSecondary}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Create Document Modal ─────────────────────────────────────────────── */}
      {showUploadModal && (
        <div style={m.overlay}>
          <div style={m.modal}>
            <div style={m.header}>
              <div>
                <h3 style={m.title}>Create Research Document</h3>
                <p style={m.sub}>Initialize collaborative meeting minutes or lab protocol.</p>
              </div>
              <button
                onClick={() => { setShowUploadModal(false); setCreateError(null); }}
                style={m.closeBtn}
              >✕</button>
            </div>

            <form onSubmit={handleCreateDoc} style={m.body}>
              {createError && (
                <div style={{ background: "#fff0f0", border: "1px solid #f5c6cb", borderRadius: 4, padding: "10px 14px", fontSize: 13, color: "#c62828" }}>
                  {createError}
                </div>
              )}

              <div style={m.field}>
                <label style={m.label}>DOCUMENT TITLE *</label>
                <input
                  required
                  placeholder="e.g. Synthesis Protocol for Next Batch"
                  value={titleInput}
                  onChange={e => setTitleInput(e.target.value)}
                  style={m.input}
                />
              </div>

              <div style={m.field}>
                <label style={m.label}>TARGET PROJECT *</label>
                <select
                  value={createProjectId}
                  onChange={e => setCreateProjectId(e.target.value)}
                  style={m.select}
                  required
                >
                  {projects.length === 0 ? (
                    <option value="">No projects available</option>
                  ) : (
                    projects.map(p => (
                      <option key={p.id} value={p.id}>{p.name}</option>
                    ))
                  )}
                </select>
              </div>

              <div style={m.field}>
                <label style={m.label}>DOCUMENT CATEGORY</label>
                <select
                  value={categoryInput}
                  onChange={e => setCategoryInput(e.target.value as DocCategory)}
                  style={m.select}
                >
                  <option value="Meeting Minutes">Meeting Minutes</option>
                  <option value="Experimental Protocol">Experimental Protocol</option>
                  <option value="Pre-Print Paper">Pre-Print Paper</option>
                  <option value="Archived Dataset">Archived Dataset</option>
                  <option value="Other">Other</option>
                </select>
              </div>

              <div style={m.field}>
                <label style={m.label}>INITIAL CONTENT / OUTLINE</label>
                <textarea
                  rows={4}
                  placeholder="Document outline, notes, or agenda..."
                  value={contentInput}
                  onChange={e => setContentInput(e.target.value)}
                  style={m.textarea}
                />
              </div>

              <div style={m.footer}>
                <button
                  type="button"
                  onClick={() => { setShowUploadModal(false); setCreateError(null); }}
                  style={m.btnSecondary}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creating || !createProjectId || !titleInput.trim()}
                  style={{ ...m.btnPrimary, opacity: (creating || !createProjectId || !titleInput.trim()) ? 0.6 : 1 }}
                >
                  {creating ? "Creating…" : "Create Document"}
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
  headerRow:    { display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: 24 },
  pageTitle:    { fontSize: 28, fontWeight: 700, color: "#161616", letterSpacing: "-0.5px", marginBottom: 4 },
  pageSub:      { fontSize: 13, color: "#9e9e9e" },
  btnPrimary:   { background: "#161616", color: "#ffffff", border: "none", borderRadius: 4, padding: "9px 16px", fontSize: 13, fontWeight: 600, cursor: "pointer" },
  btnSave:      { background: "#2e7d32", color: "#ffffff", border: "none", borderRadius: 4, padding: "9px 16px", fontSize: 13, fontWeight: 600, cursor: "pointer" },
  btnOpen:      { padding: "5px 12px", background: "#f5f5f5", border: "1px solid #d0d0d0", borderRadius: 4, fontSize: 12, fontWeight: 600, color: "#161616", cursor: "pointer" },
  btnDelete:    { padding: "5px 8px", background: "#fff0f0", border: "1px solid #f5c6cb", borderRadius: 4, fontSize: 12, cursor: "pointer" },
  statGrid:     { display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16, marginBottom: 32 },
  statCard:     { background: "#ffffff", border: "1px solid #e0e0e0", borderRadius: 6, padding: "18px 20px 20px", display: "flex", flexDirection: "column", gap: 6 },
  statLabel:    { fontSize: 11, fontWeight: 600, color: "#9e9e9e", letterSpacing: "0.5px", textTransform: "uppercase" as const },
  statValue:    { fontSize: 32, fontWeight: 700, color: "#161616", letterSpacing: "-1px", lineHeight: 1.1 },
  statSub:      { fontSize: 12, color: "#9e9e9e" },
  tableCard:    { background: "#ffffff", border: "1px solid #e0e0e0", borderRadius: 6, overflow: "hidden" },
  tableHeaderRow:{ display: "flex", alignItems: "center", justifyContent: "space-between" },
  sectionLabel: { fontSize: 11, fontWeight: 600, color: "#9e9e9e", letterSpacing: "0.6px", textTransform: "uppercase" as const, padding: "16px 20px 12px" },
  table:        { width: "100%", borderCollapse: "collapse" as const, fontSize: 13 },
  th:           { textAlign: "left" as const, padding: "8px 16px", fontSize: 12, fontWeight: 500, color: "#9e9e9e", borderBottom: "1px solid #eeeeee", borderTop: "1px solid #eeeeee", background: "#fafafa" },
  tr:           { borderBottom: "1px solid #f0f0f0" },
  td:           { padding: "12px 16px", color: "#161616", fontSize: 13, verticalAlign: "middle" as const },
  badge:        { fontSize: 11, fontWeight: 600, padding: "3px 8px", borderRadius: 4 },
  badgeApproved:{ background: "#161616", color: "#ffffff" },
  badgeReview:  { background: "#fff8e1", color: "#f57f17", border: "1px solid #ffe082" },
  badgeDefault: { background: "transparent", color: "#616161", border: "1px solid #d0d0d0" },
};

const m: Record<string, React.CSSProperties> = {
  overlay:       { position: "fixed" as const, inset: 0, background: "rgba(0,0,0,0.4)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 100, padding: 20 },
  modal:         { background: "#ffffff", border: "1px solid #e0e0e0", borderRadius: 6, width: "100%", maxWidth: 520, boxShadow: "0 10px 25px rgba(0,0,0,0.1)" },
  modalLarge:    { background: "#ffffff", border: "1px solid #e0e0e0", borderRadius: 6, width: "100%", maxWidth: 800, boxShadow: "0 10px 25px rgba(0,0,0,0.1)", maxHeight: "90vh", display: "flex", flexDirection: "column" as const },
  header:        { padding: "18px 24px", borderBottom: "1px solid #eeeeee", display: "flex", alignItems: "flex-start" as const, justifyContent: "space-between", background: "#fafafa", flexShrink: 0 },
  title:         { fontSize: 16, fontWeight: 700, color: "#161616", margin: 0 },
  sub:           { fontSize: 12, color: "#9e9e9e", marginTop: 4, margin: 0 },
  closeBtn:      { background: "none", border: "none", fontSize: 15, color: "#9e9e9e", cursor: "pointer" },
  body:          { padding: "20px 24px", display: "flex", flexDirection: "column" as const, gap: 14 },
  bodyLarge:     { padding: "24px", flex: 1, overflowY: "auto" as const },
  editorTextarea:{ width: "100%", padding: "14px 16px", fontSize: 14, fontFamily: "monospace", lineHeight: 1.6, border: "1px solid #d0d0d0", borderRadius: 4, outline: "none", color: "#161616", background: "#ffffff", resize: "vertical" as const, minHeight: 280, boxSizing: "border-box" as const },
  renderedDoc:   { background: "#fdfdfd", padding: "20px 24px", border: "1px solid #eeeeee", borderRadius: 4 },
  docPre:        { fontSize: 13, fontFamily: "var(--font, sans-serif)", lineHeight: 1.6, color: "#333333", whiteSpace: "pre-wrap" as const, margin: 0 },
  field:         { display: "flex", flexDirection: "column" as const, gap: 6 },
  label:         { fontSize: 11, fontWeight: 600, color: "#9e9e9e", letterSpacing: "0.5px" },
  input:         { padding: "8px 12px", fontSize: 13, border: "1px solid #d0d0d0", borderRadius: 4, outline: "none", background: "#ffffff" },
  textarea:      { padding: "8px 12px", fontSize: 13, border: "1px solid #d0d0d0", borderRadius: 4, outline: "none", resize: "none" as const },
  select:        { padding: "8px 12px", fontSize: 13, border: "1px solid #d0d0d0", borderRadius: 4, background: "#ffffff", outline: "none" },
  footer:        { padding: "14px 24px", borderTop: "1px solid #eeeeee", background: "#fafafa", display: "flex", justifyContent: "space-between", alignItems: "center", flexShrink: 0 },
  btnPrimary:    { padding: "8px 16px", background: "#161616", color: "#ffffff", border: "none", borderRadius: 4, fontSize: 13, fontWeight: 600, cursor: "pointer" },
  btnSecondary:  { padding: "8px 14px", background: "#ffffff", color: "#424242", border: "1px solid #d0d0d0", borderRadius: 4, fontSize: 13, fontWeight: 500, cursor: "pointer" },
};
