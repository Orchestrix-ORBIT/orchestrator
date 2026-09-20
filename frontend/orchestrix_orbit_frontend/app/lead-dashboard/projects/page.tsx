"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ProjectsService, type Project, type CreateProjectBody } from "@/lib/services/projects";
import { TeamsService } from "@/lib/services/teams";
import { TasksService, type Task } from "@/lib/services/tasks";
import LoadingState from "@/components/ui/LoadingState";

export default function LeadProjectsPage() {
  const [projects, setProjects]       = useState<Project[]>([]);
  const [allTasks, setAllTasks]       = useState<Task[]>([]);
  const [loading, setLoading]         = useState(true);
  const [error, setError]             = useState<string | null>(null);
  const [showModal, setShowModal]     = useState(false);
  const [newName, setNewName]         = useState("");
  const [newDesc, setNewDesc]         = useState("");
  const [creating, setCreating]       = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  const [availableMembers, setAvailableMembers]   = useState<any[]>([]);
  const [selectedMemberIds, setSelectedMemberIds] = useState<string[]>([]);
  const [memberSearchQuery, setMemberSearchQuery] = useState("");

  const [searchQuery, setSearchQuery]             = useState("");
  const [filterStatus, setFilterStatus]           = useState<"ALL" | "ACTIVE" | "ARCHIVED">("ALL");

  const [projectToDelete, setProjectToDelete]     = useState<Project | null>(null);
  const [deleting, setDeleting]                   = useState(false);

  const [projectToEdit, setProjectToEdit]         = useState<Project | null>(null);
  const [editName, setEditName]                   = useState("");
  const [editDesc, setEditDesc]                   = useState("");
  const [editMemberIds, setEditMemberIds]         = useState<string[]>([]);
  const [editMemberSearchQuery, setEditMemberSearchQuery] = useState("");
  const [updating, setUpdating]                   = useState(false);
  const [updateError, setUpdateError]             = useState<string | null>(null);

  const [selectedProjectForMembersModal, setSelectedProjectForMembersModal] = useState<Project | null>(null);
  const [memberModalSearchQuery, setMemberModalSearchQuery]                 = useState("");

  useEffect(() => {
    async function loadData() {
      try {
        const [projectList, members] = await Promise.all([
          ProjectsService.getAll(),
          TeamsService.getAllMembers().catch(() => []),
        ]);
        setProjects(projectList);

        const researchers = (members as any[]).filter((m: any) => {
          const role = String(m.role || "").toUpperCase();
          const name = String(m.displayName || m.userDisplayName || "").toLowerCase();
          const email = String(m.email || m.userEmail || "").toLowerCase();
          return role === "RESEARCHER" || name.includes("researcher") || email.includes("researcher");
        });
        setAvailableMembers(researchers);

        // Fetch task progress for project cards
        const taskResults = await Promise.all(
          projectList.map(p => TasksService.getByProject(p.id).catch(() => [] as Task[]))
        );
        setAllTasks(taskResults.flat());
      } catch (e: any) {
        setError(e.message);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  function toggleMember(userId: string) {
    setSelectedMemberIds(prev =>
      prev.includes(userId) ? prev.filter(id => id !== userId) : [...prev, userId]
    );
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!newName.trim()) return;
    setCreating(true);
    setCreateError(null);
    try {
      const body: CreateProjectBody = { name: newName.trim(), description: newDesc.trim() || undefined };
      const created = await ProjectsService.create(body);

      // Save assigned member IDs to localStorage mapping
      try {
        const storedMap = JSON.parse(localStorage.getItem("project_assigned_members") || "{}");
        storedMap[created.id] = selectedMemberIds;
        localStorage.setItem("project_assigned_members", JSON.stringify(storedMap));
      } catch (err) {
        console.error("Failed to save project member assignments:", err);
      }

      const assigned = availableMembers.filter(m => selectedMemberIds.includes(m.id || m.userId));
      const createdWithMembers = { ...created, assignedMembers: assigned };

      setProjects(prev => [createdWithMembers, ...prev]);
      setShowModal(false);
      setNewName(""); setNewDesc(""); setSelectedMemberIds([]);
    } catch (err: unknown) {
      setCreateError(err instanceof Error ? err.message : "Failed to create project");
    } finally {
      setCreating(false);
    }
  }

  function handleOpenEditModal(p: Project) {
    setProjectToEdit(p);
    setEditName(p.name);
    setEditDesc(p.description || "");
    setEditMemberSearchQuery("");
    setUpdateError(null);

    try {
      const assignmentsMap = JSON.parse(localStorage.getItem("project_assigned_members") || "{}");
      const assignedIds: string[] = assignmentsMap[p.id] || [];
      setEditMemberIds(assignedIds);
    } catch (e) {
      setEditMemberIds([]);
    }
  }

  function toggleEditMember(userId: string) {
    setEditMemberIds(prev =>
      prev.includes(userId) ? prev.filter(id => id !== userId) : [...prev, userId]
    );
  }

  async function handleUpdateProject(e: React.FormEvent) {
    e.preventDefault();
    if (!projectToEdit || !editName.trim()) return;
    setUpdating(true);
    setUpdateError(null);

    try {
      const body: CreateProjectBody = {
        name: editName.trim(),
        description: editDesc.trim() || undefined,
      };

      await ProjectsService.update(projectToEdit.id, body);

      // Save updated member assignments to localStorage mapping
      try {
        const storedMap = JSON.parse(localStorage.getItem("project_assigned_members") || "{}");
        storedMap[projectToEdit.id] = editMemberIds;
        localStorage.setItem("project_assigned_members", JSON.stringify(storedMap));
      } catch (err) {
        console.error("Failed to save project member assignments:", err);
      }

      setProjects(prev =>
        prev.map(p =>
          p.id === projectToEdit.id
            ? { ...p, name: editName.trim(), description: editDesc.trim() || "" }
            : p
        )
      );

      setProjectToEdit(null);
    } catch (err: unknown) {
      setUpdateError(err instanceof Error ? err.message : "Failed to update project");
    } finally {
      setUpdating(false);
    }
  }

  async function confirmDeleteProject() {
    if (!projectToDelete) return;
    setDeleting(true);
    try {
      await ProjectsService.delete(projectToDelete.id);
      setProjects(prev => prev.filter(p => p.id !== projectToDelete.id));

      // Clean up project assignment mapping from localStorage
      try {
        const storedMap = JSON.parse(localStorage.getItem("project_assigned_members") || "{}");
        delete storedMap[projectToDelete.id];
        localStorage.setItem("project_assigned_members", JSON.stringify(storedMap));
      } catch (e) {}

      setProjectToDelete(null);
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Delete failed");
    } finally {
      setDeleting(false);
    }
  }

  function getProjectMembers(projectId: string) {
    try {
      const assignmentsMap = JSON.parse(localStorage.getItem("project_assigned_members") || "{}");
      const assignedIds: string[] = assignmentsMap[projectId] || [];
      return availableMembers.filter(m => assignedIds.includes(m.id || m.userId));
    } catch (e) {
      return [];
    }
  }

  const filteredProjects = projects.filter(p => {
    const matchesSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = filterStatus === "ALL" ? true : p.status === filterStatus;
    return matchesSearch && matchesStatus;
  });

  if (loading) return <LoadingState title="Loading Projects & Workspaces…" subtitle="Fetching research projects, member assignments, and workspace details" />;
  if (error)   return <p style={{ padding: 24, color: "#c62828", fontSize: 14 }}>Error: {error}</p>;

  return (
    <div>
      {/* ── Top Header Row ─────────────────────────────────────────────────── */}
      <div style={s.header}>
        <div>
          <h1 style={s.title}>Projects</h1>
          <p style={s.sub}>{projects.length} workspace projects · {projects.filter(p => p.status === "ACTIVE").length} active</p>
        </div>
        
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ position: "relative" }}>
            <input
              type="text"
              placeholder="Search projects..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              style={s.searchInput}
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                style={{
                  position: "absolute",
                  right: 8,
                  top: "50%",
                  transform: "translateY(-50%)",
                  background: "none",
                  border: "none",
                  fontSize: 14,
                  color: "#9ca3af",
                  cursor: "pointer",
                  padding: "2px 4px",
                  lineHeight: 1,
                }}
                title="Clear search"
              >
                ✕
              </button>
            )}
          </div>
          <button id="btn-new-project" style={s.btnPrimary} onClick={() => setShowModal(true)}>
            + New Project
          </button>
        </div>
      </div>

      {/* ── Filter Tabs ─────────────────────────────────────────────────────── */}
      <div style={s.filterRow}>
        {(["ALL", "ACTIVE", "ARCHIVED"] as const).map(st => (
          <button
            key={st}
            onClick={() => setFilterStatus(st)}
            style={{
              ...s.filterTab,
              ...(filterStatus === st ? s.filterTabActive : {}),
            }}
          >
            {st === "ALL" ? "All Projects" : st === "ACTIVE" ? "Active" : "Archived"}
            <span style={s.filterCount}>
              {st === "ALL" ? projects.length : projects.filter(p => p.status === st).length}
            </span>
          </button>
        ))}
      </div>

      {/* ── Projects Grid ────────────────────────────────────────────────────── */}
      <div style={s.grid}>
        {filteredProjects.map(p => {
          const projectMembers = getProjectMembers(p.id);
          const pTasks = allTasks.filter(t => t.projectId === p.id);
          const doneCount = pTasks.filter(t => t.status === "DONE").length;

          return (
            <div key={p.id} id={`project-card-${p.id}`} style={s.card}>
              <div style={s.cardTop}>
                <span style={{ ...s.badge, ...(p.status === "ACTIVE" ? s.activeStyle : s.archivedStyle), display: "inline-flex", alignItems: "center", gap: 4 }}>
                  <span style={{ fontSize: 8 }}>●</span> {p.status}
                </span>
                <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                  <Link id={`btn-view-project-${p.id}`}
                    href={`/lead-dashboard/projects/${p.id}`}
                    style={s.viewBtn}>
                    Open Workspace →
                  </Link>
                  <button id={`btn-edit-project-${p.id}`}
                    style={s.editBtn}
                    title="Edit project details"
                    onClick={() => handleOpenEditModal(p)}>Edit</button>
                  <button id={`btn-delete-project-${p.id}`}
                    style={s.deleteBtn}
                    title="Delete project"
                    onClick={() => setProjectToDelete(p)}>Delete</button>
                </div>
              </div>

              <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 6 }}>
                <h3 style={s.cardName}>
                  <Link href={`/lead-dashboard/projects/${p.id}`} className="clickable-project-link" style={{ fontSize: 16, fontWeight: 700 }}>
                    {p.name}
                  </Link>
                </h3>
                <p style={s.cardDesc}>{p.description || "No description provided."}</p>

                <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 4 }}>
                  <span style={{ fontSize: 11, fontWeight: 600, color: "#374151", background: "#f3f4f6", padding: "2px 8px", borderRadius: 4 }}>
                    📋 {doneCount}/{pTasks.length} tasks completed
                  </span>
                  <span style={{ fontSize: 11, fontWeight: 600, color: "#1e40af", background: "#eff6ff", padding: "2px 8px", borderRadius: 4 }}>
                    👥 {projectMembers.length} member{projectMembers.length !== 1 ? "s" : ""}
                  </span>
                </div>
              </div>

              {/* ── Card Footer: Team Avatars & Date ───────────────────────────── */}
              <div style={s.cardFooter}>
                <div
                  style={{ ...s.avatarStack, cursor: "pointer" }}
                  onClick={() => {
                    setSelectedProjectForMembersModal(p);
                    setMemberModalSearchQuery("");
                  }}
                  title="Click to view all project members"
                >
                  {projectMembers.length > 0 ? (
                    projectMembers.slice(0, 3).map((m, idx) => {
                      const name = m.displayName || m.userDisplayName || m.email || "Researcher";
                      const initial = name.charAt(0).toUpperCase();
                      return (
                        <div
                          key={m.id || m.userId || idx}
                          title={`Assigned: ${name}`}
                          style={{
                            ...s.avatarCircle,
                            marginLeft: idx > 0 ? -8 : 0,
                          }}
                        >
                          {initial}
                        </div>
                      );
                    })
                  ) : (
                    <span style={s.unassignedText}>Unassigned</span>
                  )}
                  {projectMembers.length > 3 && (
                    <span style={s.moreMembersTag}>
                      +{projectMembers.length - 3}
                    </span>
                  )}
                </div>

                <span style={s.cardDate}>
                  {new Date(p.createdAt).toLocaleDateString()}
                </span>
              </div>
            </div>
          );
        })}

        {filteredProjects.length === 0 && (
          <div style={s.empty}>
            <p>No projects match your search or filter criteria.</p>
            <button style={s.btnPrimary} onClick={() => setShowModal(true)}>Create a project</button>
          </div>
        )}
      </div>

      {/* ── New Project Modal ───────────────────────────────────────────────── */}
      {showModal && (
        <div style={s.overlay}>
          <div style={s.modal}>
            <div style={s.modalHead}>
              <span style={s.modalTitle}>New Project</span>
              <button style={s.closeBtn} onClick={() => { setShowModal(false); setCreateError(null); }}>×</button>
            </div>
            <form onSubmit={handleCreate} style={s.modalForm}>
              {createError && <div style={s.errorBanner}>{createError}</div>}
              <div style={s.field}>
                <label style={s.label}>Project name *</label>
                <input id="input-project-name" style={s.input} value={newName}
                  onChange={e => setNewName(e.target.value)} placeholder="e.g. Neural Interface Study" required />
              </div>
              <div style={s.field}>
                <label style={s.label}>Description</label>
                <textarea id="input-project-desc" style={{ ...s.input, minHeight: 70, resize: "vertical" as const }}
                  value={newDesc} onChange={e => setNewDesc(e.target.value)} placeholder="Project goals and scope" />
              </div>
              <div style={s.field}>
                <label style={s.label}>Assign Members (Researchers)</label>
                
                {/* Selected Member Chips / Tags */}
                <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: selectedMemberIds.length > 0 ? 8 : 0 }}>
                  {selectedMemberIds.map(id => {
                    const member = availableMembers.find(m => (m.id || m.userId) === id);
                    if (!member) return null;
                    const name = member.displayName || member.userDisplayName || member.email;
                    return (
                      <span key={id} style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "4px 10px", background: "#f0f4ff", border: "1px solid #bfdbfe", borderRadius: 16, fontSize: 12, fontWeight: 500, color: "#1e40af" }}>
                        {name}
                        <button
                          type="button"
                          onClick={() => toggleMember(id)}
                          style={{ background: "none", border: "none", cursor: "pointer", color: "#1e40af", fontWeight: 700, fontSize: 14, padding: 0, lineHeight: 1 }}
                        >
                          ×
                        </button>
                      </span>
                    );
                  })}
                </div>

                {/* Search Input with Dropdown Suggestions */}
                <div style={{ position: "relative" }}>
                  <input
                    type="text"
                    style={s.input}
                    placeholder="Search researcher by name or email..."
                    value={memberSearchQuery}
                    onChange={e => setMemberSearchQuery(e.target.value)}
                  />
                  {memberSearchQuery.trim() !== "" && (
                    <div style={{ position: "absolute", top: "100%", left: 0, right: 0, background: "#ffffff", border: "1px solid #e8e8e8", borderRadius: 6, boxShadow: "0 4px 12px rgba(0,0,0,0.1)", maxHeight: 150, overflowY: "auto", zIndex: 10, marginTop: 4 }}>
                      {availableMembers
                        .filter(m => {
                          const id = m.id || m.userId;
                          if (selectedMemberIds.includes(id)) return false;
                          const q = memberSearchQuery.toLowerCase();
                          const name = (m.displayName || m.userDisplayName || "").toLowerCase();
                          const email = (m.email || m.userEmail || "").toLowerCase();
                          return name.includes(q) || email.includes(q);
                        })
                        .map(m => {
                          const id = m.id || m.userId;
                          const name = m.displayName || m.userDisplayName || m.email;
                          return (
                            <div
                              key={id}
                              onClick={() => {
                                toggleMember(id);
                                setMemberSearchQuery("");
                              }}
                              style={{ padding: "8px 12px", fontSize: 13, cursor: "pointer", borderBottom: "1px solid #f8f8f8", display: "flex", justifyContent: "space-between", alignItems: "center" }}
                              onMouseEnter={e => (e.currentTarget.style.background = "#f5f5f5")}
                              onMouseLeave={e => (e.currentTarget.style.background = "#ffffff")}
                            >
                              <span>{name}</span>
                              <span style={{ fontSize: 11, color: "#888" }}>{m.email}</span>
                            </div>
                          );
                        })}
                      {availableMembers.filter(m => {
                        const id = m.id || m.userId;
                        if (selectedMemberIds.includes(id)) return false;
                        const q = memberSearchQuery.toLowerCase();
                        const name = (m.displayName || m.userDisplayName || "").toLowerCase();
                        const email = (m.email || m.userEmail || "").toLowerCase();
                        return name.includes(q) || email.includes(q);
                      }).length === 0 && (
                        <div style={{ padding: "10px 12px", fontSize: 12, color: "#888", textAlign: "center" }}>
                          No matching researchers found
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
              <div style={s.modalActions}>
                <button type="button" style={s.btnSecondary} onClick={() => { setShowModal(false); setCreateError(null); }}>Cancel</button>
                <button id="btn-create-project" type="submit"
                  style={{ ...s.btnPrimary, opacity: creating ? 0.6 : 1 }} disabled={creating}>
                  {creating ? "Creating…" : "Create Project"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* ── Edit Project Modal ───────────────────────────────────────────────── */}
      {projectToEdit && (
        <div style={s.overlay}>
          <div style={s.modal}>
            <div style={s.modalHead}>
              <span style={s.modalTitle}>Edit Project</span>
              <button style={s.closeBtn} onClick={() => { setProjectToEdit(null); setUpdateError(null); }}>×</button>
            </div>
            <form onSubmit={handleUpdateProject} style={s.modalForm}>
              {updateError && <div style={s.errorBanner}>{updateError}</div>}
              <div style={s.field}>
                <label style={s.label}>Project name *</label>
                <input id="input-edit-project-name" style={s.input} value={editName}
                  onChange={e => setEditName(e.target.value)} placeholder="e.g. Neural Interface Study" required />
              </div>
              <div style={s.field}>
                <label style={s.label}>Description</label>
                <textarea id="input-edit-project-desc" style={{ ...s.input, minHeight: 70, resize: "vertical" as const }}
                  value={editDesc} onChange={e => setEditDesc(e.target.value)} placeholder="Project goals and scope" />
              </div>
              <div style={s.field}>
                <label style={s.label}>Assign / Unassign Members (Researchers)</label>
                
                {/* Selected Member Chips / Tags */}
                <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: editMemberIds.length > 0 ? 8 : 0 }}>
                  {editMemberIds.map(id => {
                    const member = availableMembers.find(m => (m.id || m.userId) === id);
                    if (!member) return null;
                    const name = member.displayName || member.userDisplayName || member.email;
                    return (
                      <span key={id} style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "4px 10px", background: "#f0f4ff", border: "1px solid #bfdbfe", borderRadius: 16, fontSize: 12, fontWeight: 500, color: "#1e40af" }}>
                        {name}
                        <button
                          type="button"
                          onClick={() => toggleEditMember(id)}
                          style={{ background: "none", border: "none", cursor: "pointer", color: "#1e40af", fontWeight: 700, fontSize: 14, padding: 0, lineHeight: 1 }}
                        >
                          ×
                        </button>
                      </span>
                    );
                  })}
                </div>

                {/* Search Input with Dropdown Suggestions */}
                <div style={{ position: "relative" }}>
                  <input
                    type="text"
                    style={s.input}
                    placeholder="Search researcher to add..."
                    value={editMemberSearchQuery}
                    onChange={e => setEditMemberSearchQuery(e.target.value)}
                  />
                  {editMemberSearchQuery.trim() !== "" && (
                    <div style={{ position: "absolute", top: "100%", left: 0, right: 0, background: "#ffffff", border: "1px solid #e8e8e8", borderRadius: 6, boxShadow: "0 4px 12px rgba(0,0,0,0.1)", maxHeight: 150, overflowY: "auto", zIndex: 10, marginTop: 4 }}>
                      {availableMembers
                        .filter(m => {
                          const id = m.id || m.userId;
                          if (editMemberIds.includes(id)) return false;
                          const q = editMemberSearchQuery.toLowerCase();
                          const name = (m.displayName || m.userDisplayName || "").toLowerCase();
                          const email = (m.email || m.userEmail || "").toLowerCase();
                          return name.includes(q) || email.includes(q);
                        })
                        .map(m => {
                          const id = m.id || m.userId;
                          const name = m.displayName || m.userDisplayName || m.email;
                          return (
                            <div
                              key={id}
                              onClick={() => {
                                toggleEditMember(id);
                                setEditMemberSearchQuery("");
                              }}
                              style={{ padding: "8px 12px", fontSize: 13, cursor: "pointer", borderBottom: "1px solid #f8f8f8", display: "flex", justifyContent: "space-between", alignItems: "center" }}
                              onMouseEnter={e => (e.currentTarget.style.background = "#f5f5f5")}
                              onMouseLeave={e => (e.currentTarget.style.background = "#ffffff")}
                            >
                              <span>{name}</span>
                              <span style={{ fontSize: 11, color: "#888" }}>{m.email}</span>
                            </div>
                          );
                        })}
                      {availableMembers.filter(m => {
                        const id = m.id || m.userId;
                        if (editMemberIds.includes(id)) return false;
                        const q = editMemberSearchQuery.toLowerCase();
                        const name = (m.displayName || m.userDisplayName || "").toLowerCase();
                        const email = (m.email || m.userEmail || "").toLowerCase();
                        return name.includes(q) || email.includes(q);
                      }).length === 0 && (
                        <div style={{ padding: "10px 12px", fontSize: 12, color: "#888", textAlign: "center" }}>
                          No matching researchers found
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
              <div style={s.modalActions}>
                <button type="button" style={s.btnSecondary} onClick={() => { setProjectToEdit(null); setUpdateError(null); }}>Cancel</button>
                <button id="btn-save-project" type="submit"
                  style={{ ...s.btnPrimary, opacity: updating ? 0.6 : 1 }} disabled={updating}>
                  {updating ? "Saving…" : "Save Changes"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Project Members List Modal ─────────────────────────────────────── */}
      {selectedProjectForMembersModal && (
        <div style={s.overlay} onClick={() => setSelectedProjectForMembersModal(null)}>
          <div style={{ ...s.modal, maxWidth: 440, borderRadius: 12, padding: 0, overflow: "hidden", boxShadow: "0 20px 40px rgba(0,0,0,0.18)" }} onClick={(e) => e.stopPropagation()}>
            <div style={{ padding: "18px 24px", background: "#f9fafb", borderBottom: "1px solid #e5e7eb", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div>
                <h3 style={{ fontSize: 16, fontWeight: 700, color: "#111827", margin: 0 }}>
                  {selectedProjectForMembersModal.name} Members
                </h3>
                <p style={{ fontSize: 12, color: "#6b7280", margin: 0, marginTop: 2 }}>
                  {getProjectMembers(selectedProjectForMembersModal.id).length} assigned researcher(s)
                </p>
              </div>
              <button style={s.closeBtn} onClick={() => setSelectedProjectForMembersModal(null)}>✕</button>
            </div>

            <div style={{ padding: "16px 24px 8px" }}>
              <input
                type="text"
                placeholder="Search project members by name or email..."
                value={memberModalSearchQuery}
                onChange={(e) => setMemberModalSearchQuery(e.target.value)}
                style={{
                  width: "100%",
                  padding: "9px 12px",
                  fontSize: 13,
                  border: "1px solid #d0d0d0",
                  borderRadius: 6,
                  outline: "none",
                  background: "#ffffff",
                }}
              />
            </div>

            <div style={{ padding: "12px 24px 20px", maxHeight: 280, overflowY: "auto", display: "flex", flexDirection: "column", gap: 10 }}>
              {getProjectMembers(selectedProjectForMembersModal.id)
                .filter((m) => {
                  const q = memberModalSearchQuery.toLowerCase();
                  const name = (m.displayName || m.userDisplayName || "").toLowerCase();
                  const email = (m.email || m.userEmail || "").toLowerCase();
                  return name.includes(q) || email.includes(q);
                })
                .map((m, idx) => {
                  const name = m.displayName || m.userDisplayName || m.email || "Researcher";
                  const email = m.email || m.userEmail || "user@myorg.com";
                  const initial = name.charAt(0).toUpperCase();

                  return (
                    <div
                      key={m.id || m.userId || idx}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        padding: "10px 14px",
                        background: "#ffffff",
                        border: "1px solid #e5e7eb",
                        borderRadius: 8,
                      }}
                    >
                      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                        <div
                          style={{
                            width: 32,
                            height: 32,
                            borderRadius: 16,
                            background: "#161616",
                            color: "#ffffff",
                            fontSize: 12,
                            fontWeight: 700,
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                          }}
                        >
                          {initial}
                        </div>
                        <div>
                          <span style={{ fontSize: 13, fontWeight: 600, color: "#111827", display: "block" }}>{name}</span>
                          <span style={{ fontSize: 11, color: "#6b7280" }}>{email}</span>
                        </div>
                      </div>

                      <span style={{ fontSize: 11, fontWeight: 600, color: "#2563eb", background: "#eff6ff", border: "1px solid #bfdbfe", padding: "2px 8px", borderRadius: 4 }}>
                        Researcher
                      </span>
                    </div>
                  );
                })}

              {getProjectMembers(selectedProjectForMembersModal.id).filter((m) => {
                const q = memberModalSearchQuery.toLowerCase();
                const name = (m.displayName || m.userDisplayName || "").toLowerCase();
                const email = (m.email || m.userEmail || "").toLowerCase();
                return name.includes(q) || email.includes(q);
              }).length === 0 && (
                <p style={{ textAlign: "center", fontSize: 13, color: "#888", padding: "20px 0" }}>
                  No matching members found.
                </p>
              )}
            </div>

            <div style={{ padding: "14px 24px", background: "#fafafa", borderTop: "1px solid #f3f4f6", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <button
                type="button"
                onClick={() => {
                  const p = selectedProjectForMembersModal;
                  setSelectedProjectForMembersModal(null);
                  handleOpenEditModal(p);
                }}
                style={{ fontSize: 12, fontWeight: 600, color: "#2563eb", background: "none", border: "none", cursor: "pointer" }}
              >
                + Manage / Edit Members
              </button>
              <button
                type="button"
                style={{ ...s.btnSecondary, padding: "7px 14px" }}
                onClick={() => setSelectedProjectForMembersModal(null)}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Delete Confirmation Modal ────────────────────────────────────────── */}
      {projectToDelete && (
        <div style={s.overlay} onClick={() => setProjectToDelete(null)}>
          <div style={{ ...s.modal, maxWidth: 460, borderRadius: 12, padding: 0, overflow: "hidden", boxShadow: "0 20px 40px rgba(0,0,0,0.18)" }} onClick={(e) => e.stopPropagation()}>
            <div style={{ padding: "20px 24px", background: "#fef2f2", borderBottom: "1px solid #fee2e2", display: "flex", alignItems: "flex-start", justifyContent: "space-between" }}>
              <div style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
                <div style={{ width: 36, height: 36, borderRadius: 18, background: "#ffe4e6", color: "#e11d48", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16, fontWeight: 700, flexShrink: 0 }}>
                  !
                </div>
                <div>
                  <h3 style={{ fontSize: 16, fontWeight: 700, color: "#9f1239", margin: 0 }}>Delete Project</h3>
                  <p style={{ fontSize: 12, color: "#be123c", margin: 0, marginTop: 3, fontWeight: 500 }}>
                    This action is permanent and cannot be undone.
                  </p>
                </div>
              </div>
              <button style={{ ...s.closeBtn, color: "#9f1239" }} onClick={() => setProjectToDelete(null)}>✕</button>
            </div>

            <div style={{ padding: "22px 24px", display: "flex", flexDirection: "column", gap: 14 }}>
              <p style={{ fontSize: 14, color: "#1f2937", lineHeight: 1.5, margin: 0 }}>
                Are you sure you want to delete <strong style={{ color: "#111827", fontWeight: 700 }}>"{projectToDelete.name}"</strong>?
              </p>
              <p style={{ fontSize: 13, color: "#6b7280", lineHeight: 1.5, margin: 0 }}>
                All associated Kanban task cards, attached documents, meeting notes, and member assignments for this workspace will be permanently removed.
              </p>
              
              <div style={{ background: "#f9fafb", border: "1px solid #e5e7eb", borderRadius: 6, padding: "10px 14px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <span style={{ fontSize: 11, fontWeight: 600, color: "#6b7280", letterSpacing: "0.5px" }}>PROJECT ID</span>
                <code style={{ fontSize: 11, color: "#374151", background: "#ffffff", padding: "2px 8px", border: "1px solid #e5e7eb", borderRadius: 4, fontFamily: "monospace", fontWeight: 600 }}>
                  {projectToDelete.id}
                </code>
              </div>
            </div>

            <div style={{ padding: "16px 24px", background: "#fafafa", borderTop: "1px solid #f3f4f6", display: "flex", justifyContent: "flex-end", gap: 10 }}>
              <button
                type="button"
                style={{ ...s.btnSecondary, padding: "9px 18px", borderRadius: 6 }}
                onClick={() => setProjectToDelete(null)}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmDeleteProject}
                disabled={deleting}
                style={{
                  padding: "9px 20px",
                  background: "#e11d48",
                  color: "#ffffff",
                  border: "none",
                  borderRadius: 6,
                  fontSize: 13,
                  fontWeight: 600,
                  cursor: "pointer",
                  opacity: deleting ? 0.6 : 1,
                  boxShadow: "0 1px 2px rgba(225, 29, 72, 0.2)",
                }}
              >
                {deleting ? "Deleting…" : "Delete Project"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const s: Record<string, React.CSSProperties> = {
  header: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 },
  title: { fontSize: 22, fontWeight: 700, color: "#161616", marginBottom: 4 },
  sub: { fontSize: 13, color: "#888888" },
  searchInput: {
    padding: "8px 28px 8px 14px",
    fontSize: 13,
    border: "1px solid #d0d0d0",
    borderRadius: 6,
    width: 220,
    outline: "none",
    background: "#ffffff",
  },
  btnPrimary: { padding: "9px 16px", background: "#161616", color: "#ffffff", border: "none", borderRadius: 6, fontSize: 13, fontWeight: 600, cursor: "pointer" },
  btnSecondary: { padding: "9px 16px", background: "#ffffff", color: "#161616", border: "1px solid #d0d0d0", borderRadius: 6, fontSize: 13, fontWeight: 600, cursor: "pointer" },
  
  filterRow: { display: "flex", gap: 8, marginBottom: 20, borderBottom: "1px solid #eeeeee", paddingBottom: 12 },
  filterTab: { padding: "6px 12px", fontSize: 13, fontWeight: 600, color: "#616161", background: "none", border: "none", borderRadius: 4, cursor: "pointer", display: "flex", alignItems: "center", gap: 6 },
  filterTabActive: { background: "#161616", color: "#ffffff" },
  filterCount: { fontSize: 11, background: "rgba(0,0,0,0.06)", padding: "1px 6px", borderRadius: 10 },

  grid: { display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))", gap: 18 },
  card: {
    background: "#ffffff",
    border: "1px solid #e5e7eb",
    borderRadius: 8,
    padding: "20px",
    display: "flex",
    flexDirection: "column",
    gap: 12,
    boxShadow: "0 2px 4px rgba(0,0,0,0.02)",
    transition: "transform 0.2s ease, box-shadow 0.2s ease",
  },
  cardTop: { display: "flex", justifyContent: "space-between", alignItems: "center" },
  badge: { fontSize: 10, fontWeight: 700, letterSpacing: "0.5px", padding: "3px 8px", borderRadius: 4 },
  activeStyle: { background: "#e8f5e9", color: "#2e7d32" },
  archivedStyle: { background: "#f5f5f5", color: "#757575" },
  viewBtn: {
    fontSize: 12,
    color: "#ffffff",
    background: "#161616",
    fontWeight: 600,
    textDecoration: "none",
    padding: "5px 12px",
    borderRadius: 4,
    display: "inline-block",
  },
  editBtn: {
    background: "#f3f4f6",
    border: "1px solid #e5e7eb",
    fontSize: 11,
    fontWeight: 600,
    color: "#374151",
    cursor: "pointer",
    padding: "5px 10px",
    borderRadius: 4,
    display: "inline-flex",
    alignItems: "center",
    gap: 4,
  },
  deleteBtn: {
    background: "#fff1f2",
    border: "1px solid #fecdd3",
    fontSize: 11,
    fontWeight: 600,
    color: "#e11d48",
    cursor: "pointer",
    padding: "5px 10px",
    borderRadius: 6,
    display: "inline-flex",
    alignItems: "center",
    gap: 4,
  },
  cardName: { fontSize: 16, fontWeight: 700, color: "#111827", margin: 0, lineHeight: 1.3 },
  cardDesc: {
    fontSize: 13,
    color: "#4b5563",
    lineHeight: 1.5,
    margin: 0,
    marginTop: 4,
    display: "-webkit-box",
    WebkitLineClamp: 2,
    WebkitBoxOrient: "vertical" as const,
    overflow: "hidden",
  },
  cardFooter: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    paddingTop: 12,
    borderTop: "1px solid #f3f4f6",
    marginTop: "auto",
  },
  avatarStack: { display: "flex", alignItems: "center" },
  avatarCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    background: "#161616",
    color: "#ffffff",
    fontSize: 10,
    fontWeight: 700,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    border: "2px solid #ffffff",
    boxShadow: "0 1px 2px rgba(0,0,0,0.1)",
  },
  unassignedText: { fontSize: 11, color: "#9ca3af", fontStyle: "italic" },
  moreMembersTag: { fontSize: 11, fontWeight: 700, color: "#4b5563", marginLeft: 6 },
  cardDate: { fontSize: 11, color: "#9ca3af", fontWeight: 500 },
  empty: { gridColumn: "1/-1", textAlign: "center" as const, padding: "60px 0", color: "#888", display: "flex", flexDirection: "column", alignItems: "center", gap: 16 },
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
