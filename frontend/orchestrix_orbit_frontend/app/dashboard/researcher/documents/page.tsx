"use client";

import { useEffect, useState } from "react";
import { ProjectsService, type Project } from "@/lib/services/projects";
import { DocumentsService, type Document, type CreateDocumentBody, type DocumentAccess } from "@/lib/services/documents";

export default function ResearcherDocumentsPage() {
  const [projects, setProjects]         = useState<Project[]>([]);
  const [documents, setDocuments]       = useState<Document[]>([]);
  const [selectedProject, setSelectedProject] = useState<string>("ALL");
  const [loading, setLoading]           = useState(true);
  const [error, setError]               = useState<string | null>(null);

  // Create modal
  const [showModal, setShowModal]       = useState(false);
  const [modalProjectId, setModalProjectId] = useState("");
  const [newTitle, setNewTitle]         = useState("");
  const [newContent, setNewContent]     = useState("");
  const [newAccess, setNewAccess]       = useState<DocumentAccess>("TEAM");
  const [creating, setCreating]         = useState(false);
  const [createError, setCreateError]   = useState<string | null>(null);

  /* ── Load ───────────────────────────────────────────────────────────── */
  useEffect(() => {
    async function load() {
      try {
        const projectList = await ProjectsService.getAll();
        setProjects(projectList);
        if (projectList.length > 0) setModalProjectId(projectList[0].id);

        // Fetch documents for all projects in parallel
        const docResults = await Promise.all(
          projectList.map(p => DocumentsService.getByProject(p.id).catch(() => [] as Document[]))
        );
        setDocuments(docResults.flat());
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : "Failed to load documents");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const visible = selectedProject === "ALL"
    ? documents
    : documents.filter(d => d.projectId === selectedProject);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!newTitle.trim() || !modalProjectId) return;
    setCreating(true);
    setCreateError(null);
    try {
      const body: CreateDocumentBody = {
        title: newTitle.trim(),
        content: newContent.trim() || undefined,
        accessLevel: newAccess,
      };
      const created = await DocumentsService.create(modalProjectId, body);
      setDocuments(prev => [created, ...prev]);
      setShowModal(false);
      setNewTitle("");
      setNewContent("");
    } catch (err: unknown) {
      setCreateError(err instanceof Error ? err.message : "Failed to create document");
    } finally {
      setCreating(false);
    }
  }

  async function handleDelete(doc: Document) {
    if (!confirm(`Delete "${doc.title}"?`)) return;
    try {
      await DocumentsService.delete(doc.projectId, doc.id);
      setDocuments(prev => prev.filter(d => d.id !== doc.id));
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Delete failed");
    }
  }

  if (loading) return <p style={{ padding: 40, color: "#888", fontSize: 14 }}>Loading documents…</p>;
  if (error)   return <p style={{ padding: 24, color: "#c62828", fontSize: 14 }}>Error: {error}</p>;

  return (
    <div>
      <div style={s.header}>
        <div>
          <h1 style={s.title}>Documents</h1>
          <p style={s.sub}>{documents.length} document{documents.length !== 1 ? "s" : ""} (AES-256 encrypted at rest)</p>
        </div>
        <div style={{ display: "flex", gap: 10 }}>
          <select id="select-doc-project" style={s.select} value={selectedProject}
            onChange={e => setSelectedProject(e.target.value)}>
            <option value="ALL">All Projects</option>
            {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
          <button id="btn-new-doc" style={s.btnPrimary} onClick={() => setShowModal(true)}>
            + New Document
          </button>
        </div>
      </div>

      <div style={s.table}>
        <div style={s.thead}>
          {["Name", "Project", "Access", "Author", "Last Modified"].map(h => (
            <span key={h} style={s.th}>{h}</span>
          ))}
          <span style={s.th}></span>
        </div>
        {visible.length === 0 ? (
          <div style={s.empty}>No documents found. Create your first document above.</div>
        ) : visible.map(doc => {
          const projName = projects.find(p => p.id === doc.projectId)?.name ?? doc.projectId;
          return (
            <div key={doc.id} id={`doc-row-${doc.id}`} style={s.row}>
              <span style={s.docName}>
                <span style={s.lockIcon}>🔒</span>
                {doc.title}
              </span>
              <span style={s.td}>{projName}</span>
              <span style={s.td}>
                <span style={{ ...s.accessBadge, ...accessStyle(doc.accessLevel) }}>{doc.accessLevel}</span>
              </span>
              <span style={s.td}>{doc.authorId.slice(0, 8)}…</span>
              <span style={s.td}>{new Date(doc.updatedAt).toLocaleDateString()}</span>
              <span style={s.td}>
                <button
                  id={`btn-delete-doc-${doc.id}`}
                  style={s.deleteBtn}
                  onClick={() => handleDelete(doc)}
                  title="Delete"
                >
                  ×
                </button>
              </span>
            </div>
          );
        })}
      </div>

      {/* ── Create Modal ─────────────────────────────────────────────────── */}
      {showModal && (
        <div style={s.overlay}>
          <div style={s.modal}>
            <div style={s.modalHead}>
              <span style={s.modalTitle}>New Document</span>
              <button style={s.closeBtn} onClick={() => { setShowModal(false); setCreateError(null); }}>×</button>
            </div>
            <form onSubmit={handleCreate} style={s.modalForm}>
              {createError && <div style={s.errorBanner}>{createError}</div>}
              <div style={s.field}>
                <label style={s.label}>Project *</label>
                <select id="select-doc-create-project" style={s.input} value={modalProjectId}
                  onChange={e => setModalProjectId(e.target.value)} required>
                  {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              </div>
              <div style={s.field}>
                <label style={s.label}>Title *</label>
                <input id="input-doc-title" style={s.input} value={newTitle}
                  onChange={e => setNewTitle(e.target.value)} placeholder="e.g. Methodology Draft" required />
              </div>
              <div style={s.field}>
                <label style={s.label}>Access level</label>
                <select id="select-doc-access" style={s.input} value={newAccess}
                  onChange={e => setNewAccess(e.target.value as DocumentAccess)}>
                  <option value="PRIVATE">Private (only me)</option>
                  <option value="TEAM">Team (all team members)</option>
                  <option value="PUBLIC">Public (all in tenant)</option>
                </select>
              </div>
              <div style={s.field}>
                <label style={s.label}>Content</label>
                <textarea id="input-doc-content" style={{ ...s.input, minHeight: 100, resize: "vertical" as const }}
                  value={newContent} onChange={e => setNewContent(e.target.value)}
                  placeholder="Document content (will be encrypted at rest)" />
              </div>
              <div style={s.modalActions}>
                <button type="button" style={s.btnSecondary} onClick={() => { setShowModal(false); setCreateError(null); }}>Cancel</button>
                <button id="btn-create-doc" type="submit"
                  style={{ ...s.btnPrimary, opacity: creating ? 0.6 : 1 }} disabled={creating}>
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

function accessStyle(access: DocumentAccess): React.CSSProperties {
  switch (access) {
    case "PRIVATE": return { background: "#fce4ec", color: "#880e4f" };
    case "TEAM":    return { background: "#e3f2fd", color: "#1565c0" };
    default:        return { background: "#e8f5e9", color: "#2e7d32" };
  }
}

/* ── Styles ─────────────────────────────────────────────────────────────── */
const s: Record<string, React.CSSProperties> = {
  header: { display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 24 },
  title: { fontSize: 22, fontWeight: 700, color: "#161616", marginBottom: 4 },
  sub: { fontSize: 13, color: "#888888" },
  select: { padding: "8px 12px", fontSize: 13, border: "1.5px solid #d0d0d0", borderRadius: 6, fontFamily: "inherit", background: "#fff" },
  btnPrimary: { padding: "10px 18px", background: "#161616", color: "#ffffff", border: "none", borderRadius: 6, fontSize: 13, fontWeight: 600, cursor: "pointer" },
  btnSecondary: { padding: "10px 18px", background: "#ffffff", color: "#161616", border: "1px solid #d0d0d0", borderRadius: 6, fontSize: 13, fontWeight: 600, cursor: "pointer" },
  table: { background: "#ffffff", border: "1px solid #e8e8e8", borderRadius: 8, overflow: "hidden" },
  thead: { display: "grid", gridTemplateColumns: "2fr 1fr 80px 100px 120px 40px", gap: 0, padding: "12px 20px", borderBottom: "1px solid #f0f0f0", background: "#fafafa" },
  th: { fontSize: 10, fontWeight: 700, color: "#888", letterSpacing: "0.6px", textTransform: "uppercase" as const },
  row: { display: "grid", gridTemplateColumns: "2fr 1fr 80px 100px 120px 40px", gap: 0, padding: "14px 20px", borderBottom: "1px solid #f8f8f8", alignItems: "center" },
  td: { fontSize: 13, color: "#424242" },
  docName: { fontSize: 13, fontWeight: 500, color: "#161616", display: "flex", alignItems: "center", gap: 6 },
  lockIcon: { fontSize: 11 },
  accessBadge: { fontSize: 10, fontWeight: 700, padding: "2px 7px", borderRadius: 4, letterSpacing: "0.3px" },
  deleteBtn: { background: "none", border: "none", fontSize: 18, color: "#bbb", cursor: "pointer", padding: "0 4px" },
  empty: { padding: "40px 20px", textAlign: "center" as const, color: "#888", fontSize: 13 },
  overlay: { position: "fixed" as const, inset: 0, background: "rgba(0,0,0,0.4)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 100 },
  modal: { background: "#ffffff", borderRadius: 10, padding: 28, width: "100%", maxWidth: 480 },
  modalHead: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 },
  modalTitle: { fontSize: 16, fontWeight: 700, color: "#161616" },
  closeBtn: { background: "none", border: "none", fontSize: 22, color: "#888", cursor: "pointer" },
  modalForm: { display: "flex", flexDirection: "column", gap: 14 },
  modalActions: { display: "flex", gap: 10, justifyContent: "flex-end", marginTop: 8 },
  field: { display: "flex", flexDirection: "column", gap: 6 },
  label: { fontSize: 12, fontWeight: 600, color: "#161616" },
  input: { padding: "10px 12px", fontSize: 14, border: "1.5px solid #d0d0d0", borderRadius: 6, fontFamily: "inherit", width: "100%" },
  errorBanner: { padding: "10px 14px", background: "#fff0f0", border: "1px solid #f5c6cb", borderRadius: 6, fontSize: 13, color: "#c62828" },
};
