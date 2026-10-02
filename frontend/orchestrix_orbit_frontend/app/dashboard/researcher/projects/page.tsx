"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ProjectsService, type Project } from "@/lib/services/projects";
import { TasksService, type Task } from "@/lib/services/tasks";
import LoadingState from "@/components/ui/LoadingState";

export default function ResearcherProjectsPage() {
  const [projects, setProjects]     = useState<Project[]>([]);
  const [allTasks, setAllTasks]     = useState<Task[]>([]);
  const [loading, setLoading]       = useState(true);
  const [error, setError]           = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState<"ALL" | "ACTIVE" | "ARCHIVED">("ALL");

  useEffect(() => {
    async function loadData() {
      try {
        const projectList = await ProjectsService.getAll();
        setProjects(projectList);
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

  if (loading) return <LoadingState variant="table" title="Loading projects…" subtitle="Fetching your assigned projects" />;
  if (error)   return <p style={{ padding: 24, color: "#c62828", fontSize: 14 }}>Error: {error}</p>;

  return (
    <div>
      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div style={s.header}>
        <div>
          <h1 style={s.title}>My Projects</h1>
          <p style={s.sub}>{projects.length} project{projects.length !== 1 ? "s" : ""} in this workspace</p>
        </div>
        <div style={{ position: "relative" }}>
          <input
            type="text"
            placeholder="Search projects…"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            style={s.searchInput}
          />
        </div>
      </div>

      {/* ── Filter Tabs ─────────────────────────────────────────────────────── */}
      <div style={s.filterRow}>
        {(["ALL", "ACTIVE", "ARCHIVED"] as const).map(f => (
          <button
            key={f}
            onClick={() => setFilterStatus(f)}
            style={{ ...s.filterTab, ...(filterStatus === f ? s.filterTabActive : {}) }}
          >
            {f === "ALL" ? "All" : f === "ACTIVE" ? "Active" : "Archived"}
            <span style={s.filterCount}>{counts[f]}</span>
          </button>
        ))}
      </div>

      {/* ── Project Grid ────────────────────────────────────────────────────── */}
      <div style={s.grid}>
        {filtered.map(p => {
          const pTasks = allTasks.filter(t => t.projectId === p.id);
          const doneCount = pTasks.filter(t => t.status === "DONE" || t.status === "ACCEPTED").length;

          return (
            <div key={p.id} id={`project-card-${p.id}`} style={s.card}>
              {/* Card Top: status badge + open button */}
              <div style={s.cardTop}>
                <span style={{ ...s.badge, ...(p.status === "ACTIVE" ? s.activeStyle : s.archivedStyle), display: "inline-flex", alignItems: "center", gap: 4 }}>
                  <span style={{ fontSize: 8 }}>●</span> {p.status}
                </span>
                <Link
                  id={`btn-view-project-${p.id}`}
                  href={`/dashboard/researcher/projects/${p.id}`}
                  style={s.viewBtn}
                >
                  Open Workspace →
                </Link>
              </div>

              {/* Card Body */}
              <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 6 }}>
                <h3 style={s.cardName}>
                  <Link href={`/dashboard/researcher/projects/${p.id}`} style={{ fontSize: 16, fontWeight: 700, color: "#111827", textDecoration: "none" }}>
                    {p.name}
                  </Link>
                </h3>
                <p style={s.cardDesc}>{p.description || "No description provided."}</p>

                <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 4 }}>
                  <span style={{ fontSize: 11, fontWeight: 600, color: "#374151", background: "#f3f4f6", padding: "2px 8px", borderRadius: 4 }}>
                    📋 {doneCount}/{pTasks.length} tasks done
                  </span>
                </div>
              </div>

              {/* Card Footer */}
              <div style={s.cardFooter}>
                <span style={{ fontSize: 11, color: "#9ca3af", fontStyle: "italic" }}>
                  {p.teamId ? "👥 Team assigned" : "No team assigned"}
                </span>
                <span style={s.cardDate}>{new Date(p.createdAt).toLocaleDateString()}</span>
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
    </div>
  );
}

const s: Record<string, React.CSSProperties> = {
  header: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 },
  title: { fontSize: 22, fontWeight: 700, color: "#111827", marginBottom: 4 },
  sub: { fontSize: 13, color: "#6b7280" },
  searchInput: {
    padding: "8px 14px",
    fontSize: 13,
    border: "1px solid #d0d0d0",
    borderRadius: 6,
    width: 220,
    outline: "none",
    background: "#ffffff",
  },
  filterRow: { display: "inline-flex", gap: 4, background: "#f3f4f6", padding: 4, borderRadius: 12, marginBottom: 20, borderBottom: "1px solid #eeeeee", paddingBottom: 12 },
  filterTab: { padding: "6px 12px", fontSize: 13, fontWeight: 600, color: "#616161", background: "none", border: "none", borderRadius: 4, cursor: "pointer", display: "flex", alignItems: "center", gap: 6 },
  filterTabActive: { background: "#161616", color: "#ffffff" },
  filterCount: { fontSize: 11, background: "rgba(0,0,0,0.06)", padding: "1px 6px", borderRadius: 10 },
  grid: { display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))", gap: 18 },
  card: {
    background: "#ffffff",
    border: "1px solid #f3f4f6",
    borderRadius: 12,
    padding: "20px",
    display: "flex",
    flexDirection: "column",
    gap: 12,
    boxShadow: "0 4px 6px -1px rgba(0,0,0,0.05), 0 2px 4px -1px rgba(0,0,0,0.03)",
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
  cardDate: { fontSize: 11, color: "#9ca3af", fontWeight: 500 },
  empty: { gridColumn: "1/-1", textAlign: "center" as const, padding: "60px 0", color: "#6b7280", display: "flex", flexDirection: "column", alignItems: "center", gap: 16 },
};
