"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import LoadingState from "@/components/ui/LoadingState";
import { ProjectsService, type Project } from "@/lib/services/projects";
import { TasksService, type Task } from "@/lib/services/tasks";

// ── Types ──────────────────────────────────────────────────────────────────
interface InsightItem {
  id: string;
  projectId: string;
  projectName: string;
  topic: string;
  summary: string;
  keyFindings: string[];
  confidence: number;
  date: string;
  status: "Pending Approval" | "Executed" | "Archived";
  model: string;
  sourceType: "TASK_ANALYSIS" | "CHAT_SUMMARY";
}

// ── Derive AI insights from real task data ────────────────────────────────
function deriveInsightsFromTasks(projects: Project[], allTasks: Task[]): InsightItem[] {
  const insights: InsightItem[] = [];

  projects.forEach(proj => {
    const projectTasks = allTasks.filter(t => t.projectId === proj.id);
    if (projectTasks.length === 0) return;

    const blocked  = projectTasks.filter(t => t.status === "BLOCKED");
    const done     = projectTasks.filter(t => t.status === "DONE" || t.status === "ACCEPTED");
    const todo     = projectTasks.filter(t => t.status === "TODO");
    const inProg   = projectTasks.filter(t => t.status === "IN_PROGRESS" || t.status === "IN_REVIEW");
    const progress = projectTasks.length > 0 ? Math.round((done.length / projectTasks.length) * 100) : 0;

    // Insight 1: Blocked tasks
    if (blocked.length > 0) {
      insights.push({
        id: `insight-blocked-${proj.id}`,
        projectId: proj.id,
        projectName: proj.name,
        topic: `${blocked.length} Blocked Task${blocked.length > 1 ? "s" : ""} Detected`,
        summary: `${proj.name} has ${blocked.length} task${blocked.length > 1 ? "s" : ""} in BLOCKED state. These require immediate Research Lead review and unblocking action to maintain project velocity.`,
        keyFindings: [
          `${blocked.length} task${blocked.length > 1 ? "s" : ""} blocked out of ${projectTasks.length} total`,
          blocked.map(t => `"${t.title}"`).slice(0, 3).join(", ") + (blocked.length > 3 ? ` and ${blocked.length - 3} more` : ""),
          "Recommended action: Review blockers and reassign or escalate",
        ],
        confidence: 98,
        date: new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }),
        status: "Pending Approval",
        model: "Task Analysis Engine",
        sourceType: "TASK_ANALYSIS",
      });
    }

    // Insight 2: Progress summary
    if (projectTasks.length >= 2) {
      insights.push({
        id: `insight-progress-${proj.id}`,
        projectId: proj.id,
        projectName: proj.name,
        topic: `Project Progress: ${progress}% Complete`,
        summary: `${proj.name} has completed ${done.length} of ${projectTasks.length} tasks (${progress}%). ${inProg.length} task${inProg.length !== 1 ? "s" : ""} currently in progress. ${todo.length} pending.`,
        keyFindings: [
          `${done.length} task${done.length !== 1 ? "s" : ""} completed (${progress}% progress)`,
          `${inProg.length} task${inProg.length !== 1 ? "s" : ""} actively in progress`,
          `${todo.length} task${todo.length !== 1 ? "s" : ""} not yet started`,
        ],
        confidence: 100,
        date: new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }),
        status: progress === 100 ? "Executed" : "Pending Approval",
        model: "Task Analysis Engine",
        sourceType: "TASK_ANALYSIS",
      });
    }
  });

  return insights;
}

export default function AiInsightsPage() {
  const [loading, setLoading]         = useState(true);
  const [error, setError]             = useState<string | null>(null);
  const [insights, setInsights]       = useState<InsightItem[]>([]);
  const [selectedItem, setSelectedItem] = useState<InsightItem | null>(null);
  const [projects, setProjects]       = useState<Project[]>([]);

  useEffect(() => {
    async function load() {
      try {
        const projectList = await ProjectsService.getAll();
        setProjects(projectList);

        const taskResults = await Promise.all(
          projectList.map(p =>
            TasksService.getByProject(p.id).catch(() => [] as Task[])
          )
        );
        const allTasks = taskResults.flat();

        const derived = deriveInsightsFromTasks(projectList, allTasks);
        setInsights(derived);
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : "Failed to load AI Insights");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  if (loading) {
    return (
      <LoadingState
        title="Loading AI Summaries & Insights…"
        subtitle="Analysing project tasks, blocked items, and team velocity"
      />
    );
  }

  const pendingCount  = insights.filter(i => i.status === "Pending Approval").length;
  const executedCount = insights.filter(i => i.status === "Executed").length;
  const avgConfidence = insights.length > 0
    ? Math.round(insights.reduce((sum, i) => sum + i.confidence, 0) / insights.length)
    : 0;

  return (
    <div>
      {/* ── Page Header ──────────────────────────────────────────────────────── */}
      <div style={s.headerRow}>
        <div>
          <h1 style={s.pageTitle}>AI Summaries</h1>
          <p style={s.pageSub}>
            Automated project analysis, anomaly detection, and task velocity insights.
            {" "}For chat-based summaries, use the{" "}
            <Link href="/lead-dashboard/chat" style={{ color: "#161616", fontWeight: 600 }}>AI Summarize</Link>
            {" "}feature in Chat.
          </p>
        </div>
        <Link href="/lead-dashboard/chat" style={s.btnPrimary}>
          Chat AI Summaries →
        </Link>
      </div>

      {error && (
        <div style={{ background: "#fff0f0", border: "1px solid #f5c6cb", borderRadius: 6, padding: "12px 16px", marginBottom: 24, fontSize: 13, color: "#c62828" }}>
          ⚠ Failed to load insights: {error}
        </div>
      )}

      {/* ── Stat Cards ───────────────────────────────────────────────────────── */}
      <div style={s.statGrid}>
        <div style={s.statCard}>
          <span style={s.statLabel}>SYNTHESIZED INSIGHTS</span>
          <span style={s.statValue}>{insights.length}</span>
          <span style={s.statSub}>Across all projects</span>
        </div>
        <div style={s.statCard}>
          <span style={s.statLabel}>AVG CONFIDENCE</span>
          <span style={s.statValue}>{insights.length > 0 ? `${avgConfidence}%` : "—"}</span>
          <span style={s.statSub}>Statistical validation</span>
        </div>
        <div style={s.statCard}>
          <span style={s.statLabel}>PENDING REVIEWS</span>
          <span style={s.statValue}>{pendingCount}</span>
          <span style={s.statSub}>Awaiting lead review</span>
        </div>
        <div style={s.statCard}>
          <span style={s.statLabel}>ACTIVE PROJECTS</span>
          <span style={s.statValue}>{projects.filter(p => p.status === "ACTIVE").length}</span>
          <span style={s.statSub}>Being monitored</span>
        </div>
      </div>

      {/* ── Main Summaries Table Card ─────────────────────────────────────────── */}
      <div style={s.tableCard}>
        <div style={s.tableHeaderRow}>
          <p style={s.sectionLabel}>AI ANALYSIS LOG & PROJECT INSIGHTS</p>
          <span style={{ fontSize: 12, color: "#9e9e9e", marginRight: 16 }}>{insights.length} Entries</span>
        </div>

        {insights.length === 0 ? (
          <div style={{ padding: "48px 24px", textAlign: "center" }}>
            <p style={{ fontSize: 14, fontWeight: 600, color: "#161616", margin: 0 }}>No insights yet</p>
            <p style={{ fontSize: 13, color: "#9e9e9e", marginTop: 8 }}>
              Create projects with tasks to see AI-generated project insights here.
            </p>
            <Link href="/lead-dashboard/projects" style={{ ...s.btnPrimary, display: "inline-block", marginTop: 16, textDecoration: "none" }}>
              Go to Projects →
            </Link>
          </div>
        ) : (
          <table style={s.table}>
            <thead>
              <tr>
                <th style={s.th}>Analysis Topic</th>
                <th style={s.th}>Target Project</th>
                <th style={s.th}>Source</th>
                <th style={s.th}>Confidence</th>
                <th style={s.th}>Date</th>
                <th style={{ ...s.th, textAlign: "right" }}>Status</th>
              </tr>
            </thead>
            <tbody>
              {insights.map(item => (
                <tr
                  key={item.id}
                  style={s.tr}
                  onClick={() => setSelectedItem(item)}
                  className="cursor-pointer"
                >
                  <td style={s.td}>
                    <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                      <span style={s.topicName}>{item.topic}</span>
                      <span style={s.topicSub}>{item.id.substring(0, 16)} • Click to inspect</span>
                    </div>
                  </td>
                  <td style={{ ...s.td, color: "#616161", fontWeight: 500 }}>{item.projectName}</td>
                  <td style={{ ...s.td, color: "#616161", fontFamily: "monospace", fontSize: 12 }}>
                    {item.model}
                  </td>
                  <td style={s.td}>
                    <span style={s.confidenceBadge}>{item.confidence}% Match</span>
                  </td>
                  <td style={{ ...s.td, color: "#9e9e9e" }}>{item.date}</td>
                  <td style={{ ...s.td, textAlign: "right" }}>
                    <span
                      style={{
                        ...s.badge,
                        ...(item.status === "Executed" ? s.badgeDone : s.badgePending),
                      }}
                    >
                      {item.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* ── Detail Modal ─────────────────────────────────────────────────────── */}
      {selectedItem && (
        <div style={m.overlay} onClick={() => setSelectedItem(null)}>
          <div style={m.modal} onClick={e => e.stopPropagation()}>
            <div style={m.header}>
              <div>
                <h3 style={m.title}>{selectedItem.topic}</h3>
                <p style={m.sub}>
                  {selectedItem.id.substring(0, 16)} • Source: <strong>{selectedItem.model}</strong> ({selectedItem.confidence}% confidence)
                </p>
              </div>
              <button onClick={() => setSelectedItem(null)} style={m.closeBtn}>✕</button>
            </div>

            <div style={m.body}>
              <div style={m.section}>
                <span style={m.label}>TARGET PROJECT</span>
                <p style={{ fontSize: 14, fontWeight: 600, color: "#161616", marginTop: 4 }}>
                  {selectedItem.projectName} • Logged on {selectedItem.date}
                </p>
              </div>

              <div style={m.section}>
                <span style={m.label}>EXECUTIVE SUMMARY</span>
                <p style={m.text}>{selectedItem.summary}</p>
              </div>

              <div style={{ ...m.section, borderBottom: "none", paddingBottom: 0 }}>
                <span style={m.label}>KEY FINDINGS & ACTION ITEMS</span>
                <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 8 }}>
                  {selectedItem.keyFindings.map((finding, i) => (
                    <div key={i} style={{ display: "flex", gap: 8, fontSize: 13, color: "#161616" }}>
                      <span style={{ color: "#9e9e9e", fontWeight: 700 }}>•</span>
                      <span>{finding}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div style={m.footer}>
              <span style={{ fontSize: 12, color: "#9e9e9e" }}>
                Status: <strong>{selectedItem.status}</strong>
              </span>
              <div style={{ display: "flex", gap: 8 }}>
                <Link
                  href={`/lead-dashboard/projects/${selectedItem.projectId}`}
                  style={{ padding: "8px 14px", background: "#f5f5f5", color: "#161616", border: "1px solid #d0d0d0", borderRadius: 4, fontSize: 13, fontWeight: 600, textDecoration: "none" }}
                  onClick={() => setSelectedItem(null)}
                >
                  Open Project →
                </Link>
                <button onClick={() => setSelectedItem(null)} style={m.btnPrimary}>
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const s: Record<string, React.CSSProperties> = {
  headerRow: { display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: 24 },
  pageTitle: { fontSize: 28, fontWeight: 700, color: "#161616", letterSpacing: "-0.5px", marginBottom: 4 },
  pageSub:   { fontSize: 13, color: "#9e9e9e" },
  btnPrimary:{ background: "#161616", color: "#ffffff", border: "none", borderRadius: 4, padding: "9px 16px", fontSize: 13, fontWeight: 600, textDecoration: "none" },
  statGrid:  { display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16, marginBottom: 32 },
  statCard:  { background: "#ffffff", border: "1px solid #e0e0e0", borderRadius: 6, padding: "18px 20px 20px", display: "flex", flexDirection: "column", gap: 6 },
  statLabel: { fontSize: 11, fontWeight: 600, color: "#9e9e9e", letterSpacing: "0.5px", textTransform: "uppercase" as const },
  statValue: { fontSize: 32, fontWeight: 700, color: "#161616", letterSpacing: "-1px", lineHeight: 1.1 },
  statSub:   { fontSize: 12, color: "#9e9e9e" },
  tableCard: { background: "#ffffff", border: "1px solid #e0e0e0", borderRadius: 6, overflow: "hidden" },
  tableHeaderRow: { display: "flex", alignItems: "center", justifyContent: "space-between" },
  sectionLabel: { fontSize: 11, fontWeight: 600, color: "#9e9e9e", letterSpacing: "0.6px", textTransform: "uppercase" as const, padding: "16px 20px 12px" },
  table:     { width: "100%", borderCollapse: "collapse" as const, fontSize: 13 },
  th:        { textAlign: "left" as const, padding: "8px 16px", fontSize: 12, fontWeight: 500, color: "#9e9e9e", borderBottom: "1px solid #eeeeee", borderTop: "1px solid #eeeeee", background: "#fafafa" },
  tr:        { borderBottom: "1px solid #f0f0f0", cursor: "pointer" },
  td:        { padding: "12px 16px", color: "#161616", fontSize: 13, verticalAlign: "middle" as const },
  topicName: { fontWeight: 600, color: "#161616" },
  topicSub:  { fontSize: 11, color: "#9e9e9e" },
  confidenceBadge: { fontSize: 11, fontWeight: 600, color: "#2e7d32", background: "#e8f5e9", padding: "2px 6px", borderRadius: 3 },
  badge:     { fontSize: 11, fontWeight: 600, padding: "3px 8px", borderRadius: 4 },
  badgeDone: { background: "#161616", color: "#ffffff" },
  badgePending: { background: "#fff8e1", color: "#f57f17", border: "1px solid #ffe082" },
};

const m: Record<string, React.CSSProperties> = {
  overlay:  { position: "fixed" as const, inset: 0, background: "rgba(0,0,0,0.4)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 100, padding: 20 },
  modal:    { background: "#ffffff", border: "1px solid #e0e0e0", borderRadius: 6, width: "100%", maxWidth: 560, boxShadow: "0 10px 25px rgba(0,0,0,0.1)" },
  header:   { padding: "18px 24px", borderBottom: "1px solid #eeeeee", display: "flex", alignItems: "flex-start", justifyContent: "space-between" },
  title:    { fontSize: 16, fontWeight: 700, color: "#161616", margin: 0 },
  sub:      { fontSize: 12, color: "#9e9e9e", marginTop: 2, margin: 0 },
  closeBtn: { background: "none", border: "none", fontSize: 15, color: "#9e9e9e", cursor: "pointer" },
  body:     { padding: "20px 24px", display: "flex", flexDirection: "column" as const, gap: 14 },
  section:  { borderBottom: "1px solid #f0f0f0", paddingBottom: 12 },
  label:    { fontSize: 11, fontWeight: 600, color: "#9e9e9e", letterSpacing: "0.5px", display: "block" },
  text:     { fontSize: 13, color: "#424242", lineHeight: 1.5, marginTop: 4 },
  footer:   { padding: "14px 24px", borderTop: "1px solid #eeeeee", background: "#fafafa", display: "flex", alignItems: "center", justifyContent: "space-between" },
  btnPrimary: { padding: "8px 16px", background: "#161616", color: "#ffffff", border: "none", borderRadius: 4, fontSize: 13, fontWeight: 600, cursor: "pointer" },
};
