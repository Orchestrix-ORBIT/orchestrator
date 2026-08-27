"use client";

import { useEffect, useState } from "react";
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
        setAllTasks(flatTasks);

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

  if (loading) return <LoadingState />;
  if (error)   return <ErrorState message={error} />;

  const STAT_ITEMS = [
    { id: "stat-open-tasks",      label: "OPEN TASKS",      value: String(stats.openTasks),    sub: `across ${projects.length} project${projects.length !== 1 ? "s" : ""}` },
    { id: "stat-due-today",       label: "DUE TODAY",       value: String(stats.dueToday),     sub: "tasks need attention" },
    { id: "stat-active-bookings", label: "ACTIVE BOOKINGS", value: String(stats.activeBookings), sub: "approved this week" },
    { id: "stat-notifications",   label: "PROJECTS",        value: String(projects.length),    sub: "active workspaces" },
  ];

  return (
    <div>
      {/* ── Stats row ────────────────────────────────────────────────────── */}
      <div style={s.statsRow}>
        {STAT_ITEMS.map((stat) => (
          <div key={stat.id} id={stat.id} style={s.statCard}>
            <span style={s.statValue}>{stat.value}</span>
            <span style={s.statLabel}>{stat.label}</span>
            <span style={s.statSub}>{stat.sub}</span>
          </div>
        ))}
      </div>

      {/* ── Tasks + Bookings columns ─────────────────────────────────────── */}
      <div style={s.cols}>

        {/* Tasks table */}
        <div style={s.card}>
          <div style={s.cardHead}>
            <span style={s.cardTitle}>My Tasks</span>
            <Link id="link-all-tasks" href="/dashboard/researcher/tasks" style={s.cardLink}>
              View all tasks →
            </Link>
          </div>
          <table style={s.table}>
            <thead>
              <tr>
                {["Task", "Project", "Status", "Priority", "Due"].map((h) => (
                  <th key={h} style={s.th}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {pendingTasks.length === 0 ? (
                <tr><td colSpan={5} style={{ ...s.td, textAlign: "center", color: "#888" }}>No open tasks 🎉</td></tr>
              ) : pendingTasks.map((task) => (
                <tr key={task.id}>
                  <td style={s.td}>{task.title}</td>
                  <td style={s.td}>{task.projectId}</td>
                  <td style={s.td}>
                    <span style={{ ...s.badge, ...statusStyle(task.status) }}>{task.status.replace("_", " ")}</span>
                  </td>
                  <td style={s.td}>{task.priority}</td>
                  <td style={s.td}>{task.dueDate ? new Date(task.dueDate).toLocaleDateString() : "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Upcoming bookings */}
        <div style={s.card}>
          <div style={s.cardHead}>
            <span style={s.cardTitle}>Upcoming Bookings</span>
            <Link id="link-all-resources" href="/dashboard/researcher/resources" style={s.cardLink}>
              Manage →
            </Link>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {upcomingBookings.length === 0 ? (
              <p style={{ color: "#888", fontSize: 13 }}>No upcoming bookings</p>
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

/* ── Helper components ─────────────────────────────────────────────────────── */
function LoadingState() {
  return (
    <div style={{ padding: 40, textAlign: "center", color: "#888", fontSize: 14 }}>
      Loading your workspace…
    </div>
  );
}

function ErrorState({ message }: { message: string }) {
  return (
    <div style={{ padding: 24, background: "#fff0f0", border: "1px solid #f5c6cb", borderRadius: 8, color: "#c62828", fontSize: 14 }}>
      <strong>Error:</strong> {message}
    </div>
  );
}

function statusStyle(status: string): React.CSSProperties {
  switch (status) {
    case "IN_PROGRESS": return { background: "#161616", color: "#ffffff", border: "none" };
    case "BLOCKED":     return { background: "#fde8e8", color: "#c62828", border: "none" };
    default:            return { background: "transparent", color: "#424242", border: "1px solid #d0d0d0" };
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
    gridTemplateColumns: "repeat(4, 1fr)",
    gap: 16,
    marginBottom: 24,
  },
  statCard: {
    background: "#ffffff",
    border: "1px solid #e8e8e8",
    borderRadius: 8,
    padding: "20px 24px",
    display: "flex",
    flexDirection: "column",
    gap: 4,
  },
  statValue: {
    fontSize: 32,
    fontWeight: 700,
    color: "#161616",
    lineHeight: 1,
  },
  statLabel: {
    fontSize: 10,
    fontWeight: 700,
    color: "#888888",
    letterSpacing: "0.8px",
    marginTop: 6,
  },
  statSub: {
    fontSize: 12,
    color: "#aaaaaa",
  },
  cols: {
    display: "grid",
    gridTemplateColumns: "1fr 340px",
    gap: 16,
  },
  card: {
    background: "#ffffff",
    border: "1px solid #e8e8e8",
    borderRadius: 8,
    padding: 24,
  },
  cardHead: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  cardTitle: {
    fontSize: 14,
    fontWeight: 600,
    color: "#161616",
  },
  cardLink: {
    fontSize: 12,
    color: "#888888",
    textDecoration: "none",
    fontWeight: 500,
  },
  table: {
    width: "100%",
    borderCollapse: "collapse",
  },
  th: {
    textAlign: "left" as const,
    fontSize: 10,
    fontWeight: 700,
    color: "#888888",
    letterSpacing: "0.6px",
    textTransform: "uppercase" as const,
    paddingBottom: 10,
    borderBottom: "1px solid #f0f0f0",
  },
  td: {
    fontSize: 13,
    color: "#424242",
    padding: "10px 0",
    borderBottom: "1px solid #f8f8f8",
  },
  badge: {
    display: "inline-block",
    padding: "3px 8px",
    borderRadius: 4,
    fontSize: 11,
    fontWeight: 600,
  },
  bookingRow: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: "12px 0",
    borderBottom: "1px solid #f8f8f8",
  },
  bookingName: {
    fontSize: 13,
    fontWeight: 500,
    color: "#161616",
    marginBottom: 2,
  },
  bookingTime: {
    fontSize: 12,
    color: "#888888",
  },
};
