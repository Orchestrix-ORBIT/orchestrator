"use client";

import { useEffect, useState } from "react";
import LoadingState from "@/components/ui/LoadingState";
import Link from "next/link";
import { ProjectsService, type Project } from "@/lib/services/projects";
import { ResourcesService, type Booking } from "@/lib/services/resources";
import { TasksService, type Task } from "@/lib/services/tasks";

/*
 * HOW THIS PAGE FETCHES DATA (teaching note):
 *
 * useEffect(() => { ... }, []) is React's way of saying:
 * "Run this code AFTER the component first appears on screen."
 *
 * Inside, we call our service functions (e.g. ProjectsService.getAll()).
 * Those use fetch() under the hood to call the Spring Boot API.
 * When the response comes back, we call setProjects(data) to update React state.
 * React then re-renders the component with the real data.
 *
 * Loading state: We show a spinner while waiting for the API.
 * Error state:   We show an error message if the API call fails.
 */

interface Stats {
  openTasks: number;
  dueToday: number;
  activeBookings: number;
}

export default function ResearcherHomePage() {
  const [projects, setProjects]     = useState<Project[]>([]);
  const [allTasks, setAllTasks]     = useState<Task[]>([]);
  const [bookings, setBookings]     = useState<Booking[]>([]);
  const [loading, setLoading]       = useState(true);
  const [error, setError]           = useState<string | null>(null);

  useEffect(() => {
    async function loadDashboard() {
      try {
        setLoading(true);

        // Step 1: Fetch all projects for this tenant
        const projectList = await ProjectsService.getAll();
        setProjects(projectList);

        // Step 2: Fetch tasks for all projects in parallel
        // Promise.all() runs multiple API calls at the same time instead of one-by-one.
        // This is faster — instead of waiting for each to finish before starting the next.
        const taskResults = await Promise.all(
          projectList.map((p) => TasksService.getByProject(p.id).catch(() => [] as Task[]))
        );
        const flatTasks = taskResults.flat();
        // Read the userId persisted to localStorage during login (see app/page.tsx)
        let currentUserId = "";
        try {
          currentUserId = localStorage.getItem("userId") || "";
        } catch (e) {}

        // Only show tasks assigned to this researcher, or tasks with no assignee yet
        const myTasksOnly = flatTasks.filter(
          (t) => !t.assigneeId || t.assigneeId === currentUserId
        );
        setAllTasks(myTasksOnly);

        // Step 3: Fetch this user's bookings
        const myBookings = await ResourcesService.getMyBookings();
        setBookings(myBookings);

      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : "Failed to load dashboard");
      } finally {
        setLoading(false);
      }
    }

    loadDashboard();
  }, []); // [] means: run once on mount, never again

  /* ── Derived stats ──────────────────────────────────────────────────── */
  const today = new Date().toISOString().split("T")[0];
  const stats: Stats = {
    openTasks: allTasks.filter(t => t.status !== "DONE").length,
    dueToday: allTasks.filter(t => t.dueDate?.startsWith(today) && t.status !== "DONE").length,
    activeBookings: bookings.filter(b => b.status === "APPROVED").length,
  };

  /* ── Pending tasks shown in the table (max 5) ───────────────────────── */
  const pendingTasks = allTasks
    .filter(t => t.status !== "DONE")
    .slice(0, 5);

  /* ── Upcoming bookings (max 3) ──────────────────────────────────────── */
  const upcomingBookings = bookings
    .filter(b => b.status === "APPROVED" || b.status === "PENDING")
    .slice(0, 3);

  if (loading) return <LoadingState variant="researcher-home" title="Loading Researcher Workspace…" subtitle="Fetching assigned tasks, active bookings, and workspace projects" />;
  if (error)   return <ErrorState message={error} />;

  const STAT_ITEMS = [
    { id: "stat-open-tasks",      label: "OPEN TASKS",      value: String(stats.openTasks),    sub: `across ${projects.length} project${projects.length !== 1 ? "s" : ""}`, href: "/dashboard/researcher/tasks" },
    { id: "stat-active-bookings", label: "ACTIVE BOOKINGS", value: String(stats.activeBookings), sub: "approved this week", href: "/dashboard/researcher/resources" },
    { id: "stat-notifications",   label: "PROJECTS",        value: String(projects.length),    sub: "active workspaces", href: "/dashboard/researcher/projects" },
  ];

  return (
    <div>
      {/* ── Stats row ────────────────────────────────────────────────────── */}
      <div style={s.statsRow}>
        {STAT_ITEMS.map((stat) => (
          <Link key={stat.id} id={stat.id} href={stat.href} style={{ ...s.statCard, textDecoration: "none" }} className="stat-card-hover">
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16 }}>
              <span style={s.statLabel}>{stat.label}</span>
            </div>
            <div style={{ display: "flex", alignItems: "baseline", gap: 12 }}>
              <span style={s.statValue}>{stat.value}</span>
            </div>
            <span style={s.statSub}>{stat.sub}</span>
          </Link>
        ))}
      </div>

      {/* ── Tasks + Bookings columns ─────────────────────────────────────── */}
      <div style={s.cols}>

        {/* Tasks table */}
        <div style={s.card}>
          <div style={s.cardHead}>
            <div>
              <h2 style={s.cardTitle}>My Tasks</h2>
              <p style={{ margin: 0, fontSize: 13, color: "#6b7280", marginTop: 4 }}>Recent tasks requiring your attention.</p>
            </div>
            <Link id="link-all-tasks" href="/dashboard/researcher/tasks" style={s.cardLink} className="btn-shiny">
              View in Kanban →
            </Link>
          </div>
          <table style={s.table}>
            <thead>
              <tr>
                {["Task", "Project", "Status", "Priority"].map((h) => (
                  <th key={h} style={s.th}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {pendingTasks.length === 0 ? (
                <tr><td colSpan={4} style={{ ...s.td, textAlign: "center", color: "#6b7280" }}>No open tasks 🎉</td></tr>
              ) : pendingTasks.map((task) => (
                <tr key={task.id} className="table-row-hover">
                  <td style={s.td}>
                    <Link href="/dashboard/researcher/tasks" style={{ textDecoration: "none", color: "#111827", fontWeight: 600 }}>
                      {task.title}
                    </Link>
                  </td>
                  <td style={s.td}>
                    <span style={{ color: "#4b5563" }}>
                      {projects.find((p) => p.id === task.projectId)?.name || "Unknown Project"}
                    </span>
                  </td>
                  <td style={s.td}>
                    <Link href="/dashboard/researcher/tasks" style={{ textDecoration: "none" }}>
                      <span style={{ ...s.badge, ...statusStyle(task.status) }}>{task.status.replace("_", " ")}</span>
                    </Link>
                  </td>
                  <td style={s.td}>{task.priority}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Upcoming bookings */}
        <div style={s.card}>
          <div style={s.cardHead}>
            <div>
              <h2 style={s.cardTitle}>Upcoming Bookings</h2>
              <p style={{ margin: 0, fontSize: 13, color: "#6b7280", marginTop: 4 }}>Your scheduled resources.</p>
            </div>
            <Link id="link-all-resources" href="/dashboard/researcher/resources" style={s.cardLink} className="btn-shiny">
              Manage →
            </Link>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {upcomingBookings.length === 0 ? (
              <p style={{ color: "#6b7280", fontSize: 13 }}>No upcoming bookings</p>
            ) : upcomingBookings.map((b) => (
              <div key={b.id} style={s.bookingRow}>
                <div>
                  <div style={s.bookingName}>{b.resourceName}</div>
                  <div style={s.bookingTime}>{new Date(b.startTime).toLocaleString()}</div>
                </div>
                <span style={{ ...s.badge, ...bookingStyle(b.status) }}>{b.status}</span>
              </div>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
}



function ErrorState({ message }: { message: string }) {
  return (
    <div style={{ padding: 24, background: "#fff0f0", border: "1px solid #f5c6cb", borderRadius: 12, color: "#c62828", fontSize: 14 }}>
      <strong>Error:</strong> {message}
    </div>
  );
}

function statusStyle(status: string): React.CSSProperties {
  switch (status) {
    case "IN_PROGRESS": return { background: "#161616", color: "#ffffff", border: "none" };
    default:            return { background: "transparent", color: "#374151", border: "1px solid #d0d0d0" };
  }
}

function bookingStyle(status: string): React.CSSProperties {
  switch (status) {
    case "APPROVED": return { background: "#e8f5e9", color: "#2e7d32", border: "none" };
    case "PENDING":  return { background: "#fff8e1", color: "#f57f17", border: "none" };
    default:         return { background: "#f5f5f5", color: "#616161", border: "none" };
  }
}

/* ── Styles ─────────────────────────────────────────────────────────────── */
const s: Record<string, React.CSSProperties> = {
  statsRow: {
    display: "grid",
    gridTemplateColumns: "repeat(3, 1fr)",
    gap: 24,
    marginBottom: 32,
  },
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
  cols: {
    display: "grid",
    gridTemplateColumns: "1fr 340px",
    gap: 24,
  },
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
  table: { width: "100%", borderCollapse: "collapse" },
  th: { textAlign: "left", fontSize: 11, fontWeight: 600, color: "#6b7280", letterSpacing: "0.05em", textTransform: "uppercase", padding: "12px 24px", borderBottom: "1px solid #e5e7eb", borderTop: "1px solid #f3f4f6", background: "#fafafa" },
  td: { fontSize: 14, color: "#374151", padding: "16px 24px", borderBottom: "1px solid #f3f4f6", verticalAlign: "middle" },
  badge: {
    display: "inline-block",
    padding: "4px 10px",
    borderRadius: 12,
    fontSize: 11,
    fontWeight: 600,
    letterSpacing: "0.02em"
  },
  bookingRow: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: "16px 24px",
    borderBottom: "1px solid #f3f4f6",
    transition: "background 0.2s",
  },
  bookingName: {
    fontSize: 14,
    fontWeight: 600,
    color: "#111827",
    marginBottom: 4,
  },
  bookingTime: {
    fontSize: 12,
    color: "#6b7280",
    fontWeight: 500,
  },
};
