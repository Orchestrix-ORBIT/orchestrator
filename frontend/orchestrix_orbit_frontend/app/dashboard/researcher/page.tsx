"use client";

import Link from "next/link";

/* ── Static data matching the reference image ───────────────────────────── */
const STATS = [
  { id: "stat-open-tasks",       label: "OPEN TASKS",       value: "12", sub: "across 3 projects" },
  { id: "stat-due-today",        label: "DUE TODAY",        value: "3",  sub: "tasks need attention" },
  { id: "stat-active-bookings",  label: "ACTIVE BOOKINGS",  value: "2",  sub: "next: GPU Lab, 3 PM" },
  { id: "stat-notifications",    label: "NOTIFICATIONS",    value: "7",  sub: "unread alerts" },
];

type StatusType = "In Progress" | "To Do" | "Blocked";

const TASKS: {
  id: string;
  task: string;
  project: string;
  status: StatusType;
  priority: string;
  dueDate: string;
}[] = [
  { id: "task-1", task: "Data synthesis review",    project: "Alpha Centauri",              status: "In Progress", priority: "High",   dueDate: "Today"     },
  { id: "task-2", task: "Calibrate sensors",         project: "Project Beta",                status: "To Do",       priority: "Medium", dueDate: "Tomorrow"  },
  { id: "task-3", task: "Draft methodology section", project: "Thesis 2026",                 status: "Blocked",     priority: "High",   dueDate: "Aug 18"    },
  { id: "task-4", task: "Peer review submission",    project: "Journal of Advanced Physics", status: "To Do",       priority: "Low",    dueDate: "Aug 20"    },
  { id: "task-5", task: "Update cluster nodes",      project: "Infrastructure",              status: "In Progress", priority: "Medium", dueDate: "Aug 22"    },
];

type BookingStatus = "Confirmed" | "Pending";
const BOOKINGS: {
  id: string;
  resource: string;
  project: string;
  datetime: string;
  status: BookingStatus;
}[] = [
  { id: "booking-1", resource: "GPU Lab Workstation 3",    project: "Project Beta",      datetime: "Today, 15:00",      status: "Confirmed" },
  { id: "booking-2", resource: "Electron Microscope Suite", project: "Material Sci Group", datetime: "Tomorrow, 09:00",  status: "Pending"   },
  { id: "booking-3", resource: "Conference Room A",         project: "Weekly Sync",        datetime: "18 Aug, 11:00",    status: "Confirmed" },
];

/* ── Status badge styles ─────────────────────────────────────────────────── */
const STATUS_STYLES: Record<StatusType, React.CSSProperties> = {
  "In Progress": {
    background: "#161616",
    color: "#ffffff",
    border: "none",
  },
  "To Do": {
    background: "transparent",
    color: "#424242",
    border: "1px solid #d0d0d0",
  },
  "Blocked": {
    background: "#fde8e8",
    color: "#c62828",
    border: "none",
  },
};

const BOOKING_BADGE: Record<BookingStatus, React.CSSProperties> = {
  Confirmed: { background: "transparent", color: "#424242", border: "1px solid #d0d0d0" },
  Pending:   { background: "transparent", color: "#424242", border: "1px solid #d0d0d0" },
};

/* ── Today's date ────────────────────────────────────────────────────────── */
function todayString() {
  return new Date().toLocaleDateString("en-GB", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

/* ════════════════════════════════════════════════════════════════════════════
   Overview Page
═══════════════════════════════════════════════════════════════════════════ */
export default function OverviewPage() {
  return (
    <div>
      {/* ── Page header ───────────────────────────────────────────────────── */}
      <h1 style={s.pageTitle}>Overview</h1>
      <p style={s.pageDate}>{todayString()}</p>

      {/* ── Stat cards ────────────────────────────────────────────────────── */}
      <div style={s.statGrid}>
        {STATS.map((stat) => (
          <div key={stat.id} id={stat.id} style={s.statCard}>
            <span style={s.statLabel}>{stat.label}</span>
            <span style={s.statValue}>{stat.value}</span>
            <span style={s.statSub}>{stat.sub}</span>
          </div>
        ))}
      </div>

      {/* ── Bottom row: Tasks + Bookings ──────────────────────────────────── */}
      <div style={s.bottomRow}>

        {/* Tasks table */}
        <div style={s.tableCard}>
          <p style={s.sectionLabel}>MY TASKS</p>
          <table id="tasks-table" style={s.table}>
            <thead>
              <tr>
                {["Task", "Project", "Status", "Priority", "Due Date"].map((col) => (
                  <th key={col} style={s.th}>{col}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {TASKS.map((row) => (
                <tr key={row.id} id={row.id} style={s.tr}>
                  <td style={s.td}>{row.task}</td>
                  <td style={{ ...s.td, color: "#9e9e9e" }}>{row.project}</td>
                  <td style={s.td}>
                    <span style={{ ...s.badge, ...STATUS_STYLES[row.status] }}>
                      {row.status}
                    </span>
                  </td>
                  <td style={s.td}>{row.priority}</td>
                  <td style={{ ...s.td, textAlign: "right" }}>{row.dueDate}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <div style={s.tableFooter}>
            <Link id="link-view-all-tasks" href="/dashboard/researcher/tasks" style={s.viewAll}>
              View all tasks →
            </Link>
          </div>
        </div>

        {/* Upcoming bookings */}
        <div style={s.bookingsCol}>
          <p style={s.sectionLabel}>UPCOMING BOOKINGS</p>
          <div style={s.bookingsList}>
            {BOOKINGS.map((b) => (
              <div key={b.id} id={b.id} style={s.bookingCard}>
                <div style={s.bookingTop}>
                  <div>
                    <p style={s.bookingResource}>{b.resource}</p>
                    <p style={s.bookingProject}>{b.project}</p>
                  </div>
                  <div style={s.bookingRight}>
                    <span style={s.bookingTime}>{b.datetime}</span>
                    <span style={{ ...s.badge, ...BOOKING_BADGE[b.status], marginTop: 6 }}>
                      {b.status}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
}

/* ── Styles ─────────────────────────────────────────────────────────────── */
const s: Record<string, React.CSSProperties> = {
  /* Header */
  pageTitle: {
    fontSize: 28,
    fontWeight: 700,
    color: "#161616",
    letterSpacing: "-0.5px",
    marginBottom: 4,
  },
  pageDate: {
    fontSize: 13,
    color: "#9e9e9e",
    marginBottom: 28,
  },

  /* Stat cards */
  statGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(4, 1fr)",
    gap: 16,
    marginBottom: 32,
  },
  statCard: {
    background: "#ffffff",
    border: "1px solid #e0e0e0",
    borderRadius: 6,
    padding: "18px 20px 20px",
    display: "flex",
    flexDirection: "column",
    gap: 6,
  },
  statLabel: {
    fontSize: 11,
    fontWeight: 600,
    color: "#9e9e9e",
    letterSpacing: "0.5px",
    textTransform: "uppercase" as const,
  },
  statValue: {
    fontSize: 32,
    fontWeight: 700,
    color: "#161616",
    letterSpacing: "-1px",
    lineHeight: 1.1,
  },
  statSub: {
    fontSize: 12,
    color: "#9e9e9e",
  },

  /* Bottom row */
  bottomRow: {
    display: "flex",
    gap: 20,
    alignItems: "flex-start",
  },

  /* Tasks table card */
  tableCard: {
    flex: "1 1 0",
    background: "#ffffff",
    border: "1px solid #e0e0e0",
    borderRadius: 6,
    overflow: "hidden",
  },
  sectionLabel: {
    fontSize: 11,
    fontWeight: 600,
    color: "#9e9e9e",
    letterSpacing: "0.6px",
    textTransform: "uppercase" as const,
    padding: "16px 20px 12px",
  },
  table: {
    width: "100%",
    borderCollapse: "collapse" as const,
    fontSize: 13,
  },
  th: {
    textAlign: "left" as const,
    padding: "8px 16px",
    fontSize: 12,
    fontWeight: 500,
    color: "#9e9e9e",
    borderBottom: "1px solid #eeeeee",
    borderTop: "1px solid #eeeeee",
    background: "#fafafa",
    whiteSpace: "nowrap" as const,
  },
  tr: {
    borderBottom: "1px solid #f0f0f0",
  },
  td: {
    padding: "12px 16px",
    color: "#161616",
    fontSize: 13,
    verticalAlign: "middle" as const,
  },
  badge: {
    display: "inline-block",
    padding: "3px 9px",
    borderRadius: 4,
    fontSize: 12,
    fontWeight: 500,
    whiteSpace: "nowrap" as const,
  },
  tableFooter: {
    padding: "14px 16px",
    borderTop: "1px solid #eeeeee",
    textAlign: "center" as const,
  },
  viewAll: {
    fontSize: 13,
    color: "#616161",
    cursor: "pointer",
    textDecoration: "none",
  },

  /* Bookings column */
  bookingsCol: {
    width: 300,
    minWidth: 280,
    flexShrink: 0,
  },
  bookingsList: {
    display: "flex",
    flexDirection: "column",
    gap: 0,
  },
  bookingCard: {
    background: "#ffffff",
    border: "1px solid #e0e0e0",
    borderRadius: 6,
    padding: "14px 16px",
    marginBottom: 10,
  },
  bookingTop: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: 12,
  },
  bookingResource: {
    fontSize: 13,
    fontWeight: 600,
    color: "#161616",
    marginBottom: 2,
  },
  bookingProject: {
    fontSize: 12,
    color: "#9e9e9e",
  },
  bookingRight: {
    display: "flex",
    flexDirection: "column",
    alignItems: "flex-end",
    flexShrink: 0,
  },
  bookingTime: {
    fontSize: 11,
    color: "#9e9e9e",
    fontVariantNumeric: "tabular-nums",
    whiteSpace: "nowrap" as const,
  },
};
