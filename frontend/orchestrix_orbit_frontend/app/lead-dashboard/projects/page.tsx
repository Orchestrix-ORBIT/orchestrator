"use client";

import { useState } from "react";
import Link from "next/link";

type Project = {
  id: string;
  name: string;
  description: string;
  status: "ACTIVE" | "ARCHIVED" | "COMPLETED";
  progress: number;
  taskTotal: number;
  taskCompleted: number;
  members: string[];
  updatedAt: string;
};

const PROJECTS: Project[] = [
  {
    id: "1",
    name: "Project Alpha Core",
    description: "Analyzing quantum decoherence patterns in deep-space communication signals.",
    status: "ACTIVE",
    progress: 78,
    taskTotal: 24,
    taskCompleted: 19,
    members: ["DK", "SR", "CK", "AP", "MN"],
    updatedAt: "2h ago",
  },
  {
    id: "2",
    name: "Nexus Protocol",
    description: "Development of the new consensus algorithm for distributed mesh networks.",
    status: "ACTIVE",
    progress: 34,
    taskTotal: 18,
    taskCompleted: 6,
    members: ["DK", "SR"],
    updatedAt: "1d ago",
  },
  {
    id: "3",
    name: "Beta Synthesis",
    description: "Historical data archival process for the 2023 beta testing phase.",
    status: "COMPLETED",
    progress: 100,
    taskTotal: 31,
    taskCompleted: 31,
    members: ["AP", "MN"],
    updatedAt: "Oct 12, 2023",
  },
];

export default function ProjectPortfolio() {
  const [filter, setFilter] = useState<"ALL" | "ACTIVE" | "COMPLETED" | "ARCHIVED">("ALL");
  const [showModal, setShowModal] = useState(false);
  const [nameInput, setNameInput] = useState("");
  const [descInput, setDescInput] = useState("");

  const filteredProjects = PROJECTS.filter((p) => filter === "ALL" || p.status === filter);

  return (
    <div>
      {/* ── Page Header ────────────────────────────────────────────────────── */}
      <div style={s.headerRow}>
        <div>
          <h1 style={s.pageTitle}>Projects</h1>
          <p style={s.pageSub}>Create isolated research project environments and assign researchers.</p>
        </div>

        <button
          id="btn-new-project"
          onClick={() => setShowModal(true)}
          style={s.btnPrimary}
        >
          + New Project
        </button>
      </div>

      {/* ── Filter Bar ──────────────────────────────────────────────────────── */}
      <div style={s.filterBar}>
        <div style={s.filterGroup}>
          <span style={s.filterLabel}>FILTER:</span>
          {(["ALL", "ACTIVE", "COMPLETED", "ARCHIVED"] as const).map((status) => (
            <button
              key={status}
              onClick={() => setFilter(status)}
              style={filter === status ? s.filterBtnActive : s.filterBtn}
            >
              {status}
            </button>
          ))}
        </div>
        <span style={s.countLabel}>
          {filteredProjects.length} {filteredProjects.length === 1 ? "Project" : "Projects"}
        </span>
      </div>

      {/* ── Projects Cards Grid ─────────────────────────────────────────────── */}
      <div style={s.grid}>
        {filteredProjects.map((project) => (
          <div key={project.id} id={`project-card-${project.id}`} style={s.card}>
            
            {/* Card Top */}
            <div style={s.cardTop}>
              <span
                style={{
                  ...s.badge,
                  ...(project.status === "ACTIVE"
                    ? s.badgeActive
                    : project.status === "COMPLETED"
                    ? s.badgeCompleted
                    : s.badgeArchived),
                }}
              >
                {project.status}
              </span>
              <span style={s.updatedTime}>{project.updatedAt}</span>
            </div>

            {/* Title & Desc */}
            <div style={{ marginTop: 12, marginBottom: 16 }}>
              <h3 style={s.cardTitle}>{project.name}</h3>
              <p style={s.cardDesc}>{project.description}</p>
            </div>

            {/* Progress */}
            <div style={s.progressSection}>
              <div style={s.progressTextRow}>
                <span style={s.taskCount}>
                  {project.taskCompleted} / {project.taskTotal} Tasks
                </span>
                <span style={s.progressVal}>{project.progress}%</span>
              </div>
              <div style={s.progressBarBg}>
                <div
                  style={{
                    ...s.progressBarFill,
                    width: `${project.progress}%`,
                    background: project.progress === 100 ? "#2e7d32" : "#161616",
                  }}
                />
              </div>
            </div>

            {/* Footer / Link */}
            <div style={s.cardFooter}>
              <div style={s.memberList}>
                {project.members.slice(0, 3).map((m, idx) => (
                  <span key={idx} style={s.memberBadge}>{m}</span>
                ))}
                {project.members.length > 3 && (
                  <span style={s.memberMore}>+{project.members.length - 3}</span>
                )}
              </div>

              <Link
                href={`/lead-dashboard/projects/${project.id}`}
                style={s.openLink}
              >
                Open Task Board →
              </Link>
            </div>

          </div>
        ))}
      </div>

      {/* ── Modal for New Project ───────────────────────────────────────────── */}
      {showModal && (
        <div style={m.overlay}>
          <div style={m.modal}>
            <div style={m.header}>
              <h3 style={m.title}>Create Research Project</h3>
              <button onClick={() => setShowModal(false)} style={m.closeBtn}>✕</button>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                setShowModal(false);
              }}
              style={m.body}
            >
              <div style={m.field}>
                <label style={m.label}>PROJECT NAME *</label>
                <input
                  required
                  placeholder="e.g. Project Quantum Sentinel"
                  value={nameInput}
                  onChange={(e) => setNameInput(e.target.value)}
                  style={m.input}
                />
              </div>

              <div style={m.field}>
                <label style={m.label}>DESCRIPTION</label>
                <textarea
                  rows={3}
                  placeholder="Research goals, experimental methodology, and scope..."
                  value={descInput}
                  onChange={(e) => setDescInput(e.target.value)}
                  style={m.textarea}
                />
              </div>

              <div style={m.footer}>
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  style={m.btnSecondary}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  style={m.btnPrimary}
                >
                  Create Project
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}

const s: Record<string, React.CSSProperties> = {
  headerRow: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-end",
    marginBottom: 24,
  },
  pageTitle: {
    fontSize: 28,
    fontWeight: 700,
    color: "#161616",
    letterSpacing: "-0.5px",
    marginBottom: 4,
  },
  pageSub: {
    fontSize: 13,
    color: "#9e9e9e",
  },
  btnPrimary: {
    background: "#161616",
    color: "#ffffff",
    border: "none",
    borderRadius: 4,
    padding: "9px 16px",
    fontSize: 13,
    fontWeight: 600,
    cursor: "pointer",
  },
  filterBar: {
    background: "#ffffff",
    border: "1px solid #e0e0e0",
    borderRadius: 6,
    padding: "12px 18px",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 24,
  },
  filterGroup: {
    display: "flex",
    alignItems: "center",
    gap: 8,
  },
  filterLabel: {
    fontSize: 11,
    fontWeight: 600,
    color: "#9e9e9e",
    letterSpacing: "0.5px",
    marginRight: 4,
  },
  filterBtn: {
    background: "transparent",
    border: "1px solid #d0d0d0",
    borderRadius: 4,
    padding: "5px 12px",
    fontSize: 12,
    fontWeight: 500,
    color: "#616161",
    cursor: "pointer",
  },
  filterBtnActive: {
    background: "#161616",
    border: "1px solid #161616",
    borderRadius: 4,
    padding: "5px 12px",
    fontSize: 12,
    fontWeight: 600,
    color: "#ffffff",
    cursor: "pointer",
  },
  countLabel: {
    fontSize: 12,
    color: "#9e9e9e",
    fontWeight: 500,
  },
  grid: {
    display: "grid",
    gridTemplateColumns: "repeat(3, 1fr)",
    gap: 20,
  },
  card: {
    background: "#ffffff",
    border: "1px solid #e0e0e0",
    borderRadius: 6,
    padding: "20px 22px",
    display: "flex",
    flexDirection: "column",
    justifyContent: "space-between",
  },
  cardTop: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
  },
  badge: {
    fontSize: 11,
    fontWeight: 600,
    padding: "3px 8px",
    borderRadius: 4,
    textTransform: "uppercase" as const,
  },
  badgeActive: {
    background: "#161616",
    color: "#ffffff",
  },
  badgeCompleted: {
    background: "#e8f5e9",
    color: "#2e7d32",
    border: "1px solid #c8e6c9",
  },
  badgeArchived: {
    background: "transparent",
    color: "#757575",
    border: "1px solid #d0d0d0",
  },
  updatedTime: {
    fontSize: 11,
    color: "#9e9e9e",
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: 700,
    color: "#161616",
    marginBottom: 6,
    lineHeight: 1.3,
  },
  cardDesc: {
    fontSize: 13,
    color: "#616161",
    lineHeight: 1.5,
    minHeight: 38,
  },
  progressSection: {
    padding: "12px 0",
    borderTop: "1px solid #f0f0f0",
  },
  progressTextRow: {
    display: "flex",
    justifyContent: "space-between",
    fontSize: 12,
    marginBottom: 6,
  },
  taskCount: {
    color: "#9e9e9e",
    fontWeight: 500,
  },
  progressVal: {
    fontWeight: 700,
    color: "#161616",
  },
  progressBarBg: {
    height: 6,
    background: "#eeeeee",
    borderRadius: 3,
    overflow: "hidden",
  },
  progressBarFill: {
    height: "100%",
    borderRadius: 3,
    transition: "width 0.3s ease",
  },
  cardFooter: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    paddingTop: 12,
    borderTop: "1px solid #f0f0f0",
  },
  memberList: {
    display: "flex",
    gap: 4,
  },
  memberBadge: {
    fontSize: 10,
    fontWeight: 700,
    background: "#f0f0f0",
    color: "#424242",
    padding: "3px 6px",
    borderRadius: 3,
  },
  memberMore: {
    fontSize: 10,
    color: "#9e9e9e",
    padding: "3px 4px",
  },
  openLink: {
    fontSize: 13,
    fontWeight: 600,
    color: "#161616",
    textDecoration: "none",
  },
};

const m: Record<string, React.CSSProperties> = {
  overlay: {
    position: "fixed" as const,
    inset: 0,
    background: "rgba(0, 0, 0, 0.4)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 100,
    padding: 20,
  },
  modal: {
    background: "#ffffff",
    border: "1px solid #e0e0e0",
    borderRadius: 6,
    width: "100%",
    maxWidth: 480,
    boxShadow: "0 10px 25px rgba(0, 0, 0, 0.1)",
  },
  header: {
    padding: "18px 24px",
    borderBottom: "1px solid #eeeeee",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
  },
  title: {
    fontSize: 16,
    fontWeight: 700,
    color: "#161616",
  },
  closeBtn: {
    background: "none",
    border: "none",
    fontSize: 15,
    color: "#9e9e9e",
    cursor: "pointer",
  },
  body: {
    padding: "20px 24px",
    display: "flex",
    flexDirection: "column",
    gap: 16,
  },
  field: {
    display: "flex",
    flexDirection: "column",
    gap: 6,
  },
  label: {
    fontSize: 11,
    fontWeight: 600,
    color: "#9e9e9e",
    letterSpacing: "0.5px",
  },
  input: {
    padding: "9px 12px",
    fontSize: 13,
    border: "1px solid #d0d0d0",
    borderRadius: 4,
    outline: "none",
    color: "#161616",
  },
  textarea: {
    padding: "9px 12px",
    fontSize: 13,
    border: "1px solid #d0d0d0",
    borderRadius: 4,
    outline: "none",
    color: "#161616",
    resize: "none",
  },
  footer: {
    display: "flex",
    justifyContent: "flex-end",
    gap: 8,
    paddingTop: 8,
  },
  btnPrimary: {
    padding: "8px 16px",
    background: "#161616",
    color: "#ffffff",
    border: "none",
    borderRadius: 4,
    fontSize: 13,
    fontWeight: 600,
    cursor: "pointer",
  },
  btnSecondary: {
    padding: "8px 14px",
    background: "#ffffff",
    color: "#424242",
    border: "1px solid #d0d0d0",
    borderRadius: 4,
    fontSize: 13,
    fontWeight: 500,
    cursor: "pointer",
  },
};
