"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { getTenantSlug, getToken } from "@/lib/auth";
import { ProjectsService, type Project } from "@/lib/services/projects";
import { ResourcesService, type Resource } from "@/lib/services/resources";
import { TeamsService, type TeamMember } from "@/lib/services/teams";
import { TasksService, type Task } from "@/lib/services/tasks";

import LoadingState from "@/components/ui/LoadingState";

export default function LeadDashboardPage() {
  const [projects, setProjects]     = useState<Project[]>([]);
  const [resources, setResources]   = useState<Resource[]>([]);
  const [members, setMembers]       = useState<TeamMember[]>([]);
  const [allTasks, setAllTasks]     = useState<Task[]>([]);
  const [loading, setLoading]       = useState(true);
  const [error, setError]           = useState<string | null>(null);
  const [orgName, setOrgName]       = useState<string>("");


  const tenantSlug = getTenantSlug() || "myorg";

  useEffect(() => {
    fetch(`${process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8080"}/api/admin/tenants/${tenantSlug}`, {
      headers: { Authorization: `Bearer ${getToken() ?? ""}`, "X-Tenant-ID": tenantSlug },
    })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data && data.name) setOrgName(data.name);
        else setOrgName(tenantSlug.toUpperCase());
      })
      .catch(() => setOrgName(tenantSlug.toUpperCase()));
  }, [tenantSlug]);

  useEffect(() => {
    async function load() {
      try {
        const [projectList, resourceList, memberList] = await Promise.all([
          ProjectsService.getAll(),
          ResourcesService.getAll().catch(() => [] as Resource[]),
          TeamsService.getAllMembers().catch(() => [] as TeamMember[]),
        ]);
        setProjects(projectList);
        setResources(resourceList);
        let assignmentsMap: Record<string, string[]> = {};
        try {
          assignmentsMap = JSON.parse(localStorage.getItem("project_assigned_members") || "{}");
        } catch (e) {}

        const activeProjectIds = new Set(projectList.map(p => p.id));
        const assignedUserIds = new Set<string>();

        Object.entries(assignmentsMap).forEach(([projId, memberIds]) => {
          if (activeProjectIds.has(projId) && Array.isArray(memberIds)) {
            memberIds.forEach((id: string) => assignedUserIds.add(id));
          }
        });

        const assignedMembers = memberList.filter(m => assignedUserIds.has((m as any).id || (m as any).userId));
        const finalAssigned = assignedMembers.length > 0 ? assignedMembers : memberList;
        setMembers(projectList.length === 0 ? [] : finalAssigned);

        // Load tasks for all projects
        const taskResults = await Promise.all(
          projectList.map(p => TasksService.getByProject(p.id).catch(() => [] as Task[]))
        );
        setAllTasks(taskResults.flat());
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : "Failed to load dashboard");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  if (loading) return <LoadingState title="Loading Lead Dashboard…" subtitle="Fetching project overview, active team members, and open tasks" />;
  if (error)   return <p style={{ padding: 24, color: "#c62828", fontSize: 14 }}>Error: {error}</p>;

  const activeProjects = projects.filter(p => p.status === "ACTIVE");
  const openTasks      = allTasks.filter(t => t.status !== "DONE");
  const availableRes   = resources.filter(r => r.status === "AVAILABLE");

  const STATS = [
    { id: "stat-active-projects", label: "ACTIVE PROJECTS", value: String(activeProjects.length), sub: `${projects.length} total` },
    { id: "stat-team-members",    label: "TEAM MEMBERS",    value: String(members.length),         sub: "across active projects" },
    { id: "stat-open-tasks",      label: "OPEN TASKS",      value: String(openTasks.length),       sub: "pending completion" },
    { id: "stat-resources",       label: "AVAILABLE RESOURCES", value: String(availableRes.length), sub: `${resources.length} total` },
  ];

  return (
    <div>
      {/* ── Organization Header Banner ───────────────────────────────────────── */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: 16 }}>
        <div>
          <h1 style={{ fontSize: 26, fontWeight: 700, color: "#111827", letterSpacing: "-0.025em", margin: 0, marginBottom: 4 }}>
            Research Lead Overview
          </h1>
        </div>
      </div>



      {/* Stats */}
      <div style={s.statsRow}>
        {STATS.map(stat => (
          <div key={stat.id} id={stat.id} style={s.statCard} className="card-depth">
            <span style={s.statValue}>{stat.value}</span>
            <span style={s.statLabel}>{stat.label}</span>
            <span style={s.statSub}>{stat.sub}</span>
          </div>
        ))}
      </div>

      {/* Projects table */}
      <div style={s.card} className="card-depth">
        <div style={s.cardHead}>
          <span style={s.cardTitle}>Projects Overview</span>
          <Link id="link-all-projects" href="/lead-dashboard/projects" style={s.cardLink} className="btn-hover-lift">Manage projects →</Link>
        </div>
        {activeProjects.length === 0 ? (
          <p style={{ color: "#6b7280", fontSize: 13 }}>No active projects yet.</p>
        ) : (
          <div style={s.tableWrapper}>
            <table style={s.table}>
              <thead>
                <tr>
                  {["Project", "Tasks", "Status", "Created"].map(h => (
                    <th key={h} style={s.th}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {activeProjects.map(p => {
                  const pTasks  = allTasks.filter(t => t.projectId === p.id);
                  const done    = pTasks.filter(t => t.status === "ACCEPTED").length;
                  return (
                    <tr key={p.id} className="table-row-hover">
                      <td style={s.td}>
                        <Link href={`/lead-dashboard/projects/${p.id}`} className="clickable-project-link" style={{ fontWeight: 500, color: "#111827", textDecoration: "none" }}>
                          {p.name}
                        </Link>
                      </td>
                      <td style={s.td}>{done}/{pTasks.length} accepted</td>
                      <td style={s.td}><span style={s.activeBadge}>{p.status}</span></td>
                      <td style={s.td}>{new Date(p.createdAt).toLocaleDateString()}</td>
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

const s: Record<string, React.CSSProperties> = {
  statsRow: { display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "clamp(16px, 2vw, 32px)", marginBottom: "clamp(24px, 3vw, 40px)" },
  statCard: { padding: "clamp(20px, 2vw, 32px)", display: "flex", flexDirection: "column", gap: "clamp(6px, 0.5vw, 12px)" },
  statValue: { fontSize: "clamp(28px, 2.5vw, 40px)", fontWeight: 700, color: "#111827", lineHeight: 1, letterSpacing: "-0.03em" },
  statLabel: { fontSize: "clamp(10px, 0.8vw, 13px)", fontWeight: 600, color: "#6b7280", letterSpacing: "0.05em", marginTop: "clamp(8px, 1vw, 16px)", textTransform: "uppercase" },
  statSub: { fontSize: "clamp(12px, 1vw, 15px)", color: "#9ca3af" },
  card: { padding: "clamp(24px, 2.5vw, 40px)", marginBottom: "clamp(16px, 2vw, 32px)" },
  cardHead: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "clamp(16px, 2vw, 32px)" },
  cardTitle: { fontSize: "clamp(14px, 1.2vw, 20px)", fontWeight: 600, color: "#111827" },
  cardLink: {
    fontSize: "clamp(12px, 1vw, 15px)",
    color: "#374151",
    background: "#ffffff",
    border: "1px solid #f3f4f6",
    padding: "clamp(6px, 0.6vw, 10px) clamp(14px, 1.2vw, 20px)",
    borderRadius: 12,
    textDecoration: "none",
    fontWeight: 500,
    display: "inline-flex",
    alignItems: "center",
    gap: 4,
    boxShadow: "0 1px 2px 0 rgba(0, 0, 0, 0.05)",
    transition: "background 0.2s"
  },
  tableWrapper: { border: "1px solid #e5e7eb", borderRadius: 8, overflow: "hidden" },
  table: { width: "100%", borderCollapse: "collapse" },
  th: { textAlign: "left" as const, fontSize: "clamp(10px, 0.8vw, 13px)", fontWeight: 600, color: "#6b7280", letterSpacing: "0.5px", textTransform: "uppercase" as const, padding: "12px 16px", borderBottom: "1px solid #e5e7eb", background: "#f8f9fa" },
  td: { fontSize: "clamp(13px, 1vw, 15px)", color: "#374151", padding: "clamp(12px, 1vw, 16px) 16px", borderBottom: "1px solid #f3f4f6" },
  activeBadge: { fontSize: "clamp(10px, 0.8vw, 13px)", fontWeight: 600, background: "#dcfce7", color: "#166534", padding: "clamp(4px, 0.4vw, 8px) clamp(10px, 1vw, 16px)", borderRadius: 6, letterSpacing: "0.3px" },
};
