"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ProjectsService, type Project } from "@/lib/services/projects";
import { TeamsService } from "@/lib/services/teams";
import { TasksService, type Task } from "@/lib/services/tasks";
import LoadingState from "@/components/ui/LoadingState";

export default function ResearcherProjectsPage() {
  const [projects, setProjects]     = useState<Project[]>([]);
  const [allTasks, setAllTasks]     = useState<Task[]>([]);
  const [loading, setLoading]       = useState(true);
  const [error, setError]           = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState<"ALL" | "ACTIVE" | "ARCHIVED">("ALL");
  const [projectMemberCounts, setProjectMemberCounts] = useState<Record<string, number>>({});

  // Members Modal State
  const [selectedProjectForMembersModal, setSelectedProjectForMembersModal] = useState<Project | null>(null);
  const [memberModalSearchQuery, setMemberModalSearchQuery]                 = useState("");
  const [memberModalMembers, setMemberModalMembers]                         = useState<any[]>([]);
  const [memberModalLoading, setMemberModalLoading]                         = useState(false);  useEffect(() => {
    async function loadData() {
      try {
        const projectList = await ProjectsService.getAll();
        setProjects(projectList);
        const taskResults = await Promise.all(
          projectList.map(p => TasksService.getByProject(p.id).catch(() => [] as Task[]))
        );
        setAllTasks(taskResults.flat());

        const memberCountEntries = await Promise.all(
          projectList
            .filter(p => p.teamId)
            .map(p =>
              ProjectsService.getSummary(p.id)
                .then(s => [p.id, s.teamMemberCount] as [string, number])
                .catch(() => [p.id, 0] as [string, number])
            )
        );
        setProjectMemberCounts(Object.fromEntries(memberCountEntries));
      } catch (e: any) {
        setError(e.message);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  async function openMembersModal(project: Project) {
    setSelectedProjectForMembersModal(project);
    setMemberModalSearchQuery("");
    setMemberModalMembers([]);
    if (project.teamId) {
      setMemberModalLoading(true);
      try {
        const members = await TeamsService.getTeamMembers(project.teamId);
        setMemberModalMembers(members);
      } catch {
        setMemberModalMembers([]);
      } finally {
        setMemberModalLoading(false);
      }
    }
  }

  const filtered = projects.filter(p => {
    const matchStatus = filterStatus === "ALL" || p.status === filterStatus;
    const q = searchQuery.toLowerCase();
    const matchSearch = !q || p.name.toLowerCase().includes(q) || (p.description || "").toLowerCase().includes(q);
    return matchStatus && matchSearch;
  });

  const counts = {
    ALL: projects.length,
    ACTIVE: projects.filter(p => p.status === "ACTIVE").length,
    ARCHIVED: projects.filter(p => p.status === "ARCHIVED").length,
  };

  if (loading) return <LoadingState variant="researcher-projects" title="Loading projects…" subtitle="Fetching your assigned projects" />;
  if (error)   return <p style={{ padding: 24, color: "#c62828", fontSize: 14 }}>Error: {error}</p>;

  return (
    <div>
      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div style={s.header}>
        <div>
          <h1 style={s.title}>My Projects</h1>
          <p style={s.sub}>{projects.length} project{projects.length !== 1 ? "s" : ""} in this workspace</p>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ position: "relative", display: "flex", alignItems: "center" }}>
            <svg style={{ position: "absolute", left: 10, color: "#9ca3af" }} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="8"></circle>
              <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
            </svg>
            <input
              type="text"
              placeholder="Search projects..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              style={s.searchInput}
              className="search-input-premium"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                style={{
                  position: "absolute",
                  right: 8,
                  background: "#f3f4f6",
                  border: "none",
                  fontSize: 10,
                  fontWeight: 700,
                  color: "#6b7280",
                  cursor: "pointer",
                  padding: "4px 6px",
                  borderRadius: 4,
                  lineHeight: 1,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center"
                }}
                title="Clear search"
                className="btn-secondary-hover"
              >
                ESC
              </button>
            )}
          </div>
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
            <span style={{...s.filterCount, background: filterStatus === st ? "#f3f4f6" : "rgba(0,0,0,0.06)"}}>
              {counts[st]}
            </span>
          </button>
        ))}
      </div>

      {/* ── Project Grid ────────────────────────────────────────────────────── */}
      <div style={s.grid}>
        {filtered.map(p => {
          const pTasks = allTasks.filter(t => t.projectId === p.id);
          const doneCount = pTasks.filter(t => t.status === "DONE" || t.status === "ACCEPTED").length;
          const memberCount = projectMemberCounts[p.id] ?? 0;

          return (
            <div key={p.id} id={`project-card-${p.id}`} style={s.card} className="stat-card-hover">
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 }}>
                <div>
                  <h3 style={{ margin: 0, marginBottom: 6 }}>
                    <Link href={`/dashboard/researcher/projects/${p.id}`} style={{ fontSize: 18, fontWeight: 700, color: "#111827", textDecoration: "none", letterSpacing: "-0.01em" }}>
                      {p.name}
                    </Link>
                  </h3>
                  <p style={{ fontSize: 13, color: "#6b7280", margin: 0, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden", lineHeight: 1.5 }}>
                    {p.description || "No description provided."}
                  </p>
                </div>
                <span style={{ ...s.badge, ...(p.status === "ACTIVE" ? s.activeStyle : s.archivedStyle), flexShrink: 0 }}>
                  {p.status}
                </span>
              </div>

              {/* Premium Progress Bar */}
              <div style={{ margin: "16px 0" }}>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, fontWeight: 600, color: "#4b5563", marginBottom: 8 }}>
                  <span>Task Progress</span>
                  <span>{doneCount} / {pTasks.length}</span>
                </div>
                <div style={{ width: "100%", height: 6, background: "#f3f4f6", borderRadius: 3, overflow: "hidden" }}>
                  <div style={{ width: `${pTasks.length > 0 ? (doneCount / pTasks.length) * 100 : 0}%`, height: "100%", background: "#4f46e5", borderRadius: 3, transition: "width 0.5s ease" }} />
                </div>
              </div>

              <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 20 }}>
                <div onClick={() => p.teamId && openMembersModal(p)} className="btn-secondary-hover" style={{...s.metaBadge, cursor: p.teamId ? "pointer" : "default"}}>
                  <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
                    <circle cx="8" cy="6" r="3" />
                    <path d="M3 14c0-2.5 2-4 5-4s5 1.5 5 4" strokeLinecap="round" />
                  </svg>
                  {p.teamId ? `${memberCount} members` : "Unassigned"}
                </div>
              </div>

              <div style={{ marginTop: "auto", borderTop: "1px solid #f3f4f6", paddingTop: 16, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={s.cardDate}>{new Date(p.createdAt).toLocaleDateString()}</span>
                <Link href={`/dashboard/researcher/projects/${p.id}`} style={s.viewBtnMinimal} className="btn-shiny">
                  Open Workspace →
                </Link>
              </div>
            </div>
          );
        })}

        {filtered.length === 0 && (
          <div style={s.empty}>
            <p>{searchQuery || filterStatus !== "ALL" ? "No projects match your search." : "No projects yet. Contact your Research Lead to assign you to a project."}</p>
          </div>
        )}
      </div>

      {/* ── Project Members List Modal (Read-Only) ───────────────────────── */}
      {selectedProjectForMembersModal && (
        <div style={s.overlay} onClick={() => setSelectedProjectForMembersModal(null)}>
          <div style={{ ...s.modal, maxWidth: 440, borderRadius: 12, padding: 0, overflow: "hidden", boxShadow: "0 20px 40px rgba(0,0,0,0.18)" }} onClick={(e) => e.stopPropagation()}>
            <div style={{ padding: "18px 24px", background: "#f9fafb", borderBottom: "1px solid #e5e7eb", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div>
                <h3 style={{ fontSize: 16, fontWeight: 700, color: "#111827", margin: 0 }}>
                  {selectedProjectForMembersModal.name} Members
                </h3>
                <p style={{ fontSize: 12, color: "#6b7280", margin: 0, marginTop: 2 }}>
                  {memberModalLoading ? "Loading…" : `${memberModalMembers.length} assigned researcher(s)`}
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
              {memberModalLoading ? (
                <p style={{ textAlign: "center", fontSize: 13, color: "#6b7280", padding: "20px 0" }}>Loading members…</p>
              ) : (
                <>
                  {memberModalMembers
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
                          key={m.userId || m.id || idx}
                          style={{
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "space-between",
                            padding: "10px 14px",
                            background: "#ffffff",
                            border: "1px solid #f3f4f6",
                            borderRadius: 12,
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

                          <span style={{ fontSize: 11, fontWeight: 600, color: "#4f46e5", background: "#e0e7ff", border: "1px solid #c7d2fe", padding: "2px 8px", borderRadius: 4 }}>
                            {m.roleInTeam || "Researcher"}
                          </span>
                        </div>
                      );
                    })}

                  {memberModalMembers.filter((m) => {
                    const q = memberModalSearchQuery.toLowerCase();
                    const name = (m.displayName || m.userDisplayName || "").toLowerCase();
                    const email = (m.email || m.userEmail || "").toLowerCase();
                    return name.includes(q) || email.includes(q);
                  }).length === 0 && (
                    <p style={{ textAlign: "center", fontSize: 13, color: "#6b7280", padding: "20px 0" }}>
                      {selectedProjectForMembersModal.teamId ? "No matching members found." : "No team assigned to this project yet."}
                    </p>
                  )}
                </>
              )}
            </div>

            <div style={{ padding: "14px 24px", background: "#fafafa", borderTop: "1px solid #f3f4f6", display: "flex", justifyContent: "flex-end", alignItems: "center" }}>
              <button
                type="button"
                style={{ padding: "7px 14px", background: "#ffffff", color: "#111827", border: "1px solid #d0d0d0", borderRadius: 6, fontSize: 13, fontWeight: 600, cursor: "pointer" }}
                onClick={() => setSelectedProjectForMembersModal(null)}
              >
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
  header: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "clamp(16px, 1.5vw, 24px)" },
  title: { fontSize: "clamp(20px, 1.8vw, 28px)", fontWeight: 700, color: "#111827", marginBottom: 4 },
  sub: { fontSize: "clamp(12px, 1vw, 15px)", color: "#6b7280" },
  searchInput: {
    padding: "8px 36px 8px 34px",
    fontSize: 13,
    border: "1px solid rgba(0,0,0,0.08)",
    borderRadius: 8,
    width: 240,
    outline: "none",
    background: "#f9fafb",
    color: "#111827",
    transition: "all 0.2s ease",
    boxShadow: "inset 0 1px 2px rgba(0,0,0,0.02)",
  },
  filterRow: { display: "inline-flex", gap: 4, background: "#f3f4f6", padding: 4, borderRadius: 8, marginBottom: 32 },
  filterTab: { padding: "6px 14px", fontSize: 13, fontWeight: 600, color: "#6b7280", background: "none", border: "none", borderRadius: 6, cursor: "pointer", display: "flex", alignItems: "center", gap: 8, transition: "all 0.2s" },
  filterTabActive: { background: "#ffffff", color: "#111827", boxShadow: "0 1px 3px rgba(0,0,0,0.1)" },
  filterCount: { fontSize: 11, padding: "1px 6px", borderRadius: 10, transition: "background 0.2s" },
  grid: { display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(clamp(280px, 25vw, 400px), 1fr))", gap: 24 },
  card: {
    padding: 24,
    display: "flex",
    flexDirection: "column",
    background: "#ffffff",
    borderRadius: 16,
    border: "1px solid rgba(0,0,0,0.06)",
    boxShadow: "0 1px 3px rgba(0,0,0,0.02)",
  },
  badge: { fontSize: 11, fontWeight: 700, letterSpacing: "0.5px", padding: "4px 10px", borderRadius: 12 },
  activeStyle: { background: "#dcfce7", color: "#166534" },
  archivedStyle: { background: "#f3f4f6", color: "#4b5563" },
  metaBadge: { display: "inline-flex", alignItems: "center", gap: 6, fontSize: 12, fontWeight: 500, color: "#4b5563", background: "#f9fafb", border: "1px solid #e5e7eb", padding: "4px 10px", borderRadius: 8 },
  viewBtnMinimal: { fontSize: 13, fontWeight: 600, color: "#111827", background: "#ffffff", border: "1px solid #e5e7eb", padding: "8px 16px", borderRadius: 8, textDecoration: "none", display: "inline-flex", alignItems: "center", transition: "all 0.2s" },
  cardDate: { fontSize: 12, color: "#9ca3af", fontWeight: 500 },
  empty: { gridColumn: "1/-1", textAlign: "center", padding: "60px 20px", background: "#ffffff", border: "1px dashed #d1d5db", borderRadius: 16, color: "#6b7280", display: "flex", flexDirection: "column", alignItems: "center", gap: 12 },
  overlay: { position: "fixed", inset: 0, background: "rgba(0, 0, 0, 0.25)", backdropFilter: "blur(4px)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 100, padding: 20 },
  modal: { background: "#ffffff", borderRadius: 16, padding: "0 0 24px", width: "100%", maxWidth: 520, boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.25)", border: "1px solid rgba(255,255,255,0.1)", overflow: "visible" },
  closeBtn: { background: "#f3f4f6", border: "none", width: 28, height: 28, borderRadius: "50%", fontSize: 14, color: "#4b5563", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", transition: "background 0.2s" },
};
