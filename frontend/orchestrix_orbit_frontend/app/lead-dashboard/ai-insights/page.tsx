"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import LoadingState from "@/components/ui/LoadingState";
import { ProjectsService, type Project } from "@/lib/services/projects";
import { TasksService } from "@/lib/services/tasks";
import { TeamsService, type TeamMember } from "@/lib/services/teams";
import {
  getAiSummaries,
  updateAiSummaryStatus,
  deleteAiSummary,
  type SavedAiSummary,
} from "@/lib/services/aiSummaries";

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
  const [filterType, setFilterType]     = useState<"ALL" | "PENDING" | "EXECUTED" | "ARCHIVED">("ALL");
  const [toastMsg, setToastMsg]         = useState<string | null>(null);
  const [isDeleting, setIsDeleting]     = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  // Per-task editing state (one entry per action item)
  const [taskTitles, setTaskTitles]         = useState<string[]>([]);
  const [taskAssignees, setTaskAssignees]   = useState<string[]>([]);
  const [approvingIdx, setApprovingIdx]     = useState<number | null>(null);
  const [approvedIdxs, setApprovedIdxs]     = useState<number[]>([]);
  const [teamMembers, setTeamMembers]       = useState<TeamMember[]>([]);
  const [isMarkingRead, setIsMarkingRead]   = useState(false);
  const [isArchiving, setIsArchiving]       = useState(false);

  // When a modal opens, seed per-task editable fields and load team members
  useEffect(() => {
    if (selectedItem) {
      const items = selectedItem.actionItems || [];
      setTaskTitles(items.map((a) => a));
      setTaskAssignees(items.map(() => ""));
      setApprovedIdxs([]);
      setApprovingIdx(null);
      // Load team members for this project
      TeamsService.getAllMembers()
        .then((members) => setTeamMembers(members))
        .catch(() => setTeamMembers([]));
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

  async function handleApproveTask(item: InsightItem, taskIdx: number) {
    const title = taskTitles[taskIdx]?.trim();
    if (!title) return;
    setApprovingIdx(taskIdx);
    try {
      const assigneeId = taskAssignees[taskIdx] || undefined;
      await TasksService.create(item.projectId, {
        title,
        description: item.summary,
        priority: "HIGH",
        assigneeId,
      });
      setApprovedIdxs((prev) => [...prev, taskIdx]);
      // If all tasks approved, mark summary as Executed and close
      const allApproved = [...approvedIdxs, taskIdx].length === (item.actionItems?.length || 0);
      if (allApproved) {
        await updateAiSummaryStatus(item.id, "Executed");
        setInsights((prev) => prev.map((i) => (i.id === item.id ? { ...i, status: "Executed" } : i)));
        setSelectedItem(null);
        setToastMsg(`✓ All tasks approved and created on ${item.projectName} Kanban board.`);
        setTimeout(() => setToastMsg(null), 4000);
      } else {
        setToastMsg(`✓ Task "${title}" created.`);
        setTimeout(() => setToastMsg(null), 2500);
      }
    } catch (e) {
      alert("Failed to create task: " + e);
    } finally {
      setApprovingIdx(null);
    }
  }

  async function handleReject(item: InsightItem) {
    setIsArchiving(true);
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
    } finally {
      setIsArchiving(false);
    }
  }

  async function handleDelete(id: string) {
    setIsDeleting(true);
    try {
      await deleteAiSummary(id);
      setInsights((prev) => prev.filter((i) => i.id !== id));
      setSelectedItem(null);
      setDeleteConfirmId(null);
      setToastMsg("Summary deleted successfully.");
      setTimeout(() => setToastMsg(null), 3000);
    } catch (e) {
      alert("Failed to delete summary: " + e);
    } finally {
      setIsDeleting(false);
    }
  }

  if (loading) {
    return (
      <LoadingState variant="chat" title="Loading AI Summaries…"
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

      {/* ── Stat Cards ───────────────────────────────────────────────────────── */}
      <div style={s.statGrid}>
        <div style={s.statCard} className="card-depth">
          <span style={s.statLabel}>TOTAL AI SUMMARIES</span>
          <span style={s.statValue}>{insights.length}</span>
          <span style={s.statSub}>Generated across chats</span>
        </div>
        <div style={s.statCard} className="card-depth">
          <span style={s.statLabel}>AVG CONFIDENCE</span>
          <span style={s.statValue}>{insights.length > 0 ? `${avgConfidence}%` : "100%"}</span>
          <span style={s.statSub}>LangChain Context Engine</span>
        </div>
        <div style={s.statCard} className="card-depth">
          <span style={s.statLabel}>PENDING APPROVAL</span>
          <span style={{ ...s.statValue, color: pendingCount > 0 ? "#f57f17" : "#161616" }}>
            {pendingCount}
          </span>
          <span style={s.statSub}>Awaiting lead review</span>
        </div>
        <div style={s.statCard} className="card-depth">
          <span style={s.statLabel}>CONVERTED TO TASKS</span>
          <span style={s.statValue}>{executedCount}</span>
          <span style={s.statSub}>Approved into Kanban board</span>
        </div>
      </div>

      {/* ── Main Summaries Table Card ─────────────────────────────────────────── */}
      <div style={s.tableCard} className="card-depth">
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
            <p style={{ fontSize: 15, fontWeight: 600, color: "#111827", margin: 0 }}>
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
                <th style={{ ...s.th, textAlign: "center", width: 60 }}></th>
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
                  <td style={{ ...s.td, color: "#374151", fontWeight: 500 }}>
                    {item.projectName}
                  </td>
                  <td style={{ ...s.td, color: "#616161", fontFamily: "var(--font-mono)", fontSize: 12 }}>
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
                  <td style={{ ...s.td, textAlign: "center" }} onClick={(e) => e.stopPropagation()}>
                    {deleteConfirmId === item.id ? (
                      <div style={{ display: "flex", gap: 4, justifyContent: "center" }}>
                        <button
                          onClick={() => handleDelete(item.id)}
                          disabled={isDeleting}
                          style={{ fontSize: 10, padding: "3px 8px", background: "#dc2626", color: "#fff", border: "none", borderRadius: 4, cursor: "pointer", fontWeight: 700 }}
                        >{isDeleting ? "…" : "Yes"}</button>
                        <button
                          onClick={() => setDeleteConfirmId(null)}
                          style={{ fontSize: 10, padding: "3px 8px", background: "#f5f5f5", color: "#111827", border: "1px solid #d0d0d0", borderRadius: 4, cursor: "pointer" }}
                        >No</button>
                      </div>
                    ) : (
                      <button
                        onClick={() => setDeleteConfirmId(item.id)}
                        title="Delete summary"
                        style={{ background: "none", border: "none", cursor: "pointer", color: "#9e9e9e", fontSize: 14, padding: 4, borderRadius: 4, transition: "color 0.15s" }}
                        onMouseEnter={(e) => (e.currentTarget.style.color = "#dc2626")}
                        onMouseLeave={(e) => (e.currentTarget.style.color = "#9e9e9e")}
                      >🗑</button>
                    )}
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
                <p style={{ fontSize: 14, fontWeight: 600, color: "#111827", marginTop: 4 }}>
                  {selectedItem.projectName} • Logged on {selectedItem.date}
                </p>
              </div>

              {/* Executive Summary — always shown */}
              <div style={m.section}>
                <span style={m.label}>EXECUTIVE SUMMARY</span>
                <p style={m.text}>{selectedItem.summary}</p>
              </div>

              {/* Key Findings */}
              {selectedItem.keyFindings.length > 0 && (
                <div style={m.section}>
                  <span style={m.label}>KEY FINDINGS</span>
                  <div style={{ display: "flex", flexDirection: "column", gap: 6, marginTop: 8 }}>
                    {selectedItem.keyFindings.map((f, i) => (
                      <div key={i} style={{ display: "flex", gap: 8, fontSize: 13, color: "#374151" }}>
                        <span style={{ color: "#9e9e9e", fontWeight: 700 }}>•</span>
                        <span>{f}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* ── No actionable tasks notice + Mark as Read ── */}
              {selectedItem.status === "Pending Approval" && (!selectedItem.actionItems || selectedItem.actionItems.length === 0) && (
                <div style={{ background: "#f0fdf4", border: "1px solid #bbf7d0", borderRadius: 6, padding: "14px 16px", borderLeft: "3px solid #22c55e", display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 16 }}>
                  <p style={{ fontSize: 13, color: "#15803d", margin: 0, fontWeight: 500, flex: 1 }}>
                    ℹ️ No actionable tasks were identified in this conversation. Mark it as read to acknowledge and close it.
                  </p>
                  <button
                    disabled={isMarkingRead}
                    onClick={async () => {
                      setIsMarkingRead(true);
                      try {
                        await updateAiSummaryStatus(selectedItem.id, "Executed");
                        setInsights((prev) => prev.map((i) => i.id === selectedItem.id ? { ...i, status: "Executed" } : i));
                        setSelectedItem(null);
                        setToastMsg("✓ Summary marked as read.");
                        setTimeout(() => setToastMsg(null), 3000);
                      } catch (e) {
                        alert("Failed to mark as read: " + e);
                      } finally {
                        setIsMarkingRead(false);
                      }
                    }}
                    style={{ flexShrink: 0, padding: "6px 14px", background: isMarkingRead ? "#4ade80" : "#16a34a", color: "#fff", border: "none", borderRadius: 4, fontSize: 12, fontWeight: 700, cursor: isMarkingRead ? "not-allowed" : "pointer", whiteSpace: "nowrap", opacity: isMarkingRead ? 0.75 : 1, transition: "all 0.15s" }}
                  >
                    {isMarkingRead ? "Processing…" : "✓ Mark as Read"}
                  </button>
                </div>
              )}

              {/* ── Per-task approval cards (only if action items exist) ── */}
              {selectedItem.status === "Pending Approval" && selectedItem.actionItems && selectedItem.actionItems.length > 0 && (
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  <span style={m.label}>TASKS TO CREATE ({selectedItem.actionItems.length})</span>
                  {selectedItem.actionItems.map((actionItem, idx) => {
                    const isApproved = approvedIdxs.includes(idx);
                    const isApproving = approvingIdx === idx;
                    return (
                      <div key={idx} style={{
                        border: isApproved ? "1px solid #bbf7d0" : "1px solid #e0e0e0",
                        borderRadius: 6, padding: "12px 14px",
                        background: isApproved ? "#f0fdf4" : "#fafafa",
                        opacity: isApproved ? 0.75 : 1,
                        display: "flex", flexDirection: "column", gap: 8,
                      }}>
                        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
                          <span style={{ fontSize: 11, fontWeight: 600, color: "#9e9e9e" }}>TASK {idx + 1}</span>
                          {isApproved && <span style={{ fontSize: 11, fontWeight: 700, color: "#059669", background: "#d1fae5", padding: "2px 8px", borderRadius: 10 }}>✓ Created</span>}
                        </div>
                        <input
                          disabled={isApproved}
                          value={taskTitles[idx] ?? actionItem}
                          onChange={(e) => setTaskTitles((prev) => { const n = [...prev]; n[idx] = e.target.value; return n; })}
                          style={{ ...m.input, fontSize: 13, fontWeight: 600 }}
                          placeholder="Task title..."
                        />
                        {/* Assignee selector */}
                        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                          <span style={{ fontSize: 11, color: "#9e9e9e", whiteSpace: "nowrap" }}>Assign to:</span>
                          <select
                            disabled={isApproved}
                            value={taskAssignees[idx] ?? ""}
                            onChange={(e) => setTaskAssignees((prev) => { const n = [...prev]; n[idx] = e.target.value; return n; })}
                            style={{ flex: 1, padding: "6px 8px", fontSize: 12, border: "1px solid #d0d0d0", borderRadius: 4, background: "#ffffff", color: "#111827", cursor: "pointer" }}
                          >
                            <option value="">— Unassigned —</option>
                            {teamMembers.map((m) => {
                              const uid = m.userId || m.id || "";
                              const name = m.userDisplayName || m.displayName || m.userEmail || m.email || uid;
                              return <option key={uid} value={uid}>{name}</option>;
                            })}
                          </select>
                        </div>
                        {!isApproved && (
                          <button
                            disabled={isApproving || !taskTitles[idx]?.trim()}
                            onClick={() => handleApproveTask(selectedItem, idx)}
                            style={{ alignSelf: "flex-end", padding: "5px 14px", background: "#161616", color: "#fff", border: "none", borderRadius: 4, fontSize: 12, fontWeight: 600, cursor: "pointer", opacity: (!taskTitles[idx]?.trim() || isApproving) ? 0.5 : 1 }}
                          >
                            {isApproving ? "Creating…" : "✓ Approve & Create"}
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <div style={m.footer}>
              <span style={{ fontSize: 12, color: "#757575" }}>
                Status: <strong>{selectedItem.status}</strong>
              </span>
              <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                <button
                  onClick={() => { if (window.confirm("Delete this summary permanently?")) handleDelete(selectedItem.id); }}
                  disabled={isDeleting}
                  style={{ padding: "8px 14px", background: "#ffffff", color: "#dc2626", border: "1px solid #fca5a5", borderRadius: 4, fontSize: 13, fontWeight: 600, cursor: "pointer" }}
                >
                  {isDeleting ? "Deleting..." : "🗑 Delete"}
                </button>
                {selectedItem.status === "Pending Approval" ? (
                  <>
                    <button
                      onClick={() => handleReject(selectedItem)}
                      disabled={isArchiving}
                      style={{ ...m.btnDanger, opacity: isArchiving ? 0.65 : 1, cursor: isArchiving ? "not-allowed" : "pointer" }}
                    >
                      {isArchiving ? "Archiving…" : "Archive"}
                    </button>
                    {/* Only show Close if no tasks — approve buttons are inline per task */}
                    {(!selectedItem.actionItems || selectedItem.actionItems.length === 0) && (
                      <button onClick={() => setSelectedItem(null)} style={m.btnPrimary}>Close</button>
                    )}
                  </>
                ) : (
                  <>
                    <Link
                      href={`/lead-dashboard/projects/${selectedItem.projectId}`}
                      style={{ padding: "8px 14px", background: "#f5f5f5", color: "#111827", border: "1px solid #d0d0d0", borderRadius: 4, fontSize: 13, fontWeight: 600, textDecoration: "none" }}
                      onClick={() => setSelectedItem(null)}
                    >
                      Open Project Kanban →
                    </Link>
                    <button onClick={() => setSelectedItem(null)} style={m.btnPrimary}>Close</button>
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
  pageTitle: { fontSize: "clamp(24px, 2vw, 32px)", fontWeight: 700, color: "#111827", letterSpacing: "-0.5px", marginBottom: 4 },
  pageSub:   { fontSize: "clamp(12px, 1vw, 15px)", color: "#757575" },
  btnPrimary: { background: "#161616", color: "#ffffff", border: "none", borderRadius: 4, padding: "clamp(8px, 0.8vw, 12px) clamp(16px, 1.5vw, 24px)", fontSize: "clamp(12px, 1vw, 14px)", fontWeight: 600, textDecoration: "none" , boxShadow: "0 4px 6px -1px rgba(17, 24, 39, 0.15)"},
  statGrid:  { display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "clamp(16px, 1.5vw, 24px)", marginBottom: 32 },
  statCard:  { padding: "clamp(16px, 1.5vw, 24px)", display: "flex", flexDirection: "column", gap: 6 },
  statLabel: { fontSize: "clamp(10px, 0.8vw, 12px)", fontWeight: 600, color: "#9e9e9e", letterSpacing: "0.5px", textTransform: "uppercase" as const },
  statValue: { fontSize: "clamp(24px, 2.2vw, 36px)", fontWeight: 700, color: "#111827", letterSpacing: "-1px", lineHeight: 1.1 },
  statSub:   { fontSize: "clamp(11px, 0.9vw, 14px)", color: "#9e9e9e" },
  tableCard: { overflow: "hidden" },
  tableHeaderRow: { display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 20px 10px" },
  sectionLabel: { fontSize: 11, fontWeight: 600, color: "#9e9e9e", letterSpacing: "0.6px", textTransform: "uppercase" as const, margin: 0 },
  filterTabs: { display: "flex", gap: 6 },
  filterTabBtn: { background: "none", border: "1px solid #f3f4f6", borderRadius: 4, padding: "4px 10px", fontSize: 12, color: "#616161", cursor: "pointer", fontWeight: 500 },
  filterTabBtnActive: { background: "#161616", borderColor: "#161616", color: "#ffffff", fontWeight: 600 },
  table:     { width: "100%", borderCollapse: "collapse" as const, fontSize: "clamp(12px, 1vw, 15px)" },
  th:        { textAlign: "left" as const, padding: "10px 16px", fontSize: "clamp(11px, 0.9vw, 14px)", fontWeight: 500, color: "#9e9e9e", borderBottom: "1px solid #eeeeee", borderTop: "1px solid #eeeeee", background: "#fafafa" },
  tr:        { borderBottom: "1px solid #f3f4f6", cursor: "pointer" },
  td:        { padding: "clamp(12px, 1vw, 18px) 16px", color: "#111827", fontSize: "clamp(12px, 1vw, 15px)", verticalAlign: "middle" as const },
  topicName: { fontWeight: 600, color: "#111827" },
  topicSub:  { fontSize: "clamp(10px, 0.8vw, 13px)", color: "#9e9e9e" },
  confidenceBadge: { fontSize: 11, fontWeight: 600, color: "#2e7d32", background: "#e8f5e9", padding: "2px 6px", borderRadius: 3 },
  badge:     { fontSize: 11, fontWeight: 600, padding: "3px 8px", borderRadius: 4 },
  badgeDone: { background: "#161616", color: "#ffffff" },
  badgePending: { background: "#fff8e1", color: "#f57f17", border: "1px solid #ffe082" },
  badgeArchived: { background: "#f5f5f5", color: "#9e9e9e", border: "1px solid #f3f4f6" },
  toastSuccess: { background: "#e8f5e9", border: "1px solid #c8e6c9", borderRadius: 6, padding: "12px 16px", marginBottom: 20, fontSize: 13, color: "#2e7d32", fontWeight: 500 },
  toastError: { background: "#fff0f0", border: "1px solid #f5c6cb", borderRadius: 6, padding: "12px 16px", marginBottom: 20, fontSize: 13, color: "#c62828" },
};

const m: Record<string, React.CSSProperties> = {
  overlay:  { position: "fixed" as const, inset: 0, background: "rgba(0,0,0,0.45)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 100, padding: 20 },
  modal:    { background: "#ffffff", border: "1px solid rgba(0,0,0,0.06)", borderRadius: 12, width: "100%", maxWidth: 580, boxShadow: "0 20px 40px rgba(0,0,0,0.14), 0 4px 12px rgba(0,0,0,0.06)" },
  header:   { padding: "18px 24px", borderBottom: "1px solid #eeeeee", display: "flex", alignItems: "flex-start", justifyContent: "space-between" },
  title:    { fontSize: 16, fontWeight: 700, color: "#111827", margin: 0 },
  sub:      { fontSize: 12, color: "#757575", marginTop: 2, margin: 0 },
  closeBtn: { background: "none", border: "none", fontSize: 16, color: "#9e9e9e", cursor: "pointer" },
  body:     { padding: "20px 24px", display: "flex", flexDirection: "column" as const, gap: 14, maxHeight: "70vh", overflowY: "auto" as const },
  section:  { borderBottom: "1px solid #f3f4f6", paddingBottom: 12 },
  label:    { fontSize: 11, fontWeight: 600, color: "#9e9e9e", letterSpacing: "0.5px", display: "block" },
  text:     { fontSize: 13, color: "#374151", lineHeight: 1.5, marginTop: 4 },
  footer:   { padding: "14px 24px", borderTop: "1px solid #eeeeee", background: "#fafafa", display: "flex", alignItems: "center", justifyContent: "space-between" },
  btnPrimary: { padding: "8px 16px", background: "#161616", color: "#ffffff", border: "none", borderRadius: 4, fontSize: 13, fontWeight: 600, cursor: "pointer" , boxShadow: "0 4px 6px -1px rgba(17, 24, 39, 0.15)"},
  btnDanger:  { padding: "8px 16px", background: "#fff0f0", color: "#c62828", border: "1px solid #f5c6cb", borderRadius: 4, fontSize: 13, fontWeight: 600, cursor: "pointer" },
  input:      { width: "100%", boxSizing: "border-box" as const, padding: "8px 12px", border: "1px solid #d0d0d0", borderRadius: 4, fontSize: 13, fontFamily: "var(--font)" },
  textarea:   { width: "100%", boxSizing: "border-box" as const, padding: "8px 12px", border: "1px solid #d0d0d0", borderRadius: 4, fontSize: 13, fontFamily: "var(--font)", resize: "vertical" as const },
};
