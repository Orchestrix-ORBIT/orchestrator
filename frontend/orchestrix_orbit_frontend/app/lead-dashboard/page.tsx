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
        // Fetch actual assigned members from TeamsService for each project's teamId
        const assignedUserIds = new Set<string>();
        const teamsData = await Promise.all(
          projectList.filter(p => p.teamId).map(p => TeamsService.getTeamMembers(p.teamId as string).catch(() => [] as any[]))
        );
        teamsData.flat().forEach(m => {
          if (m.userId) assignedUserIds.add(m.userId);
          else if (m.id) assignedUserIds.add(m.id);
        });
        
        const finalAssigned = memberList.filter(m => assignedUserIds.has((m as any).id || (m as any).userId));
        setMembers(finalAssigned);

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
    { id: "stat-active-projects", label: "Active Projects", value: String(activeProjects.length), sub: `${projects.length} total across org` },
    { id: "stat-team-members",    label: "Team Members",    value: String(members.length),         sub: "assigned to active work" },
    { id: "stat-open-tasks",      label: "Open Tasks",      value: String(openTasks.length),       sub: "pending completion" },
    { id: "stat-resources",       label: "Available Resources", value: String(availableRes.length), sub: `${resources.length} total hardware/software` },
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



      {/* Stats - Bento Grid Style */}
      <div style={s.statsRow}>
        {STATS.map(stat => (
          <div key={stat.id} id={stat.id} style={s.statCard} className="stat-card-hover">
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16 }}>
              <span style={s.statLabel}>{stat.label}</span>
            </div>
            <div style={{ display: "flex", alignItems: "baseline", gap: 12 }}>
              <span style={s.statValue}>{stat.value}</span>
            </div>
            <span style={s.statSub}>{stat.sub}</span>
          </div>
        ))}
      </div>

      {/* Projects table */}
      <div style={s.card}>
        <div style={s.cardHead}>
          <div>
            <h2 style={s.cardTitle}>Active Projects</h2>
            <p style={{ margin: 0, fontSize: 13, color: "#6b7280", marginTop: 4 }}>Recent projects that require your attention.</p>
          </div>
          <Link id="link-all-projects" href="/lead-dashboard/projects" style={s.cardLink} className="btn-shiny">View all projects →</Link>
        </div>
        {activeProjects.length === 0 ? (
          <p style={{ color: "#6b7280", fontSize: 13, padding: "0 24px 24px" }}>No active projects yet.</p>
        ) : (
          <div style={s.tableWrapper}>
            <table style={s.table}>
              <thead>
                <tr>
                  {["Project Name", "Task Progress", "Current Status", "Created Date"].map(h => (
                    <th key={h} style={s.th}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {activeProjects.map(p => {
                  const pTasks  = allTasks.filter(t => t.projectId === p.id);
                  const done    = pTasks.filter(t => t.status === "ACCEPTED").length;
                  const progress = pTasks.length > 0 ? Math.round((done / pTasks.length) * 100) : 0;
                  return (
                    <tr key={p.id} className="table-row-hover">
                      <td style={s.td}>
                        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                          <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#4f46e5" }} />
                          <Link href={`/lead-dashboard/projects/${p.id}`} className="clickable-project-link" style={{ fontWeight: 600, color: "#111827", textDecoration: "none" }}>
                            {p.name}
                          </Link>
                        </div>
                      </td>
                      <td style={s.td}>
                        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                          <div style={{ flex: 1, height: 6, background: "#f3f4f6", borderRadius: 3, overflow: "hidden", maxWidth: 120 }}>
                            <div style={{ width: `${progress}%`, height: "100%", background: "#4f46e5", borderRadius: 3 }} />
                          </div>
                          <span style={{ fontSize: 12, color: "#6b7280", fontWeight: 500 }}>{progress}%</span>
                        </div>
                      </td>
                      <td style={s.td}><span style={s.activeBadge}>{p.status}</span></td>
                      <td style={s.td}>
                        <span style={{ color: "#4b5563" }}>{new Date(p.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                      </td>
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
  statsRow: { display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 24, marginBottom: 32 },
  statCard: { 
    padding: 24, 
    display: "flex", 
    flexDirection: "column", 
    background: "#ffffff", 
    borderRadius: 16, 
    border: "1px solid rgba(0,0,0,0.06)",
    boxShadow: "0 1px 3px rgba(0,0,0,0.02)",
    transition: "transform 0.2s, box-shadow 0.2s",
  },
  statValue: { fontSize: 36, fontWeight: 700, color: "#111827", lineHeight: 1, letterSpacing: "-0.04em", marginBottom: 8 },
  statLabel: { fontSize: 13, fontWeight: 600, color: "#4b5563" },
  statSub: { fontSize: 12, color: "#9ca3af", fontWeight: 500 },
  card: { 
    background: "#ffffff", 
    borderRadius: 16, 
    border: "1px solid rgba(0,0,0,0.06)",
    boxShadow: "0 1px 3px rgba(0,0,0,0.02)",
    overflow: "hidden",
  },
  cardHead: { display: "flex", justifyContent: "space-between", alignItems: "flex-start", padding: "24px 24px 20px" },
  cardTitle: { fontSize: 18, fontWeight: 600, color: "#111827", margin: 0, letterSpacing: "-0.01em" },
  cardLink: {
    fontSize: 13,
    color: "#111827",
    background: "#ffffff",
    border: "1px solid #e5e7eb",
    padding: "8px 16px",
    borderRadius: 8,
    textDecoration: "none",
    fontWeight: 600,
    display: "inline-flex",
    alignItems: "center",
    transition: "background 0.2s, border-color 0.2s"
  },
  tableWrapper: { width: "100%", overflowX: "auto" },
  table: { width: "100%", borderCollapse: "collapse" },
  th: { textAlign: "left", fontSize: 11, fontWeight: 600, color: "#6b7280", letterSpacing: "0.05em", textTransform: "uppercase", padding: "12px 24px", borderBottom: "1px solid #e5e7eb", borderTop: "1px solid #f3f4f6", background: "#fafafa" },
  td: { fontSize: 14, color: "#374151", padding: "16px 24px", borderBottom: "1px solid #f3f4f6", verticalAlign: "middle" },
  activeBadge: { fontSize: 11, fontWeight: 600, background: "#f3f4f6", color: "#374151", padding: "4px 10px", borderRadius: 12, letterSpacing: "0.02em" },
};
