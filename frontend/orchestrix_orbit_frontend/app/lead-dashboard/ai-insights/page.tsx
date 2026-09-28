"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import LoadingState from "@/components/ui/LoadingState";
import { ProjectsService, type Project } from "@/lib/services/projects";
import { TasksService, type Task } from "@/lib/services/tasks";
import {
  getAiSummaries,
  updateAiSummaryStatus,
  type SavedAiSummary,
} from "@/lib/services/aiSummaries";
import SavedChatSummaries from "@/components/SavedChatSummaries";

// ── Types ──────────────────────────────────────────────────────────────────
interface InsightItem {
  id: string;
  projectId: string;
  projectName: string;
  topic: string;
  summary: string;
  keyFindings: string[];
  actionItems?: string[];
  confidence: number;
  date: string;
  status: "Pending Approval" | "Executed" | "Archived";
  model: string;
  sourceType: "CHAT_SUMMARY";
}

export default function AiInsightsPage() {
  const [loading, setLoading]           = useState(true);
  const [error, setError]               = useState<string | null>(null);
  const [insights, setInsights]         = useState<InsightItem[]>([]);
  const [selectedItem, setSelectedItem] = useState<InsightItem | null>(null);
  const [projects, setProjects]         = useState<Project[]>([]);
  const [isApproving, setIsApproving]   = useState(false);
  const [editTitle, setEditTitle]       = useState("");
  const [editDesc, setEditDesc]         = useState("");
  const [filterType, setFilterType]     = useState<"ALL" | "PENDING" | "EXECUTED" | "ARCHIVED">("ALL");
  const [toastMsg, setToastMsg]         = useState<string | null>(null);

  // When a modal opens, seed the editable fields
  useEffect(() => {
    if (selectedItem) {
      setEditTitle(selectedItem.topic);
      setEditDesc(selectedItem.summary);
    }
  }, [selectedItem]);

  async function loadData() {
    try {
      const projectList = await ProjectsService.getAll();
      setProjects(projectList);

      // Fetch ONLY real AI summaries from database
      const rawSummaries = await getAiSummaries();

      const items: InsightItem[] = rawSummaries.map((cs) => {
        const matched = projectList.find(
          (p) => p.id === cs.projectId || p.name === cs.projectName
        );
        return {
          id: cs.id,
          projectId: matched ? matched.id : cs.projectId,
          projectName: matched ? matched.name : cs.projectName || "Research Project",
          topic: cs.topic,
          summary: cs.summary,
          keyFindings: [
            ...(cs.keyFindings || []),
            ...(cs.actionItems && cs.actionItems.length > 0
              ? cs.actionItems.map((a) => `Action Item: ${a}`)
              : []),
          ],
          actionItems: cs.actionItems || [],
          confidence: cs.confidence || 100,
          date: cs.date,
          status: cs.status,
          model: cs.model || "LangChain Context Engine",
          sourceType: "CHAT_SUMMARY",
        };
      });

      setInsights(items);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to load AI Summaries");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();

    const handleUpdate = () => {
      loadData();
    };
    window.addEventListener("ai_summaries_updated", handleUpdate);
    window.addEventListener("focus", handleUpdate);
    return () => {
      window.removeEventListener("ai_summaries_updated", handleUpdate);
      window.removeEventListener("focus", handleUpdate);
    };
  }, []);

  async function handleApprove(item: InsightItem) {
    setIsApproving(true);
    try {
      // Create task on the Kanban board in PostgreSQL database
      await TasksService.create(item.projectId, {
        title: editTitle || item.topic,
        description: editDesc || item.summary,
        priority: "HIGH",
      });

      // Update AI summary status in DB to "Executed"
      await updateAiSummaryStatus(item.id, "Executed");

      // Optimistically update the UI
      setInsights((prev) =>
        prev.map((i) => (i.id === item.id ? { ...i, status: "Executed" } : i))
      );
      setSelectedItem(null);
      setToastMsg(`Approved! Task "${editTitle || item.topic}" created on ${item.projectName} Kanban board.`);
      setTimeout(() => setToastMsg(null), 4000);
    } catch (e) {
      alert("Failed to approve task: " + e);
    } finally {
      setIsApproving(false);
    }
  }

  async function handleReject(item: InsightItem) {
    try {
      await updateAiSummaryStatus(item.id, "Archived");
      setInsights((prev) =>
        prev.map((i) => (i.id === item.id ? { ...i, status: "Archived" } : i))
      );
      setSelectedItem(null);
      setToastMsg(`AI Summary archived.`);
      setTimeout(() => setToastMsg(null), 3000);
    } catch (e) {
      alert("Failed to archive summary: " + e);
    }
  }

  if (loading) {
    return (
      <LoadingState
        title="Loading AI Summaries…"
        subtitle="Connecting to database and fetching chat-generated summaries"
      />
    );
  }

  const pendingCount  = insights.filter((i) => i.status === "Pending Approval").length;
  const executedCount = insights.filter((i) => i.status === "Executed").length;
  const archivedCount = insights.filter((i) => i.status === "Archived").length;
  const avgConfidence =
    insights.length > 0
      ? Math.round(insights.reduce((sum, i) => sum + i.confidence, 0) / insights.length)
      : 100;

  const visibleInsights = insights.filter((item) => {
    if (filterType === "PENDING") return item.status === "Pending Approval";
    if (filterType === "EXECUTED") return item.status === "Executed";
    if (filterType === "ARCHIVED") return item.status === "Archived";
    return true;
  });

  return (
    <div>
      {/* ── Page Header ──────────────────────────────────────────────────────── */}
      <div style={s.headerRow}>
        <div>
          <h1 style={s.pageTitle}>AI Summaries</h1>
          <p style={s.pageSub}>
            Chat-generated discussion summaries and action item extractions awaiting Lead review & approval.
          </p>
        </div>
        <Link href="/lead-dashboard/chat" style={s.btnPrimary}>
          Open Chat to Summarize →
        </Link>
      </div>

      {toastMsg && (
        <div style={s.toastSuccess}>
          ✓ {toastMsg}
        </div>
      )}

      {error && (
        <div style={s.toastError}>
          ⚠ Failed to load summaries: {error}
        </div>
      )}

      <SavedChatSummaries />

      {/* ── Stat Cards ───────────────────────────────────────────────────────── */}
      <div style={s.statGrid}>
        <div style={s.statCard}>
          <span style={s.statLabel}>TOTAL AI SUMMARIES</span>
          <span style={s.statValue}>{insights.length}</span>
          <span style={s.statSub}>Generated across chats</span>
        </div>
        <div style={s.statCard}>
          <span style={s.statLabel}>AVG CONFIDENCE</span>
          <span style={s.statValue}>{insights.length > 0 ? `${avgConfidence}%` : "100%"}</span>
          <span style={s.statSub}>LangChain Context Engine</span>
        </div>
        <div style={s.statCard}>
          <span style={s.statLabel}>PENDING APPROVAL</span>
          <span style={{ ...s.statValue, color: pendingCount > 0 ? "#f57f17" : "#161616" }}>
            {pendingCount}
          </span>
          <span style={s.statSub}>Awaiting lead review</span>
        </div>
        <div style={s.statCard}>
          <span style={s.statLabel}>CONVERTED TO TASKS</span>
          <span style={s.statValue}>{executedCount}</span>
          <span style={s.statSub}>Approved into Kanban board</span>
        </div>
      </div>

      {/* ── Main Summaries Table Card ─────────────────────────────────────────── */}
      <div style={s.tableCard}>
        <div style={s.tableHeaderRow}>
          <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
            <p style={s.sectionLabel}>AI SUMMARIES & ACTION ITEMS</p>
            {/* Filter Tabs */}
            <div style={s.filterTabs}>
              <button
                style={{
                  ...s.filterTabBtn,
                  ...(filterType === "ALL" ? s.filterTabBtnActive : {}),
                }}
                onClick={() => setFilterType("ALL")}
              >
                All ({insights.length})
              </button>
              <button
                style={{
                  ...s.filterTabBtn,
                  ...(filterType === "PENDING" ? s.filterTabBtnActive : {}),
                }}
                onClick={() => setFilterType("PENDING")}
              >
                Pending ({pendingCount})
              </button>
              <button
                style={{
                  ...s.filterTabBtn,
                  ...(filterType === "EXECUTED" ? s.filterTabBtnActive : {}),
                }}
                onClick={() => setFilterType("EXECUTED")}
              >
                Approved ({executedCount})
              </button>
              <button
                style={{
                  ...s.filterTabBtn,
                  ...(filterType === "ARCHIVED" ? s.filterTabBtnActive : {}),
                }}
                onClick={() => setFilterType("ARCHIVED")}
              >
                Archived ({archivedCount})
              </button>
            </div>
          </div>
          <span style={{ fontSize: 12, color: "#9e9e9e", marginRight: 16 }}>
            {visibleInsights.length} {visibleInsights.length === 1 ? "Entry" : "Entries"}
          </span>
        </div>

        {visibleInsights.length === 0 ? (
          <div style={{ padding: "56px 24px", textAlign: "center" }}>
            <div style={{ fontSize: 32, marginBottom: 12 }}>⚡</div>
            <p style={{ fontSize: 15, fontWeight: 600, color: "#161616", margin: 0 }}>
              {insights.length === 0
                ? "No AI Summaries created yet"
                : "No summaries in this category"}
            </p>
            <p style={{ fontSize: 13, color: "#757575", marginTop: 8, maxWidth: 460, margin: "8px auto 0" }}>
              {insights.length === 0
                ? "Select messages in any project chat and click '⚡ Summarize with AI' to analyze discussions and extract action items for lead approval."
                : "Try selecting a different filter above to view pending or approved summaries."}
            </p>
            {insights.length === 0 && (
              <Link
                href="/lead-dashboard/chat"
                style={{
                  ...s.btnPrimary,
                  display: "inline-block",
                  marginTop: 18,
                  textDecoration: "none",
                }}
              >
                Go to Chat to Summarize →
              </Link>
            )}
          </div>
        ) : (
          <table style={s.table}>
            <thead>
              <tr>
                <th style={s.th}>Summary Topic</th>
                <th style={s.th}>Target Project</th>
                <th style={s.th}>Engine / Model</th>
                <th style={s.th}>Confidence</th>
                <th style={s.th}>Date</th>
                <th style={{ ...s.th, textAlign: "right" }}>Status</th>
              </tr>
            </thead>
            <tbody>
              {visibleInsights.map((item) => (
                <tr
                  key={item.id}
                  style={s.tr}
                  onClick={() => setSelectedItem(item)}
                  className="cursor-pointer"
                >
                  <td style={s.td}>
                    <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                      <span style={s.topicName}>{item.topic}</span>
                      <span style={s.topicSub}>Click to inspect & approve task</span>
                    </div>
                  </td>
                  <td style={{ ...s.td, color: "#424242", fontWeight: 500 }}>
                    {item.projectName}
                  </td>
                  <td style={{ ...s.td, color: "#616161", fontFamily: "monospace", fontSize: 12 }}>
                    {item.model}
                  </td>
                  <td style={s.td}>
                    <span style={s.confidenceBadge}>{item.confidence}% Match</span>
                  </td>
                  <td style={{ ...s.td, color: "#757575" }}>{item.date}</td>
                  <td style={{ ...s.td, textAlign: "right" }}>
                    <span
                      style={{
                        ...s.badge,
                        ...(item.status === "Executed"
                          ? s.badgeDone
                          : item.status === "Archived"
                          ? s.badgeArchived
                          : s.badgePending),
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
          <div style={m.modal} onClick={(e) => e.stopPropagation()}>
            <div style={m.header}>
              <div>
                <h3 style={m.title}>{selectedItem.topic}</h3>
                <p style={m.sub}>
                  Source: <strong>{selectedItem.model}</strong> ({selectedItem.confidence}% confidence)
                </p>
              </div>
              <button onClick={() => setSelectedItem(null)} style={m.closeBtn}>
                ✕
              </button>
            </div>

            <div style={m.body}>
              <div style={m.section}>
                <span style={m.label}>TARGET PROJECT</span>
                <p style={{ fontSize: 14, fontWeight: 600, color: "#161616", marginTop: 4 }}>
                  {selectedItem.projectName} • Logged on {selectedItem.date}
                </p>
              </div>

              {selectedItem.status === "Pending Approval" ? (
                <>
                  <div style={m.section}>
                    <span style={m.label}>EXECUTIVE SUMMARY</span>
                    <p style={m.text}>{selectedItem.summary}</p>
                  </div>
                  <div style={m.section}>
                    <span style={m.label}>PROPOSED TASK TITLE (EDITABLE)</span>
                    <input
                      style={{ ...m.input, marginTop: 8 }}
                      value={editTitle}
                      onChange={(e) => setEditTitle(e.target.value)}
                    />
                  </div>
                  <div style={m.section}>
                    <span style={m.label}>PROPOSED TASK DESCRIPTION (EDITABLE)</span>
                    <textarea
                      style={{ ...m.textarea, marginTop: 8 }}
                      value={editDesc}
                      onChange={(e) => setEditDesc(e.target.value)}
                      rows={3}
                    />
                  </div>
                </>
              ) : (
                <div style={m.section}>
                  <span style={m.label}>EXECUTIVE SUMMARY</span>
                  <p style={m.text}>{selectedItem.summary}</p>
                </div>
              )}

              <div style={{ ...m.section, borderBottom: "none", paddingBottom: 0 }}>
                <span style={m.label}>KEY FINDINGS & EXTRACTED ACTION ITEMS</span>
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
              <span style={{ fontSize: 12, color: "#757575" }}>
                Status: <strong>{selectedItem.status}</strong>
              </span>
              <div style={{ display: "flex", gap: 8 }}>
                {selectedItem.status === "Pending Approval" ? (
                  <>
                    <button
                      onClick={() => handleReject(selectedItem)}
                      style={m.btnDanger}
                      disabled={isApproving}
                    >
                      Reject
                    </button>
                    <button
                      onClick={() => handleApprove(selectedItem)}
                      style={m.btnPrimary}
                      disabled={isApproving}
                    >
                      {isApproving ? "Approving..." : "Approve & Convert to Task"}
                    </button>
                  </>
                ) : (
                  <>
                    <Link
                      href={`/lead-dashboard/projects/${selectedItem.projectId}`}
                      style={{
                        padding: "8px 14px",
                        background: "#f5f5f5",
                        color: "#161616",
                        border: "1px solid #d0d0d0",
                        borderRadius: 4,
                        fontSize: 13,
                        fontWeight: 600,
                        textDecoration: "none",
                      }}
                      onClick={() => setSelectedItem(null)}
                    >
                      Open Project Kanban →
                    </Link>
                    <button onClick={() => setSelectedItem(null)} style={m.btnPrimary}>
                      Close
                    </button>
                  </>
                )}
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
  pageSub:   { fontSize: 13, color: "#757575" },
  btnPrimary:{ background: "#161616", color: "#ffffff", border: "none", borderRadius: 4, padding: "9px 16px", fontSize: 13, fontWeight: 600, textDecoration: "none" },
  statGrid:  { display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16, marginBottom: 32 },
  statCard:  { background: "#ffffff", border: "1px solid #e0e0e0", borderRadius: 6, padding: "18px 20px 20px", display: "flex", flexDirection: "column", gap: 6 },
  statLabel: { fontSize: 11, fontWeight: 600, color: "#9e9e9e", letterSpacing: "0.5px", textTransform: "uppercase" as const },
  statValue: { fontSize: 32, fontWeight: 700, color: "#161616", letterSpacing: "-1px", lineHeight: 1.1 },
  statSub:   { fontSize: 12, color: "#9e9e9e" },
  tableCard: { background: "#ffffff", border: "1px solid #e0e0e0", borderRadius: 6, overflow: "hidden" },
  tableHeaderRow: { display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 20px 10px" },
  sectionLabel: { fontSize: 11, fontWeight: 600, color: "#9e9e9e", letterSpacing: "0.6px", textTransform: "uppercase" as const, margin: 0 },
  filterTabs: { display: "flex", gap: 6 },
  filterTabBtn: { background: "none", border: "1px solid #e0e0e0", borderRadius: 4, padding: "4px 10px", fontSize: 12, color: "#616161", cursor: "pointer", fontWeight: 500 },
  filterTabBtnActive: { background: "#161616", borderColor: "#161616", color: "#ffffff", fontWeight: 600 },
  table:     { width: "100%", borderCollapse: "collapse" as const, fontSize: 13 },
  th:        { textAlign: "left" as const, padding: "10px 16px", fontSize: 12, fontWeight: 500, color: "#9e9e9e", borderBottom: "1px solid #eeeeee", borderTop: "1px solid #eeeeee", background: "#fafafa" },
  tr:        { borderBottom: "1px solid #f0f0f0", cursor: "pointer" },
  td:        { padding: "12px 16px", color: "#161616", fontSize: 13, verticalAlign: "middle" as const },
  topicName: { fontWeight: 600, color: "#161616" },
  topicSub:  { fontSize: 11, color: "#9e9e9e" },
  confidenceBadge: { fontSize: 11, fontWeight: 600, color: "#2e7d32", background: "#e8f5e9", padding: "2px 6px", borderRadius: 3 },
  badge:     { fontSize: 11, fontWeight: 600, padding: "3px 8px", borderRadius: 4 },
  badgeDone: { background: "#161616", color: "#ffffff" },
  badgePending: { background: "#fff8e1", color: "#f57f17", border: "1px solid #ffe082" },
  badgeArchived: { background: "#f5f5f5", color: "#9e9e9e", border: "1px solid #e0e0e0" },
  toastSuccess: { background: "#e8f5e9", border: "1px solid #c8e6c9", borderRadius: 6, padding: "12px 16px", marginBottom: 20, fontSize: 13, color: "#2e7d32", fontWeight: 500 },
  toastError: { background: "#fff0f0", border: "1px solid #f5c6cb", borderRadius: 6, padding: "12px 16px", marginBottom: 20, fontSize: 13, color: "#c62828" },
};

const m: Record<string, React.CSSProperties> = {
  overlay:  { position: "fixed" as const, inset: 0, background: "rgba(0,0,0,0.45)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 100, padding: 20 },
  modal:    { background: "#ffffff", border: "1px solid #e0e0e0", borderRadius: 6, width: "100%", maxWidth: 580, boxShadow: "0 10px 25px rgba(0,0,0,0.15)" },
  header:   { padding: "18px 24px", borderBottom: "1px solid #eeeeee", display: "flex", alignItems: "flex-start", justifyContent: "space-between" },
  title:    { fontSize: 16, fontWeight: 700, color: "#161616", margin: 0 },
  sub:      { fontSize: 12, color: "#757575", marginTop: 2, margin: 0 },
  closeBtn: { background: "none", border: "none", fontSize: 16, color: "#9e9e9e", cursor: "pointer" },
  body:     { padding: "20px 24px", display: "flex", flexDirection: "column" as const, gap: 14, maxHeight: "70vh", overflowY: "auto" as const },
  section:  { borderBottom: "1px solid #f0f0f0", paddingBottom: 12 },
  label:    { fontSize: 11, fontWeight: 600, color: "#9e9e9e", letterSpacing: "0.5px", display: "block" },
  text:     { fontSize: 13, color: "#424242", lineHeight: 1.5, marginTop: 4 },
  footer:   { padding: "14px 24px", borderTop: "1px solid #eeeeee", background: "#fafafa", display: "flex", alignItems: "center", justifyContent: "space-between" },
  btnPrimary: { padding: "8px 16px", background: "#161616", color: "#ffffff", border: "none", borderRadius: 4, fontSize: 13, fontWeight: 600, cursor: "pointer" },
  btnDanger:  { padding: "8px 16px", background: "#fff0f0", color: "#c62828", border: "1px solid #f5c6cb", borderRadius: 4, fontSize: 13, fontWeight: 600, cursor: "pointer" },
  input:      { width: "100%", boxSizing: "border-box" as const, padding: "8px 12px", border: "1px solid #d0d0d0", borderRadius: 4, fontSize: 13, fontFamily: "var(--font)" },
  textarea:   { width: "100%", boxSizing: "border-box" as const, padding: "8px 12px", border: "1px solid #d0d0d0", borderRadius: 4, fontSize: 13, fontFamily: "var(--font)", resize: "vertical" as const },
};
