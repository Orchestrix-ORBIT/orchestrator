"use client";

import { useState } from "react";
import Link from "next/link";

// ─── Types & Mock Data ────────────────────────────────────────────────────────

type Project = {
  id: string;
  name: string;
  description: string;
  status: "ACTIVE" | "ARCHIVED";
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
    description: "Analyzing quantum decoherence patterns",
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
    description: "Development of the new consensus algorithm",
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
    description: "Historical data archival process",
    status: "ARCHIVED",
    progress: 100,
    taskTotal: 31,
    taskCompleted: 31,
    members: ["AP", "MN"],
    updatedAt: "Oct 12, 2023",
  },
];

interface AiTaskItem {
  id: string;
  title: string;
  source: string;
  sourceDetails: string;
  assignee: string;
  assigneeRole: string;
  deadline: string;
  project: string;
  projectId: string;
  priority: "HIGH" | "MEDIUM" | "LOW";
  confidence: number;
  reasoning: string;
  impactAnalysis: string;
  suggestedSteps: string[];
  tags: string[];
}

const AI_TASKS: AiTaskItem[] = [
  {
    id: "ai-1",
    title: "Recalibrate thermal sensors before next batch",
    source: "Alpha Protocol Sec 4.2",
    sourceDetails: "Automated telemetry analysis detected a 1.4°C drift during peak quantum simulation cycles.",
    assignee: "Dr. Aris",
    assigneeRole: "Hardware & Quantum Optics Lead",
    deadline: "Aug 28, 2026",
    project: "Project Alpha Core",
    projectId: "1",
    priority: "HIGH",
    confidence: 96,
    reasoning: "Telemetry logs over the past 72 hours indicate temperature fluctuations in Chamber 3 exceeding the 0.05°C tolerance. Calibrating prior to the next batch avoids corrupted entanglement fidelity data.",
    impactAnalysis: "Prevents experimental rerun delays (estimated 48h downtime saved) and ensures valid data integrity for publication.",
    suggestedSteps: [
      "Isolate Chamber 3 cryo-coolant sub-manifold",
      "Execute automated 4-point thermocouple calibration script",
      "Verify calibration log hash with quantum telemetry observer",
      "Submit signed recalibration report to Lead Dashboard"
    ],
    tags: ["Telemetry", "Calibration", "Hardware", "Quantum Core"]
  },
  {
    id: "ai-2",
    title: "Draft proposal for localized processing architecture",
    source: "User Studies Q3 Summary",
    sourceDetails: "Aggregated privacy audit logs from 14 institutional research partners.",
    assignee: "E. Chen",
    assigneeRole: "Security & Systems Architect",
    deadline: "Sep 15, 2026",
    project: "Nexus Protocol",
    projectId: "2",
    priority: "MEDIUM",
    confidence: 91,
    reasoning: "Survey feedback reveals that 80% of node operators require multi-tenant data isolation and local enclave computation before federating telemetry records.",
    impactAnalysis: "Accelerates institutional node onboarding by addressing key compliance requirements for GDPR and HIPAA research clusters.",
    suggestedSteps: [
      "Outline zero-knowledge proof requirements for local enclave computation",
      "Draft interface definitions for isolated PostgreSQL Docker sidecars",
      "Conduct threat model review with security research team",
      "Prepare presentation deck for the Q4 Steering Committee"
    ],
    tags: ["Architecture", "Privacy", "Zero-Knowledge", "Federation"]
  },
];

function todayString() {
  return new Date().toLocaleDateString("en-GB", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

export default function LeadDashboard() {
  const [approved, setApproved] = useState<string[]>([]);
  const [dismissed, setDismissed] = useState<string[]>([]);
  const [selectedReviewTask, setSelectedReviewTask] = useState<AiTaskItem | null>(null);

  const pendingAi = AI_TASKS.filter(
    (t) => !approved.includes(t.id) && !dismissed.includes(t.id)
  );

  const totalTasks = PROJECTS.reduce((a, p) => a + p.taskTotal, 0);
  const completedTasks = PROJECTS.reduce((a, p) => a + p.taskCompleted, 0);

  const handleApprove = (taskId: string) => {
    setApproved((prev) => [...prev, taskId]);
    if (selectedReviewTask?.id === taskId) {
      setSelectedReviewTask(null);
    }
  };

  const handleDismiss = (taskId: string) => {
    setDismissed((prev) => [...prev, taskId]);
    if (selectedReviewTask?.id === taskId) {
      setSelectedReviewTask(null);
    }
  };

  return (
    <div>
      {/* ── Page Header ────────────────────────────────────────────────────── */}
      <h1 style={s.pageTitle}>Lead Overview</h1>
      <p style={s.pageDate}>{todayString()}</p>

      {/* ── Stat Cards Grid (4 columns) ─────────────────────────────────────── */}
      <div style={s.statGrid}>
        <div style={s.statCard}>
          <span style={s.statLabel}>ACTIVE PROJECTS</span>
          <span style={s.statValue}>{PROJECTS.filter((p) => p.status === "ACTIVE").length}</span>
          <span style={s.statSub}>Across all tracks</span>
        </div>

        <div style={s.statCard}>
          <span style={s.statLabel}>TOTAL TASKS</span>
          <span style={s.statValue}>{totalTasks}</span>
          <span style={s.statSub}>Tracked in Kanban</span>
        </div>

        <div style={s.statCard}>
          <span style={s.statLabel}>COMPLETED</span>
          <span style={s.statValue}>{completedTasks}</span>
          <span style={s.statSub}>{Math.round((completedTasks / totalTasks) * 100)}% overall completion</span>
        </div>

        <div style={s.statCard}>
          <span style={s.statLabel}>AI PENDING</span>
          <span style={s.statValue}>{pendingAi.length}</span>
          <span style={s.statSub}>Awaiting manual review</span>
        </div>
      </div>

      {/* ── Bottom Row: Projects Table + AI Approvals ──────────────────────── */}
      <div style={s.bottomRow}>

        {/* Projects Table Card */}
        <div style={s.tableCard}>
          <div style={s.tableHeaderRow}>
            <p style={s.sectionLabel}>ACTIVE PROJECTS OVERVIEW</p>
            <span style={{ fontSize: 12, color: "#9e9e9e", marginRight: 16 }}>{PROJECTS.length} Total</span>
          </div>

          <table style={s.table}>
            <thead>
              <tr>
                <th style={s.th}>Project Name</th>
                <th style={s.th}>Status</th>
                <th style={{ ...s.th, width: 180 }}>Progress</th>
                <th style={{ ...s.th, textAlign: "right" }}>Updated</th>
              </tr>
            </thead>
            <tbody>
              {PROJECTS.map((project) => (
                <tr key={project.id} style={s.tr}>
                  <td style={s.td}>
                    <Link href={`/lead-dashboard/projects/${project.id}`} style={s.projectLink}>
                      <span style={s.projectName}>{project.name}</span>
                      <span style={s.projectDesc}>{project.description}</span>
                    </Link>
                  </td>
                  <td style={s.td}>
                    <span
                      style={{
                        ...s.badge,
                        ...(project.status === "ACTIVE" ? s.badgeActive : s.badgeArchived),
                      }}
                    >
                      {project.status === "ACTIVE" ? "In Progress" : "Archived"}
                    </span>
                  </td>
                  <td style={s.td}>
                    <div style={s.progressWrap}>
                      <div style={s.progressBarBg}>
                        <div
                          style={{
                            ...s.progressBarFill,
                            width: `${project.progress}%`,
                          }}
                        />
                      </div>
                      <span style={s.progressText}>{project.progress}%</span>
                    </div>
                  </td>
                  <td style={{ ...s.td, textAlign: "right", color: "#9e9e9e" }}>
                    {project.updatedAt}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          <div style={s.tableFooter}>
            <Link href="/lead-dashboard/projects" style={s.viewAll}>
              View all projects →
            </Link>
          </div>
        </div>

        {/* Right Column: AI Approvals */}
        <div style={s.aiCol}>
          <div style={s.aiHeaderRow}>
            <p style={s.sectionLabel}>AI APPROVALS</p>
            {pendingAi.length > 0 && (
              <span style={s.newBadge}>{pendingAi.length} NEW</span>
            )}
          </div>

          <div style={s.aiList}>
            {pendingAi.length === 0 ? (
              <div style={s.emptyBox}>
                <p style={{ fontSize: 13, fontWeight: 600, color: "#161616", marginBottom: 2 }}>
                  All suggestions reviewed
                </p>
                <p style={{ fontSize: 12, color: "#9e9e9e" }}>No pending AI tasks in queue.</p>
              </div>
            ) : (
              pendingAi.map((task) => (
                <div key={task.id} style={s.aiCard}>
                  <div style={s.aiCardTop}>
                    <p style={s.aiTaskTitle}>{task.title}</p>
                    <span style={s.aiPriorityBadge}>{task.priority}</span>
                  </div>

                  <p style={s.aiSource}>Source: {task.source}</p>

                  <div style={s.aiMetaRow}>
                    <span style={s.aiAssignee}>
                      Assignee: <strong>{task.assignee}</strong>
                    </span>
                    <span style={s.aiConfidence}>{task.confidence}% Match</span>
                  </div>

                  <div style={s.aiBtnRow}>
                    <button
                      type="button"
                      onClick={() => setSelectedReviewTask(task)}
                      style={s.btnReview}
                    >
                      Review
                    </button>
                    <button
                      type="button"
                      onClick={() => handleApprove(task.id)}
                      style={s.btnApprove}
                    >
                      Approve
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDismiss(task.id)}
                      style={s.btnDismiss}
                      title="Dismiss"
                    >
                      ✕
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

      </div>

      {/* ── Minimalist AI Review Modal ─────────────────────────────────────── */}
      {selectedReviewTask && (
        <div style={m.overlay}>
          <div style={m.modal}>
            {/* Modal Header */}
            <div style={m.header}>
              <div>
                <h3 style={m.title}>AI Task Review</h3>
                <p style={m.sub}>
                  Synthesized from <strong>{selectedReviewTask.source}</strong> ({selectedReviewTask.confidence}% confidence)
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedReviewTask(null)}
                style={m.closeBtn}
              >
                ✕
              </button>
            </div>

            {/* Modal Body */}
            <div style={m.body}>
              <div style={m.section}>
                <span style={m.label}>PROJECT & TIMELINE</span>
                <p style={m.mainTitle}>{selectedReviewTask.title}</p>
                <p style={{ fontSize: 13, color: "#616161", marginTop: 4 }}>
                  Target: <strong>{selectedReviewTask.project}</strong> • Due: <strong>{selectedReviewTask.deadline}</strong>
                </p>
              </div>

              <div style={m.section}>
                <span style={m.label}>AI RATIONALE & CONTEXT</span>
                <p style={m.text}>{selectedReviewTask.reasoning}</p>
              </div>

              <div style={m.section}>
                <span style={m.label}>ESTIMATED IMPACT & BENEFITS</span>
                <p style={m.text}>{selectedReviewTask.impactAnalysis}</p>
              </div>

              <div style={m.section}>
                <span style={m.label}>PROPOSED ACTION PLAN</span>
                <div style={{ display: "flex", flexDirection: "column", gap: 6, marginTop: 6 }}>
                  {selectedReviewTask.suggestedSteps.map((step, idx) => (
                    <div key={idx} style={{ display: "flex", gap: 8, fontSize: 13, color: "#161616" }}>
                      <span style={{ color: "#9e9e9e", fontWeight: 600 }}>{idx + 1}.</span>
                      <span>{step}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div style={{ ...m.section, borderBottom: "none", paddingBottom: 0 }}>
                <span style={m.label}>ASSIGNED RESEARCHER</span>
                <p style={{ fontSize: 13, fontWeight: 600, color: "#161616", marginTop: 4 }}>
                  {selectedReviewTask.assignee} — <span style={{ fontWeight: 400, color: "#616161" }}>{selectedReviewTask.assigneeRole}</span>
                </p>
              </div>
            </div>

            {/* Modal Footer */}
            <div style={m.footer}>
              <button
                type="button"
                onClick={() => handleDismiss(selectedReviewTask.id)}
                style={m.btnDanger}
              >
                Dismiss Suggestion
              </button>

              <div style={{ display: "flex", gap: 8 }}>
                <button
                  type="button"
                  onClick={() => setSelectedReviewTask(null)}
                  style={m.btnSecondary}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => handleApprove(selectedReviewTask.id)}
                  style={m.btnPrimary}
                >
                  Approve & Schedule Task
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

/* ── Page Styles ──────────────────────────────────────────────────────────── */
const s: Record<string, React.CSSProperties> = {
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

  /* Projects table card */
  tableCard: {
    flex: "1 1 0",
    background: "#ffffff",
    border: "1px solid #e0e0e0",
    borderRadius: 6,
    overflow: "hidden",
  },
  tableHeaderRow: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
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
  projectLink: {
    textDecoration: "none",
    display: "flex",
    flexDirection: "column",
    gap: 2,
  },
  projectName: {
    fontWeight: 600,
    color: "#161616",
  },
  projectDesc: {
    fontSize: 12,
    color: "#9e9e9e",
    fontWeight: 400,
  },
  badge: {
    display: "inline-block",
    padding: "3px 9px",
    borderRadius: 4,
    fontSize: 12,
    fontWeight: 500,
    whiteSpace: "nowrap" as const,
  },
  badgeActive: {
    background: "#161616",
    color: "#ffffff",
  },
  badgeArchived: {
    background: "transparent",
    color: "#616161",
    border: "1px solid #d0d0d0",
  },
  progressWrap: {
    display: "flex",
    alignItems: "center",
    gap: 8,
  },
  progressBarBg: {
    flex: 1,
    height: 6,
    background: "#eeeeee",
    borderRadius: 3,
    overflow: "hidden",
  },
  progressBarFill: {
    height: "100%",
    background: "#161616",
    borderRadius: 3,
  },
  progressText: {
    fontSize: 12,
    fontWeight: 600,
    color: "#616161",
    minWidth: 32,
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
    fontWeight: 500,
  },

  /* Right column: AI approvals */
  aiCol: {
    width: 320,
    minWidth: 300,
    flexShrink: 0,
  },
  aiHeaderRow: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
  },
  newBadge: {
    fontSize: 10,
    fontWeight: 700,
    background: "#161616",
    color: "#ffffff",
    padding: "2px 6px",
    borderRadius: 3,
    marginRight: 4,
  },
  aiList: {
    display: "flex",
    flexDirection: "column",
    gap: 0,
  },
  aiCard: {
    background: "#ffffff",
    border: "1px solid #e0e0e0",
    borderRadius: 6,
    padding: "14px 16px",
    marginBottom: 10,
  },
  aiCardTop: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: 8,
    marginBottom: 4,
  },
  aiTaskTitle: {
    fontSize: 13,
    fontWeight: 600,
    color: "#161616",
    lineHeight: 1.3,
  },
  aiPriorityBadge: {
    fontSize: 10,
    fontWeight: 700,
    color: "#c62828",
    background: "#fde8e8",
    padding: "2px 6px",
    borderRadius: 3,
    flexShrink: 0,
  },
  aiSource: {
    fontSize: 11,
    color: "#9e9e9e",
    marginBottom: 8,
  },
  aiMetaRow: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    fontSize: 12,
    color: "#616161",
    marginBottom: 12,
    borderTop: "1px solid #f5f5f5",
    paddingTop: 8,
  },
  aiAssignee: {
    fontSize: 12,
  },
  aiConfidence: {
    fontSize: 11,
    fontWeight: 600,
    color: "#2e7d32",
    background: "#e8f5e9",
    padding: "2px 6px",
    borderRadius: 3,
  },
  aiBtnRow: {
    display: "flex",
    gap: 6,
  },
  btnReview: {
    flex: 1,
    padding: "7px 0",
    background: "#f5f5f5",
    color: "#161616",
    border: "1px solid #e0e0e0",
    borderRadius: 4,
    fontSize: 12,
    fontWeight: 600,
    cursor: "pointer",
  },
  btnApprove: {
    flex: 1,
    padding: "7px 0",
    background: "#161616",
    color: "#ffffff",
    border: "none",
    borderRadius: 4,
    fontSize: 12,
    fontWeight: 600,
    cursor: "pointer",
  },
  btnDismiss: {
    padding: "7px 10px",
    background: "transparent",
    color: "#9e9e9e",
    border: "1px solid #e0e0e0",
    borderRadius: 4,
    fontSize: 12,
    cursor: "pointer",
  },
  emptyBox: {
    background: "#ffffff",
    border: "1px solid #e0e0e0",
    borderRadius: 6,
    padding: "28px 20px",
    textAlign: "center" as const,
  },
};

/* ── Modal Styles ─────────────────────────────────────────────────────────── */
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
    maxWidth: 620,
    boxShadow: "0 10px 25px rgba(0, 0, 0, 0.1)",
    display: "flex",
    flexDirection: "column",
    maxHeight: "90vh",
  },
  header: {
    padding: "20px 24px 16px",
    borderBottom: "1px solid #eeeeee",
    display: "flex",
    alignItems: "flex-start",
    justifyContent: "space-between",
  },
  title: {
    fontSize: 18,
    fontWeight: 700,
    color: "#161616",
    letterSpacing: "-0.3px",
  },
  sub: {
    fontSize: 12,
    color: "#9e9e9e",
    marginTop: 2,
  },
  closeBtn: {
    background: "none",
    border: "none",
    fontSize: 16,
    color: "#9e9e9e",
    cursor: "pointer",
    padding: 4,
  },
  body: {
    padding: "20px 24px",
    overflowY: "auto",
    display: "flex",
    flexDirection: "column",
    gap: 16,
  },
  section: {
    borderBottom: "1px solid #f0f0f0",
    paddingBottom: 14,
  },
  label: {
    fontSize: 11,
    fontWeight: 600,
    color: "#9e9e9e",
    letterSpacing: "0.5px",
    display: "block",
    marginBottom: 4,
  },
  mainTitle: {
    fontSize: 15,
    fontWeight: 700,
    color: "#161616",
  },
  text: {
    fontSize: 13,
    color: "#424242",
    lineHeight: 1.5,
  },
  footer: {
    padding: "16px 24px",
    borderTop: "1px solid #eeeeee",
    background: "#fafafa",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
  },
  btnPrimary: {
    padding: "9px 18px",
    background: "#161616",
    color: "#ffffff",
    border: "none",
    borderRadius: 4,
    fontSize: 13,
    fontWeight: 600,
    cursor: "pointer",
  },
  btnSecondary: {
    padding: "9px 14px",
    background: "#ffffff",
    color: "#424242",
    border: "1px solid #d0d0d0",
    borderRadius: 4,
    fontSize: 13,
    fontWeight: 500,
    cursor: "pointer",
  },
  btnDanger: {
    padding: "9px 0",
    background: "none",
    color: "#c62828",
    border: "none",
    fontSize: 12,
    fontWeight: 600,
    cursor: "pointer",
  },
};
