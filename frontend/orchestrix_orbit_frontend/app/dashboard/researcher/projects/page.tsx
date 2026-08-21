"use client";

import { useState } from "react";

/* ── Types ───────────────────────────────────────────────────────────────── */
type ProjectStatus = "ACTIVE" | "ARCHIVED";

interface Project {
  id: string;
  name: string;
  description: string;
  status: ProjectStatus;
  updatedLabel: string;
  progress: number;
  members: string[]; /* initials */
  extraMembers?: number;
  encrypted: boolean;
}

/* ── Static data ─────────────────────────────────────────────────────────── */
const PROJECTS: Project[] = [
  {
    id: "proj-alpha-core",
    name: "Project Alpha Core",
    description:
      "Analyzing the quantum decoherence patterns in deep-space communication arrays.",
    status: "ACTIVE",
    updatedLabel: "Updated: 2h ago",
    progress: 78,
    members: ["A", "B"],
    extraMembers: 2,
    encrypted: true,
  },
  {
    id: "proj-nexus-protocol",
    name: "Nexus Protocol",
    description:
      "Development of the new consensus algorithm for distributed mesh networks.",
    status: "ACTIVE",
    updatedLabel: "Updated: 1d ago",
    progress: 34,
    members: ["C"],
    encrypted: true,
  },
  {
    id: "proj-beta-synthesis",
    name: "Beta Synthesis",
    description:
      "Historical data archival process for the 2023 beta testing phase.",
    status: "ARCHIVED",
    updatedLabel: "Updated: Oct 12, 2023",
    progress: 100,
    members: ["D", "E"],
    encrypted: true,
  },
];

type FilterTab = "All Projects" | "Active" | "Archived";

/* ════════════════════════════════════════════════════════════════════════════
   My Projects Page
═══════════════════════════════════════════════════════════════════════════ */
export default function MyProjectsPage() {
  const [activeFilter, setActiveFilter] = useState<FilterTab>("All Projects");

  const filtered = PROJECTS.filter((p) => {
    if (activeFilter === "All Projects") return true;
    if (activeFilter === "Active") return p.status === "ACTIVE";
    if (activeFilter === "Archived") return p.status === "ARCHIVED";
    return true;
  });

  return (
    <div>
      {/* ── Page header ──────────────────────────────────────────────────── */}
      <div style={s.pageHeader}>
        <h1 style={s.pageTitle}>My Projects</h1>
        <button id="btn-create-project" style={s.createBtn}>
          <span style={{ marginRight: 6, fontSize: 16, lineHeight: 1 }}>+</span>
          Create New Project
        </button>
      </div>

      {/* ── Filter tabs + filter icon ─────────────────────────────────────── */}
      <div style={s.filterRow}>
        <div style={s.tabGroup}>
          {(["All Projects", "Active", "Archived"] as FilterTab[]).map((tab) => (
            <button
              key={tab}
              id={`tab-${tab.toLowerCase().replace(/\s/g, "-")}`}
              style={activeFilter === tab ? s.tabActive : s.tab}
              onClick={() => setActiveFilter(tab)}
            >
              {tab}
            </button>
          ))}
        </div>
        <button id="btn-filter" style={s.filterBtn}>
          {/* filter icon */}
          <svg width="13" height="13" viewBox="0 0 13 13" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round">
            <line x1="1" y1="3.5" x2="12" y2="3.5" />
            <line x1="3" y1="6.5" x2="10" y2="6.5" />
            <line x1="5" y1="9.5" x2="8"  y2="9.5" />
          </svg>
          Filter
        </button>
      </div>

      {/* ── Project cards grid ────────────────────────────────────────────── */}
      <div style={s.grid}>
        {filtered.map((p) => (
          <ProjectCard key={p.id} project={p} />
        ))}
      </div>
    </div>
  );
}

/* ── Project Card ────────────────────────────────────────────────────────── */
function ProjectCard({ project: p }: { project: Project }) {
  return (
    <div id={p.id} style={s.card}>
      {/* Top row: name + status badge */}
      <div style={s.cardTop}>
        <span style={s.cardName}>{p.name}</span>
        <span
          style={{
            ...s.statusBadge,
            ...(p.status === "ACTIVE" ? s.badgeActive : s.badgeArchived),
          }}
        >
          {p.status}
        </span>
      </div>

      {/* Description */}
      <p style={s.cardDesc}>{p.description}</p>

      {/* Progress row */}
      <div style={s.progressRow}>
        <span style={s.updatedLabel}>{p.updatedLabel}</span>
        <span style={s.progressPct}>{p.progress}%</span>
      </div>
      <div style={s.progressTrack}>
        <div style={{ ...s.progressFill, width: `${p.progress}%` }} />
      </div>

      {/* Bottom row: members + encrypted */}
      <div style={s.cardBottom}>
        <div style={s.avatarGroup}>
          {p.members.map((initial, i) => (
            <div key={i} style={{ ...s.avatar, marginLeft: i === 0 ? 0 : -8 }}>
              {initial}
            </div>
          ))}
          {p.extraMembers ? (
            <div style={{ ...s.avatar, ...s.avatarExtra, marginLeft: -8 }}>
              +{p.extraMembers}
            </div>
          ) : null}
        </div>
        {p.encrypted && (
          <div style={s.encryptedBadge}>
            <svg width="11" height="11" viewBox="0 0 11 11" fill="none" stroke="currentColor" strokeWidth="1.3">
              <rect x="1.5" y="4.5" width="8" height="5.5" rx="1" />
              <path d="M3.5 4.5V3.5a2 2 0 0 1 4 0v1" strokeLinecap="round" />
            </svg>
            Encrypted
          </div>
        )}
      </div>
    </div>
  );
}

/* ── Styles ─────────────────────────────────────────────────────────────── */
const s: Record<string, React.CSSProperties> = {
  /* Header */
  pageHeader: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 24,
  },
  pageTitle: {
    fontSize: 28,
    fontWeight: 700,
    color: "#161616",
    letterSpacing: "-0.5px",
  },
  createBtn: {
    display: "flex",
    alignItems: "center",
    padding: "8px 16px",
    fontSize: 13,
    fontWeight: 500,
    color: "#161616",
    background: "#ffffff",
    border: "1px solid #d0d0d0",
    borderRadius: 6,
    cursor: "pointer",
    letterSpacing: "0px",
    whiteSpace: "nowrap" as const,
  },

  /* Filter row */
  filterRow: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 20,
  },
  tabGroup: {
    display: "flex",
    gap: 4,
  },
  tab: {
    padding: "6px 14px",
    fontSize: 13,
    fontWeight: 500,
    color: "#616161",
    background: "transparent",
    border: "1px solid #e0e0e0",
    borderRadius: 6,
    cursor: "pointer",
  },
  tabActive: {
    padding: "6px 14px",
    fontSize: 13,
    fontWeight: 600,
    color: "#ffffff",
    background: "#161616",
    border: "1px solid #161616",
    borderRadius: 6,
    cursor: "pointer",
  },
  filterBtn: {
    display: "flex",
    alignItems: "center",
    gap: 6,
    padding: "6px 12px",
    fontSize: 12,
    fontWeight: 500,
    color: "#616161",
    background: "transparent",
    border: "none",
    cursor: "pointer",
  },

  /* Grid */
  grid: {
    display: "grid",
    gridTemplateColumns: "repeat(3, 1fr)",
    gap: 16,
  },

  /* Card */
  card: {
    background: "#ffffff",
    border: "1px solid #e0e0e0",
    borderRadius: 8,
    padding: "18px 18px 16px",
    display: "flex",
    flexDirection: "column" as const,
    gap: 10,
  },
  cardTop: {
    display: "flex",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 8,
  },
  cardName: {
    fontSize: 15,
    fontWeight: 700,
    color: "#161616",
    lineHeight: 1.3,
  },
  statusBadge: {
    fontSize: 10,
    fontWeight: 700,
    letterSpacing: "0.6px",
    padding: "3px 7px",
    borderRadius: 3,
    flexShrink: 0,
    marginTop: 1,
  },
  badgeActive: {
    background: "transparent",
    color: "#616161",
    border: "1px solid #d0d0d0",
  },
  badgeArchived: {
    background: "transparent",
    color: "#9e9e9e",
    border: "1px solid #e0e0e0",
  },

  /* Description */
  cardDesc: {
    fontSize: 13,
    color: "#616161",
    lineHeight: 1.55,
  },

  /* Progress */
  progressRow: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 4,
  },
  updatedLabel: {
    fontSize: 11,
    color: "#9e9e9e",
  },
  progressPct: {
    fontSize: 11,
    fontWeight: 600,
    color: "#161616",
  },
  progressTrack: {
    height: 3,
    background: "#f0f0f0",
    borderRadius: 2,
    overflow: "hidden" as const,
  },
  progressFill: {
    height: "100%",
    background: "#161616",
    borderRadius: 2,
  },

  /* Bottom row */
  cardBottom: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 2,
  },
  avatarGroup: {
    display: "flex",
    alignItems: "center",
  },
  avatar: {
    width: 24,
    height: 24,
    borderRadius: "50%",
    background: "#d0d0d0",
    border: "2px solid #ffffff",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: 10,
    fontWeight: 700,
    color: "#616161",
    flexShrink: 0,
  },
  avatarExtra: {
    background: "#eeeeee",
    color: "#9e9e9e",
    fontSize: 9,
  },
  encryptedBadge: {
    display: "flex",
    alignItems: "center",
    gap: 4,
    fontSize: 11,
    color: "#9e9e9e",
  },
};
