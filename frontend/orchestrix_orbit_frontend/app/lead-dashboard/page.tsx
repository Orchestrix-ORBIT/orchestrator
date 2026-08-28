"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ProjectsService, type Project } from "@/lib/services/projects";
import { ResourcesService, type Resource } from "@/lib/services/resources";
import { TeamsService, type TeamMember } from "@/lib/services/teams";
import { TasksService, type Task } from "@/lib/services/tasks";

export default function LeadDashboardPage() {
  const [projects, setProjects]     = useState<Project[]>([]);
  const [resources, setResources]   = useState<Resource[]>([]);
  const [members, setMembers]       = useState<TeamMember[]>([]);
  const [allTasks, setAllTasks]     = useState<Task[]>([]);
  const [loading, setLoading]       = useState(true);
  const [error, setError]           = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      try {
        const [projectList, resourceList, memberList] = await Promise.all([
          ProjectsService.getAll(),
          ResourcesService.getAll(),
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
        const fallbackResearchers = memberList.filter(m => {
          const email = String((m as any).email || "").toLowerCase();
          const name = String((m as any).displayName || "").toLowerCase();
          return email.includes("researcher") || name.includes("researcher");
        }).slice(0, 2);

        const finalAssigned = assignedMembers.length > 0 ? assignedMembers : fallbackResearchers;
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

  if (loading) return <p style={{ padding: 40, color: "#888", fontSize: 14 }}>Loading lead dashboard…</p>;
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
      {/* Stats */}
      <div style={s.statsRow}>
        {STATS.map(stat => (
          <div key={stat.id} id={stat.id} style={s.statCard}>
            <span style={s.statValue}>{stat.value}</span>
            <span style={s.statLabel}>{stat.label}</span>
            <span style={s.statSub}>{stat.sub}</span>
          </div>
        ))}
      </div>

      {/* Projects table */}
      <div style={s.card}>
        <div style={s.cardHead}>
          <span style={s.cardTitle}>Projects Overview</span>
          <Link id="link-all-projects" href="/lead-dashboard/projects" style={s.cardLink}>Manage projects →</Link>
        </div>
        {activeProjects.length === 0 ? (
          <p style={{ color: "#888", fontSize: 13 }}>No active projects yet.</p>
        ) : (
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
                const done    = pTasks.filter(t => t.status === "DONE").length;
                return (
                  <tr key={p.id}>
                    <td style={s.td}>
                      <Link href={`/lead-dashboard/projects/${p.id}`} style={{ color: "#161616", fontWeight: 500, textDecoration: "none" }}>
                        {p.name}
                      </Link>
                    </td>
                    <td style={s.td}>{done}/{pTasks.length} done</td>
                    <td style={s.td}><span style={s.activeBadge}>{p.status}</span></td>
                    <td style={s.td}>{new Date(p.createdAt).toLocaleDateString()}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

const s: Record<string, React.CSSProperties> = {
  statsRow: { display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16, marginBottom: 24 },
  statCard: { background: "#fff", border: "1px solid #e8e8e8", borderRadius: 8, padding: "20px 24px", display: "flex", flexDirection: "column", gap: 4 },
  statValue: { fontSize: 32, fontWeight: 700, color: "#161616", lineHeight: 1 },
  statLabel: { fontSize: 10, fontWeight: 700, color: "#888", letterSpacing: "0.8px", marginTop: 6 },
  statSub: { fontSize: 12, color: "#aaa" },
  card: { background: "#fff", border: "1px solid #e8e8e8", borderRadius: 8, padding: 24, marginBottom: 16 },
  cardHead: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 },
  cardTitle: { fontSize: 14, fontWeight: 600, color: "#161616" },
  cardLink: { fontSize: 12, color: "#888", textDecoration: "none", fontWeight: 500 },
  table: { width: "100%", borderCollapse: "collapse" },
  th: { textAlign: "left" as const, fontSize: 10, fontWeight: 700, color: "#888", letterSpacing: "0.6px", textTransform: "uppercase" as const, paddingBottom: 10, borderBottom: "1px solid #f0f0f0" },
  td: { fontSize: 13, color: "#424242", padding: "10px 0", borderBottom: "1px solid #f8f8f8" },
  activeBadge: { fontSize: 10, fontWeight: 700, background: "#e8f5e9", color: "#2e7d32", padding: "3px 8px", borderRadius: 4, letterSpacing: "0.4px" },
};
