"use client";

import { useEffect, useState } from "react";
import { ProjectsService, type Project, type CreateProjectBody } from "@/lib/services/projects";

/*
 * PATTERN USED HERE (teaching note):
 *
 * This page has two states: "viewing the list" and "showing a create form".
 * When the user clicks "New Project", we show a modal form.
 * When they submit, we call ProjectsService.create() which does:
 *   POST /api/projects → { name, description }
 * Spring Boot creates the project in the DB and returns the new Project.
 * We then prepend it to our local `projects` array so the UI updates instantly
 * without needing to re-fetch the full list. This is called "optimistic update".
 */

type ProjectStatus = "ACTIVE" | "ARCHIVED";

export default function ResearcherProjectsPage() {
  const [projects, setProjects]         = useState<Project[]>([]);
  const [loading, setLoading]           = useState(true);
  const [error, setError]               = useState<string | null>(null);
  const [filter, setFilter]             = useState<"ALL" | ProjectStatus>("ALL");
  const [showModal, setShowModal]       = useState(false);
  const [newName, setNewName]           = useState("");
  const [newDesc, setNewDesc]           = useState("");
  const [creating, setCreating]         = useState(false);
  const [createError, setCreateError]   = useState<string | null>(null);

  /* ── Fetch on mount ─────────────────────────────────────────────────── */
  useEffect(() => {
    ProjectsService.getAll()
      .then(setProjects)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  /* ── Filtered list ──────────────────────────────────────────────────── */
  const visible = filter === "ALL" ? projects : projects.filter(p => p.status === filter);

  /* ── Create project ─────────────────────────────────────────────────── */
  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!newName.trim()) return;
    setCreating(true);
    setCreateError(null);

    try {
      const body: CreateProjectBody = { name: newName.trim(), description: newDesc.trim() || undefined };
      const created = await ProjectsService.create(body);
      // Prepend so it appears at the top of the list
      setProjects(prev => [created, ...prev]);
      setShowModal(false);
      setNewName("");
      setNewDesc("");
    } catch (err: unknown) {
      setCreateError(err instanceof Error ? err.message : "Failed to create project");
    } finally {
      setCreating(false);
    }
  }

  /* ── Delete project ─────────────────────────────────────────────────── */
  async function handleDelete(id: string) {
    if (!confirm("Delete this project? This cannot be undone.")) return;
    try {
      await ProjectsService.delete(id);
      setProjects(prev => prev.filter(p => p.id !== id));
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Delete failed");
    }
  }

  if (loading) return <p style={{ padding: 40, color: "#888", fontSize: 14 }}>Loading projects…</p>;
  if (error)   return <p style={{ padding: 24, color: "#c62828", fontSize: 14 }}>Error: {error}</p>;

  return (
    <div>
      {/* ── Header ──────────────────────────────────────────────────────── */}
      <div style={s.header}>
        <div>
          <h1 style={s.title}>My Projects</h1>
          <p style={s.sub}>{projects.length} project{projects.length !== 1 ? "s" : ""} in this workspace</p>
        </div>
        <button id="btn-new-project" onClick={() => setShowModal(true)} style={s.btnPrimary}>
          + New Project
        </button>
      </div>

      {/* ── Filter tabs ─────────────────────────────────────────────────── */}
      <div style={s.tabs}>
        {(["ALL", "ACTIVE", "ARCHIVED"] as const).map(f => (
          <button key={f} style={filter === f ? s.tabOn : s.tabOff} onClick={() => setFilter(f)}>
            {f === "ALL" ? `All (${projects.length})` : f === "ACTIVE" ? `Active (${projects.filter(p => p.status === "ACTIVE").length})` : `Archived (${projects.filter(p => p.status === "ARCHIVED").length})`}
          </button>
        ))}
      </div>

      {/* ── Projects grid ───────────────────────────────────────────────── */}
      <div style={s.grid}>
        {visible.length === 0 ? (
          <div style={s.empty}>
            <p>No projects yet.</p>
            <button style={s.btnPrimary} onClick={() => setShowModal(true)}>Create your first project</button>
          </div>
        ) : visible.map(p => (
          <div key={p.id} id={`project-card-${p.id}`} style={s.card}>
            <div style={s.cardTop}>
              <span style={{ ...s.statusBadge, ...(p.status === "ACTIVE" ? s.statusActive : s.statusArchived) }}>
                {p.status}
              </span>
              <button
                id={`btn-delete-project-${p.id}`}
                onClick={() => handleDelete(p.id)}
                style={s.deleteBtn}
                title="Delete project"
              >
                ×
              </button>
            </div>
            <h3 style={s.cardName}>{p.name}</h3>
            <p style={s.cardDesc}>{p.description || "No description"}</p>
            <p style={s.cardDate}>Created {new Date(p.createdAt).toLocaleDateString()}</p>
          </div>
        ))}
      </div>

      {/* ── Create Modal ─────────────────────────────────────────────────── */}
      {showModal && (
        <div style={s.overlay}>
          <div style={s.modal}>
            <div style={s.modalHead}>
              <span style={s.modalTitle}>New Project</span>
              <button style={s.closeBtn} onClick={() => { setShowModal(false); setCreateError(null); }}>×</button>
            </div>
            <form onSubmit={handleCreate} style={s.modalForm}>
              {createError && (
                <div style={s.errorBanner}>{createError}</div>
              )}
              <div style={s.field}>
                <label style={s.label}>Project name *</label>
                <input id="input-project-name" style={s.input} value={newName}
                  onChange={e => setNewName(e.target.value)} placeholder="e.g. Quantum Analysis" required />
              </div>
              <div style={s.field}>
                <label style={s.label}>Description</label>
                <textarea id="input-project-desc" style={{ ...s.input, minHeight: 80, resize: "vertical" as const }}
                  value={newDesc} onChange={e => setNewDesc(e.target.value)}
                  placeholder="What is this project about?" />
              </div>
              <div style={s.modalActions}>
                <button type="button" style={s.btnSecondary}
                  onClick={() => { setShowModal(false); setCreateError(null); }}>
                  Cancel
                </button>
                <button id="btn-create-project" type="submit" style={{ ...s.btnPrimary, opacity: creating ? 0.6 : 1 }} disabled={creating}>
                  {creating ? "Creating…" : "Create Project"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

/* ── Styles ─────────────────────────────────────────────────────────────── */
const s: Record<string, React.CSSProperties> = {
  header: { display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 24 },
  title: { fontSize: 22, fontWeight: 700, color: "#161616", marginBottom: 4 },
  sub: { fontSize: 13, color: "#888888" },
  tabs: { display: "flex", gap: 6, marginBottom: 20 },
  tabOn: { padding: "7px 16px", fontSize: 12, fontWeight: 700, color: "#ffffff", background: "#161616", border: "1px solid #161616", borderRadius: 6, cursor: "pointer" },
  tabOff: { padding: "7px 16px", fontSize: 12, fontWeight: 600, color: "#616161", background: "#f5f5f5", border: "1px solid #e0e0e0", borderRadius: 6, cursor: "pointer" },
  grid: { display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 16 },
  empty: { gridColumn: "1/-1", textAlign: "center" as const, padding: "60px 0", color: "#888", display: "flex", flexDirection: "column", alignItems: "center", gap: 16 },
  card: { background: "#ffffff", border: "1px solid #e8e8e8", borderRadius: 8, padding: 20, display: "flex", flexDirection: "column", gap: 8 },
  cardTop: { display: "flex", justifyContent: "space-between", alignItems: "center" },
  statusBadge: { fontSize: 10, fontWeight: 700, letterSpacing: "0.5px", padding: "3px 8px", borderRadius: 4 },
  statusActive: { background: "#e8f5e9", color: "#2e7d32" },
  statusArchived: { background: "#f5f5f5", color: "#757575" },
  deleteBtn: { background: "none", border: "none", fontSize: 18, color: "#bbb", cursor: "pointer", padding: "0 4px" },
  cardName: { fontSize: 15, fontWeight: 600, color: "#161616", margin: 0 },
  cardDesc: { fontSize: 13, color: "#616161", lineHeight: 1.5, margin: 0 },
  cardDate: { fontSize: 11, color: "#aaa", margin: 0, marginTop: 4 },
  btnPrimary: { padding: "10px 18px", background: "#161616", color: "#ffffff", border: "none", borderRadius: 6, fontSize: 13, fontWeight: 600, cursor: "pointer" },
  btnSecondary: { padding: "10px 18px", background: "#ffffff", color: "#161616", border: "1px solid #d0d0d0", borderRadius: 6, fontSize: 13, fontWeight: 600, cursor: "pointer" },
  overlay: { position: "fixed" as const, inset: 0, background: "rgba(0,0,0,0.4)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 100 },
  modal: { background: "#ffffff", borderRadius: 10, padding: 28, width: "100%", maxWidth: 480 },
  modalHead: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 },
  modalTitle: { fontSize: 16, fontWeight: 700, color: "#161616" },
  closeBtn: { background: "none", border: "none", fontSize: 22, color: "#888", cursor: "pointer" },
  modalForm: { display: "flex", flexDirection: "column", gap: 16 },
  modalActions: { display: "flex", gap: 10, justifyContent: "flex-end", marginTop: 8 },
  field: { display: "flex", flexDirection: "column", gap: 6 },
  label: { fontSize: 12, fontWeight: 600, color: "#161616" },
  input: { padding: "10px 12px", fontSize: 14, border: "1.5px solid #d0d0d0", borderRadius: 6, fontFamily: "inherit", width: "100%" },
  errorBanner: { padding: "10px 14px", background: "#fff0f0", border: "1px solid #f5c6cb", borderRadius: 6, fontSize: 13, color: "#c62828" },
};
