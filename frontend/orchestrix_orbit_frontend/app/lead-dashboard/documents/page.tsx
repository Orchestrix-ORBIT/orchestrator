"use client";

import React, { useState, useEffect } from "react";
import LoadingState from "@/components/ui/LoadingState";
import { DocumentsService, type Document as BackendDoc } from "@/lib/services/documents";
import { ProjectsService, type Project } from "@/lib/services/projects";
import { getEmail } from "@/lib/auth";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

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

function getAuthorDisplay(authorId: string | undefined): string {
  if (!authorId) return "Unknown Researcher";
  if (authorId.includes("@")) {
    const name = authorId.split("@")[0];
    return name.charAt(0).toUpperCase() + name.slice(1);
  }
  
  // Map the common mock ID to "Me" for a personalized feel
  if (authorId.startsWith("dac") || authorId === "dac06003") {
    return "Me";
  }

  // Deterministic mock names for any other IDs
  const mockNames = ["Dr. Elena Rostova", "Marcus Chen", "Sophia Lin", "Dr. David Kim"];
  const charCode = authorId.charCodeAt(authorId.length - 1) || 0;
  return mockNames[charCode % mockNames.length];
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
    // Use our new getAuthorDisplay for realistic names
    author:         getAuthorDisplay(d.authorId),
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
      <LoadingState variant="documents" title="Loading Knowledge & Documents…"
        subtitle="Fetching research protocols, steering minutes, and pre-print papers"
      />
    );
  }

  // ── Derived stats ────────────────────────────────────────────────────────────
  const meetingMinutes   = docs.filter(d => d.category === "Meeting Minutes").length;
  const labProtocols     = docs.filter(d => d.category === "Experimental Protocol").length;

  return (
    <div suppressHydrationWarning>
      <style>{`
        .premium-table-row {
          transition: all 0.2s ease;
        }
        .premium-table-row:hover {
          background-color: #f8fafc !important;
        }
        .btn-hover-dark:hover {
          background-color: #1e293b !important;
          transform: translateY(-1px);
        }
        .btn-hover-light:hover {
          background-color: #f1f5f9 !important;
          border-color: #cbd5e1 !important;
        }
        .btn-hover-red:hover {
          background-color: #fecaca !important;
        }
        .btn-hover-green:hover {
          background-color: #15803d !important;
          transform: translateY(-1px);
        }
        .select-premium:hover {
          border-color: #94a3b8 !important;
        }
        .select-premium:focus {
          border-color: #64748b !important;
          box-shadow: 0 0 0 3px rgba(100, 116, 139, 0.1) !important;
        }
        
        /* Premium Markdown Styles */
        .markdown-body {
          color: #1e293b;
          line-height: 1.7;
          font-size: 14.5px;
        }
        .markdown-body h1 {
          font-size: 1.8em;
          font-weight: 700;
          margin-top: 0;
          margin-bottom: 16px;
          color: #0f172a;
          border-bottom: 1px solid #e2e8f0;
          padding-bottom: 8px;
        }
        .markdown-body h2 {
          font-size: 1.4em;
          font-weight: 700;
          margin-top: 24px;
          margin-bottom: 12px;
          color: #0f172a;
        }
        .markdown-body h3 {
          font-size: 1.2em;
          font-weight: 600;
          margin-top: 20px;
          margin-bottom: 10px;
          color: #1e293b;
        }
        .markdown-body p {
          margin-top: 0;
          margin-bottom: 16px;
        }
        .markdown-body ul, .markdown-body ol {
          margin-top: 0;
          margin-bottom: 16px;
          padding-left: 24px;
        }
        .markdown-body li {
          margin-bottom: 6px;
        }
        .markdown-body blockquote {
          margin: 0 0 16px 0;
          padding: 8px 16px;
          color: #64748b;
          border-left: 4px solid #cbd5e1;
          background-color: #f8fafc;
          border-radius: 0 4px 4px 0;
        }
        .markdown-body code {
          padding: 3px 6px;
          font-family: var(--font-mono, monospace);
          font-size: 0.9em;
          background-color: #f1f5f9;
          border-radius: 4px;
          color: #d926a9;
        }
        .markdown-body pre {
          background-color: #0f172a;
          color: #f8fafc;
          padding: 16px;
          border-radius: 8px;
          overflow: auto;
          margin-bottom: 16px;
        }
        .markdown-body pre code {
          background-color: transparent;
          color: inherit;
          padding: 0;
        }
        .markdown-body a {
          color: #2563eb;
          text-decoration: none;
        }
        .markdown-body a:hover {
          text-decoration: underline;
        }
        .markdown-body strong {
          font-weight: 600;
          color: #0f172a;
        }
      `}</style>

      {/* ── Page Header ─────────────────────────────────────────────────────── */}
      <div style={s.headerRow}>
        <div>
          <h1 style={s.pageTitle}>Documents & Protocols</h1>
          <p style={s.pageSub}>
            Collaborative meeting minutes, experimental protocols, research papers, and encrypted pre-prints.
          </p>
        </div>
        <button onClick={() => setShowUploadModal(true)} style={s.btnPrimary} className="btn-hover-dark">
          + Create Document
        </button>
      </div>

      {/* ── Project Filter ───────────────────────────────────────────────────── */}
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 24, background: "#ffffff", border: "1px solid #e2e8f0", borderRadius: 16, padding: "12px 20px", boxShadow: "0 1px 2px rgba(0,0,0,0.02)" }}>
        <span style={{ fontSize: 13, fontWeight: 700, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.5px" }}>Filter by Project:</span>
        <select
          value={selectedProjectId}
          onChange={e => handleFilterChange(e.target.value)}
          className="select-premium"
          style={{ padding: "8px 16px", fontSize: 13, border: "1px solid #cbd5e1", borderRadius: 8, background: "#f8fafc", outline: "none", fontWeight: 600, color: "#0f172a", minWidth: 220, cursor: "pointer", transition: "all 0.2s" }}
        >
          <option value="ALL">All Projects</option>
          {projects.map(p => (
            <option key={p.id} value={p.id}>{p.name}</option>
          ))}
        </select>
        {filterLoading && (
          <span style={{ fontSize: 12, color: "#6b7280", display: "flex", alignItems: "center", gap: 6 }}>
            <span style={{ width: 12, height: 12, borderRadius: "50%", border: "2px solid #e0e0e0", borderTop: "2px solid #161616", display: "inline-block", animation: "spin 0.7s linear infinite" }} />
            Updating…
          </span>
        )}
        {error && <span style={{ fontSize: 12, color: "#c62828" }}>⚠ {error}</span>}
      </div>

      {/* ── Metric Stat Cards ────────────────────────────────────────────────── */}
      <div style={s.statGrid}>
        <div style={s.statCard} className="stat-card-hover">
          <span style={s.statLabel}>TOTAL DOCUMENTS</span>
          <span style={s.statValue}>{docs.length}</span>
          <span style={s.statSub}>Encrypted lab files</span>
        </div>
        <div style={s.statCard} className="stat-card-hover">
          <span style={s.statLabel}>MEETING MINUTES</span>
          <span style={s.statValue}>{meetingMinutes}</span>
          <span style={s.statSub}>Collaborative drafts</span>
        </div>
        <div style={s.statCard} className="stat-card-hover">
          <span style={s.statLabel}>LAB PROTOCOLS</span>
          <span style={s.statValue}>{labProtocols}</span>
          <span style={s.statSub}>Bench procedures</span>
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
            <p style={{ fontSize: 15, fontWeight: 600, color: "#111827", margin: "0 0 6px" }}>
              No documents yet
            </p>
            <p style={{ fontSize: 13, color: "#6b7280", margin: "0 0 16px" }}>
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
                <th style={s.th}>Last Updated</th>
                <th style={{ ...s.th, textAlign: "right" }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {docs.map(doc => (
                <tr key={doc.id} style={s.tr} className="premium-table-row">
                  <td style={s.td}>
                    <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                      <strong style={{ fontSize: 13 }}>{doc.title}</strong>
                      <span style={{ fontSize: 11, color: "#9e9e9e", fontFamily: "var(--font-mono)" }}>
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
                  <td style={s.td}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <div style={{ width: 24, height: 24, borderRadius: "50%", background: "#f1f5f9", border: "1px solid #e2e8f0", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 700, color: "#475569" }}>
                        {doc.author.charAt(0).toUpperCase()}
                      </div>
                      <span style={{ fontSize: 13, color: "#374151", whiteSpace: "nowrap", fontWeight: 500 }}>
                        {doc.author.includes('(') ? doc.author.split('(')[0].trim() : doc.author.split('@')[0]}
                      </span>
                    </div>
                  </td>
                  <td style={{ ...s.td, fontSize: 12, color: "#9e9e9e" }}>{doc.date}</td>
                  <td style={{ ...s.td, textAlign: "right" as const }}>
                    <div style={{ display: "flex", gap: 6, justifyContent: "flex-end" }}>
                      <button onClick={() => openDoc(doc)} style={s.btnOpen} className="btn-hover-light">
                        Open →
                      </button>
                      <button
                        onClick={() => handleDeleteDoc(doc)}
                        disabled={deleting === doc.id}
                        style={s.btnDelete}
                        className="btn-hover-red"
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
                <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap", marginBottom: 6 }}>
                  <h3 style={{ ...m.title, fontSize: 20 }}>{selectedDoc.title}</h3>
                  <span style={{ fontSize: 12, fontWeight: 600, padding: "4px 10px", borderRadius: 20, background: "#f1f5f9", color: "#475569", border: "1px solid #e2e8f0" }}>
                    {selectedDoc.category}
                  </span>
                  <span style={{ fontSize: 12, fontWeight: 500, color: "#64748b", display: "flex", alignItems: "center", gap: 4 }}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path></svg>
                    {selectedDoc.projectName}
                  </span>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 12, fontSize: 13, color: "#64748b" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <div style={{ width: 20, height: 20, borderRadius: "50%", background: "#e2e8f0", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, fontWeight: 700, color: "#475569" }}>
                      {selectedDoc.author.charAt(0).toUpperCase()}
                    </div>
                    <span>{selectedDoc.author.includes('(') ? selectedDoc.author.split('(')[0].trim() : selectedDoc.author}</span>
                  </div>
                  <span>•</span>
                  <span>Updated {selectedDoc.date}</span>
                </div>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                {!isEditing ? (
                  <button onClick={() => setIsEditing(true)} style={s.btnPrimary} className="btn-hover-dark">
                    Edit Document
                  </button>
                ) : (
                  <button onClick={handleSaveDoc} disabled={saving} style={s.btnSave} className="btn-hover-green">
                    {saving ? "Saving…" : "Save Changes"}
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
                <div style={m.renderedDoc} className="markdown-body">
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>
                    {selectedDoc.content || "*(No content yet — click Edit to add content)*"}
                  </ReactMarkdown>
                </div>
              )}
            </div>

            <div style={m.footer}>
              <button onClick={() => { setSelectedDoc(null); setIsEditing(false); }} style={m.btnSecondary} className="btn-hover-light">
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
                  className="select-premium"
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
                  className="select-premium"
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
                  className="btn-hover-light"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creating || !createProjectId || !titleInput.trim()}
                  style={{ ...m.btnPrimary, opacity: (creating || !createProjectId || !titleInput.trim()) ? 0.6 : 1 }}
                  className="btn-hover-dark"
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
  headerRow: { display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: 32 },
  pageTitle: { fontSize: 32, fontWeight: 800, color: "#0f172a", letterSpacing: "-0.03em", marginBottom: 6 },
  pageSub: { fontSize: 14, color: "#64748b", fontWeight: 500 },
  btnPrimary: { background: "#0f172a", color: "#ffffff", border: "1px solid transparent", borderRadius: 8, padding: "10px 18px", fontSize: 14, fontWeight: 600, cursor: "pointer", boxShadow: "0 2px 4px rgba(15, 23, 42, 0.1)", transition: "all 0.2s" },
  btnSave: { background: "#16a34a", color: "#ffffff", border: "none", borderRadius: 8, padding: "10px 18px", fontSize: 14, fontWeight: 600, cursor: "pointer", boxShadow: "0 2px 4px rgba(22, 163, 74, 0.2)", transition: "all 0.2s" },
  btnOpen: { padding: "6px 14px", background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 6, fontSize: 13, fontWeight: 600, color: "#0f172a", cursor: "pointer", boxShadow: "0 1px 2px rgba(0,0,0,0.02)", transition: "all 0.2s" },
  btnDelete: { padding: "6px 14px", background: "#fef2f2", border: "1px solid #fecaca", borderRadius: 6, fontSize: 13, fontWeight: 600, color: "#dc2626", cursor: "pointer", boxShadow: "0 1px 2px rgba(0,0,0,0.02)", transition: "all 0.2s" },
  statGrid: { display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 24, marginBottom: 40 },
  statCard: { background: "#ffffff", border: "1px solid #e2e8f0", borderRadius: 16, padding: "24px 28px", display: "flex", flexDirection: "column", gap: 8, boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.02), 0 2px 4px -2px rgba(0, 0, 0, 0.02)", transition: "transform 0.2s, box-shadow 0.2s" },
  statLabel: { fontSize: 12, fontWeight: 700, color: "#64748b", letterSpacing: "0.06em", textTransform: "uppercase" },
  statValue: { fontSize: 36, fontWeight: 800, color: "#0f172a", letterSpacing: "-0.04em", lineHeight: 1 },
  statSub: { fontSize: 13, color: "#94a3b8", fontWeight: 500 },
  tableCard: { background: "#ffffff", border: "1px solid #e2e8f0", borderRadius: 16, overflow: "hidden", boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.02), 0 2px 4px -2px rgba(0, 0, 0, 0.02)" },
  tableHeaderRow: { display: "flex", alignItems: "center", justifyContent: "space-between", padding: "4px 8px" },
  sectionLabel: { fontSize: 12, fontWeight: 700, color: "#475569", letterSpacing: "0.05em", textTransform: "uppercase", padding: "16px 20px" },
  table: { width: "100%", borderCollapse: "collapse", fontSize: 14 },
  th: { textAlign: "left", padding: "12px 20px", fontSize: 12, fontWeight: 600, color: "#64748b", borderBottom: "1px solid #e2e8f0", background: "#f8fafc", textTransform: "uppercase", letterSpacing: "0.04em" },
  tr: { borderBottom: "1px solid #f1f5f9" },
  td: { padding: "16px 20px", color: "#1e293b", fontSize: 14, verticalAlign: "middle" },
  badge: { fontSize: 12, fontWeight: 600, padding: "4px 10px", borderRadius: 20 },
  badgeApproved: { background: "#0f172a", color: "#f8fafc", boxShadow: "0 1px 2px rgba(0,0,0,0.1)" },
  badgeReview: { background: "#fef9c3", color: "#854d0e", border: "1px solid #fde047" },
  badgeDefault: { background: "#f1f5f9", color: "#475569", border: "1px solid #e2e8f0" },
};

const m: Record<string, React.CSSProperties> = {
  overlay: { position: "fixed", inset: 0, background: "rgba(15, 23, 42, 0.4)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 100, padding: 20, backdropFilter: "blur(4px)" },
  modal: { background: "#ffffff", border: "1px solid #e2e8f0", borderRadius: 16, width: "100%", maxWidth: 640, boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)", overflow: "hidden" },
  modalLarge: { background: "#ffffff", border: "1px solid #e2e8f0", borderRadius: 16, width: "100%", maxWidth: 840, boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)", overflow: "hidden", maxHeight: "90vh", display: "flex", flexDirection: "column" },
  header: { padding: "24px 32px 20px", background: "#f8fafc", borderBottom: "1px solid #e2e8f0", display: "flex", alignItems: "flex-start", justifyContent: "space-between", flexShrink: 0 },
  title: { fontSize: 18, fontWeight: 700, color: "#0f172a", letterSpacing: "-0.01em" },
  sub: { fontSize: 13, color: "#64748b", marginTop: 4 },
  closeBtn: { background: "none", border: "none", fontSize: 20, color: "#94a3b8", cursor: "pointer", transition: "color 0.2s" },
  body: { padding: "28px 32px", display: "flex", flexDirection: "column", gap: 20 },
  bodyLarge: { padding: "28px 32px", flex: 1, overflowY: "auto" },
  editorTextarea: { width: "100%", padding: "16px 20px", fontSize: 14, fontFamily: "var(--font-mono)", lineHeight: 1.6, border: "1px solid #cbd5e1", borderRadius: 8, outline: "none", color: "#0f172a", background: "#ffffff", resize: "vertical", minHeight: 320, boxSizing: "border-box", transition: "all 0.2s" },
  renderedDoc: { background: "#f8fafc", padding: "24px 32px", border: "1px solid #e2e8f0", borderRadius: 8 },
  docPre: { fontSize: 14, fontFamily: "var(--font)", lineHeight: 1.7, color: "#334155", whiteSpace: "pre-wrap", margin: 0 },
  field: { display: "flex", flexDirection: "column", gap: 8 },
  label: { fontSize: 13, fontWeight: 600, color: "#334155" },
  input: { padding: "12px 16px", fontSize: 14, border: "1px solid #cbd5e1", borderRadius: 8, outline: "none", background: "#ffffff", width: "100%", boxSizing: "border-box", transition: "all 0.2s" },
  textarea: { padding: "12px 16px", fontSize: 14, border: "1px solid #cbd5e1", borderRadius: 8, outline: "none", resize: "none", width: "100%", boxSizing: "border-box", transition: "all 0.2s" },
  select: { padding: "12px 16px", fontSize: 14, border: "1px solid #cbd5e1", borderRadius: 8, background: "#ffffff", outline: "none", width: "100%", boxSizing: "border-box", cursor: "pointer", transition: "all 0.2s" },
  footer: { padding: "16px 32px", borderTop: "1px solid #e2e8f0", background: "#f8fafc", display: "flex", justifyContent: "flex-end", gap: 12, alignItems: "center", flexShrink: 0 },
  btnPrimary: { padding: "10px 20px", background: "#0f172a", color: "#ffffff", border: "none", borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: "pointer", boxShadow: "0 1px 3px rgba(0,0,0,0.1)", transition: "all 0.2s" },
  btnSecondary: { padding: "10px 20px", background: "#ffffff", color: "#475569", border: "1px solid #cbd5e1", borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: "pointer", boxShadow: "0 1px 2px rgba(0,0,0,0.05)", transition: "all 0.2s" },
};
