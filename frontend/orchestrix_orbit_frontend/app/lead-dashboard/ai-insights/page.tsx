"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import LoadingState from "@/components/ui/LoadingState";
import { ProjectsService, type Project } from "@/lib/services/projects";
import { TasksService } from "@/lib/services/tasks";
import { TeamsService, type TeamMember } from "@/lib/services/teams";
import { getEmail } from "@/lib/auth";
import {
  getAiSummaries,
  updateAiSummaryStatus,
  deleteAiSummary,
  updateAiSummaryActionItems,
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

const getInitials = (name: string) => {
  if (!name || name === "Unassigned") return "?";
  return name.split(" ").map((n) => n[0]).join("").substring(0, 2).toUpperCase();
};

const getSenderColor = (name: string) => {
  if (!name || name === "Unassigned") return "#94a3b8";
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  const hue = Math.abs(hash) % 360;
  return `hsl(${hue}, 70%, 45%)`;
};

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
  const [taskTitles, setTaskTitles]             = useState<string[]>([]);
  const [taskDescriptions, setTaskDescriptions] = useState<string[]>([]);
  const [taskPriorities, setTaskPriorities]     = useState<string[]>([]);
  const [taskAssignees, setTaskAssignees]       = useState<string[]>([]);
  const [approvingIdx, setApprovingIdx]         = useState<number | null>(null);
  const [approvedIdxs, setApprovedIdxs]     = useState<number[]>([]);
  const [teamMembers, setTeamMembers]       = useState<TeamMember[]>([]);
  const [isMarkingRead, setIsMarkingRead]   = useState(false);
  const [isArchiving, setIsArchiving]       = useState(false);

  const [openAssigneeDropdownIdx, setOpenAssigneeDropdownIdx] = useState<number | null>(null);
  const [assigneeSearchQuery, setAssigneeSearchQuery] = useState("");

  const currentUserEmail = getEmail() || "Research Admin";
  const currentDisplayName = React.useMemo(() => {
    const raw = currentUserEmail;
    const memberByEmail = teamMembers.find(
      (mem) => (mem.email || mem.userEmail || "").toLowerCase() === raw.toLowerCase()
    );
    if (memberByEmail && (memberByEmail.displayName || memberByEmail.userDisplayName || memberByEmail.name)) {
      return memberByEmail.displayName || memberByEmail.userDisplayName || memberByEmail.name;
    }
    const local = raw.split("@")[0];
    return local.split(/[._\-]/).map((w: string) => w.charAt(0).toUpperCase() + w.slice(1)).join(" ");
  }, [currentUserEmail, teamMembers]);

  // When a modal opens, seed per-task editable fields and load team members
  useEffect(() => {
    if (selectedItem) {
      const items = selectedItem.actionItems || [];
      setTaskTitles(items.map((item) => {
        try { const p = JSON.parse(item); return p.title || item; } catch { return item; }
      }));
      setTaskDescriptions(items.map((item) => {
        try { const p = JSON.parse(item); return p.description || ""; } catch { return ""; }
      }));
      setTaskPriorities(items.map((item) => {
        try { const p = JSON.parse(item); return p.priority || "MEDIUM"; } catch { return "MEDIUM"; }
      }));
      setTaskAssignees(items.map((item) => {
        try { const p = JSON.parse(item); return p.assigneeId || ""; } catch { return ""; }
      }));
      setApprovedIdxs([]);
      setApprovingIdx(null);
      // Load team members for this project
      const matched = projects.find(p => p.id === selectedItem.projectId);
      if (matched && matched.teamId) {
        TeamsService.getTeamMembers(matched.teamId)
          .then((members) => setTeamMembers(members))
          .catch(() => setTeamMembers([]));
      } else {
        setTeamMembers([]);
      }

      // Persist the Approved state across refreshes by checking the industry-standard "approved" flag
      const approved: number[] = [];
      items.forEach((item, idx) => {
        try {
          const p = JSON.parse(item);
          if (p.approved === true) {
            approved.push(idx);
          }
        } catch {
          // Ignore
        }
      });
      setApprovedIdxs(approved);
    }
  }, [selectedItem, projects]);

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
              ? cs.actionItems.map((a) => {
                  try {
                    const parsed = JSON.parse(a);
                    if (parsed.title) {
                      const assignee = parsed.assigneeName && parsed.assigneeName !== "Unassigned" ? ` (Assigned to: ${parsed.assigneeName})` : "";
                      return `Action Item: ${parsed.title}${assignee}`;
                    }
                    return `Action Item: ${a}`;
                  } catch {
                    return `Action Item: ${a}`;
                  }
                })
              : [])
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
      const desc = taskDescriptions[taskIdx] || item.summary;
      const prio = taskPriorities[taskIdx] || "MEDIUM";
      let assigneeId = taskAssignees[taskIdx] || undefined;
      if (assigneeId) {
        const resolvedMem = teamMembers.find(m => 
          (m.userId === assigneeId || m.id === assigneeId) ||
          (m.displayName === assigneeId || m.userDisplayName === assigneeId || m.name === assigneeId || m.email === assigneeId)
        );
        assigneeId = resolvedMem ? (resolvedMem.userId || resolvedMem.id) : undefined;
      }

      const createdTask = await TasksService.create(item.projectId, {
        title,
        description: desc,
        priority: prio as any,
        assigneeId,
      });
      
      // Update the industry-standard approved flag in the backend's action items payload
      if (item.actionItems && item.actionItems[taskIdx]) {
        try {
          const rawItem = item.actionItems[taskIdx];
          const parsed = JSON.parse(rawItem);
          parsed.approved = true;
          parsed.taskId = createdTask.id;
          const newActionItems = [...item.actionItems];
          newActionItems[taskIdx] = JSON.stringify(parsed);
          
          await updateAiSummaryActionItems(item.id, newActionItems);
          
          // Update local state so it doesn't revert if they switch contexts quickly
          setInsights(prev => prev.map(i => i.id === item.id ? { ...i, actionItems: newActionItems } : i));
          if (selectedItem && selectedItem.id === item.id) {
            setSelectedItem(prev => prev ? { ...prev, actionItems: newActionItems } : prev);
          }
        } catch (e) {
          console.warn("Failed to update approved flag in action item json", e);
        }
      }

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
      <LoadingState variant="ai-summaries" title="Loading AI Summaries…"
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
      <style>{`
        .suggested-task-card {
          border: 1px solid #e2e8f0;
          border-radius: 12px;
          padding: 16px;
          display: flex;
          flex-direction: column;
          gap: 12px;
          box-shadow: 0 1px 3px rgba(0,0,0,0.02);
          transition: all 0.2s ease;
        }
        .suggested-task-card:hover {
          border-color: #94a3b8;
          box-shadow: 0 8px 24px rgba(0,0,0,0.06);
          transform: translateY(-2px);
        }
        
        .task-input {
          width: 100%;
          padding: 8px 12px;
          font-size: 13px;
          border-radius: 8px;
          border: 1px solid #e2e8f0;
          background: #f8fafc;
          color: #0f172a;
          transition: all 0.2s ease;
          outline: none;
        }
        .task-input:focus {
          border-color: #3b82f6;
          box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
          background: #ffffff;
        }
        
        .task-textarea {
          width: 100%;
          padding: 8px 12px;
          font-size: 13px;
          border-radius: 8px;
          border: 1px solid #e2e8f0;
          background: #f8fafc;
          color: #334155;
          transition: all 0.2s ease;
          outline: none;
          resize: vertical;
          min-height: 60px;
          font-family: inherit;
        }
        .task-textarea:focus {
          border-color: #3b82f6;
          box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
          background: #ffffff;
        }
        
        .task-select {
          width: 120px;
          padding: 8px 12px;
          font-size: 12px;
          font-weight: 500;
          border-radius: 8px;
          border: 1px solid #e2e8f0;
          background: #f8fafc;
          color: #0f172a;
          transition: all 0.2s ease;
          outline: none;
          cursor: pointer;
          appearance: none;
          background-image: url("data:image/svg+xml;charset=US-ASCII,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%2214%22%20height%3D%2214%22%20viewBox%3D%220%200%2024%2024%22%20fill%3D%22none%22%20stroke%3D%22%2364748b%22%20stroke-width%3D%222%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%3E%3Cpolyline%20points%3D%226%209%2012%2015%2018%209%22%3E%3C%2Fpolyline%3E%3C%2Fsvg%3E");
          background-repeat: no-repeat;
          background-position: right 8px center;
          padding-right: 28px;
        }
        .task-select:focus {
          border-color: #3b82f6;
          box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
          background-color: #ffffff;
        }
        .task-select:hover {
          border-color: #cbd5e1;
        }
        
        .task-action-btn {
          padding: 8px 14px;
          font-size: 12px;
          font-weight: 600;
          border-radius: 6px;
          cursor: pointer;
          transition: all 0.2s ease;
          border: 1px solid transparent;
        }
        .task-action-btn.approve {
          background: linear-gradient(135deg, #2563eb, #4f46e5);
          color: #ffffff;
          box-shadow: 0 2px 4px rgba(37, 99, 235, 0.2);
        }
        .task-action-btn.approve:hover:not(:disabled) {
          background: linear-gradient(135deg, #1d4ed8, #4338ca);
          transform: translateY(-1px);
          box-shadow: 0 4px 8px rgba(37, 99, 235, 0.3);
        }
        .task-action-btn.approve:disabled {
          background: #cbd5e1;
          color: #ffffff;
          cursor: not-allowed;
          box-shadow: none;
        }
        .btn-primary {
          background: #0f172a; color: #ffffff; border: 1px solid #0f172a; border-radius: 8px; padding: 10px 24px; font-size: 14px; font-weight: 600; text-decoration: none; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1); transition: all 0.2s ease; display: inline-flex; align-items: center; justify-content: center; cursor: pointer; text-align: center;
        }
        .btn-primary:hover { background: #1e293b; border-color: #1e293b; transform: translateY(-1px); box-shadow: 0 6px 10px -1px rgba(0, 0, 0, 0.15); }

        .btn-secondary {
          padding: 8px 16px; background: #161616; color: #ffffff; border: none; border-radius: 4px; font-size: 13px; font-weight: 600; cursor: pointer; transition: all 0.2s ease; box-shadow: 0 4px 6px -1px rgba(17, 24, 39, 0.15);
        }
        .btn-secondary:hover:not(:disabled) { background: #333333; transform: translateY(-1px); box-shadow: 0 6px 10px -1px rgba(17, 24, 39, 0.2); }

        .btn-danger {
          padding: 8px 16px; background: #fff0f0; color: #c62828; border: 1px solid #f5c6cb; border-radius: 4px; font-size: 13px; font-weight: 600; cursor: pointer; transition: all 0.2s ease;
        }
        .btn-danger:hover:not(:disabled) { background: #ffe5e5; border-color: #f1b0b7; transform: translateY(-1px); }

        .btn-outline-danger {
          padding: 8px 14px; background: #ffffff; color: #dc2626; border: 1px solid #fca5a5; border-radius: 4px; font-size: 13px; font-weight: 600; cursor: pointer; display: flex; align-items: center; gap: 6px; transition: all 0.2s ease;
        }
        .btn-outline-danger:hover:not(:disabled) { background: #fef2f2; border-color: #f87171; transform: translateY(-1px); }

        .btn-outline-secondary {
          padding: 8px 14px; background: #f5f5f5; color: #111827; border: 1px solid #d0d0d0; border-radius: 4px; font-size: 13px; font-weight: 600; text-decoration: none; transition: all 0.2s ease; display: inline-block; cursor: pointer;
        }
        .btn-outline-secondary:hover:not(:disabled) { background: #e5e5e5; border-color: #9ca3af; transform: translateY(-1px); }

        .btn-icon-danger {
          background: none; border: none; cursor: pointer; color: #9e9e9e; font-size: 14px; padding: 4px; border-radius: 4px; transition: all 0.15s ease;
        }
        .btn-icon-danger:hover { color: #dc2626; background: #fef2f2; }

        .btn-icon-close {
          background: none; border: none; font-size: 20px; color: #94a3b8; cursor: pointer; padding: 4px; border-radius: 6px; transition: all 0.2s ease; display: flex; align-items: center; justify-content: center;
        }
        .btn-icon-close:hover { color: #0f172a; background: #f1f5f9; }

        .btn-success { padding: 8px 16px; background: #16a34a; color: #ffffff; border: none; border-radius: 6px; font-size: 13px; font-weight: 600; cursor: pointer; transition: all 0.2s ease; box-shadow: 0 2px 4px rgba(22, 163, 74, 0.2); }
        .btn-success:hover:not(:disabled) { background: #15803d; transform: translateY(-1px); box-shadow: 0 4px 6px rgba(22, 163, 74, 0.3); }
      `}</style>
      {/* ── Page Header ──────────────────────────────────────────────────────── */}
      <div style={s.headerRow}>
        <div>
          <h1 style={s.pageTitle}>
            <span style={{ background: "linear-gradient(135deg, #8b5cf6, #3b82f6)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>✨ AI Insights</span> & Summaries
          </h1>
          <p style={s.pageSub}>
            Chat-generated discussion summaries and action item extractions awaiting Lead review & approval.
          </p>
        </div>
        <Link href="/lead-dashboard/chat" className="btn-primary">
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
        <div style={{...s.statCard, borderTopWidth: 3, borderTopColor: "#8b5cf6"}} className="card-depth">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={s.statLabel}>Total Summaries</span>
          </div>
          <span style={s.statValue}>{insights.length}</span>
          <span style={s.statSub}>Generated across chats</span>
        </div>
        <div style={{...s.statCard, borderTopWidth: 3, borderTopColor: "#3b82f6"}} className="card-depth">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={s.statLabel}>Avg Confidence</span>
          </div>
          <span style={s.statValue}>{insights.length > 0 ? `${avgConfidence}%` : "100%"}</span>
          <span style={s.statSub}>LangChain Context Engine</span>
        </div>
        <div style={{...s.statCard, borderTopWidth: 3, borderTopColor: "#f59e0b"}} className="card-depth">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={s.statLabel}>Pending Approval</span>
          </div>
          <span style={{ ...s.statValue, color: pendingCount > 0 ? "#f59e0b" : "#0f172a" }}>
            {pendingCount}
          </span>
          <span style={s.statSub}>Awaiting lead review</span>
        </div>
        <div style={{...s.statCard, borderTopWidth: 3, borderTopColor: "#10b981"}} className="card-depth">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={s.statLabel}>Tasks Created</span>
          </div>
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
                className="btn-primary"
                style={{ marginTop: 18 }}
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
                        className="btn-icon-danger"
                      >
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M3 6h18"></path>
                          <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                        </svg>
                      </button>
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
        <div style={m.overlay} onClick={() => setOpenAssigneeDropdownIdx(null)}>
          <div style={m.modal} onClick={(e) => { e.stopPropagation(); setOpenAssigneeDropdownIdx(null); }}>
            <div style={m.header}>
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <span style={m.title}>✨ {selectedItem.topic}</span>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <button onClick={() => setSelectedItem(null)} className="btn-icon-close">✕</button>
              </div>
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
                      <div key={idx} className="suggested-task-card" style={{
                        background: isApproved ? "#f0fdf4" : "#ffffff",
                        borderColor: isApproved ? "#bbf7d0" : "#e2e8f0",
                        opacity: isApproved ? 0.75 : 1,
                      }}>
                        {/* Header row */}
                        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                          {(() => {
                            const selectedId = taskAssignees[idx] || "";
                            const selectedMem = teamMembers.find(m => 
                              (m.userId === selectedId || m.id === selectedId) ||
                              (m.displayName === selectedId || m.userDisplayName === selectedId || m.name === selectedId || m.email === selectedId)
                            );
                            const selectedName = selectedMem 
                              ? (selectedMem.userDisplayName || selectedMem.displayName || selectedMem.name || selectedMem.userEmail || selectedMem.email || selectedId) 
                              : (selectedId || "Unassigned");
                            const isMeDisplay = selectedName === currentDisplayName;

                            return (
                              <>
                                <div style={{ width: 28, height: 28, borderRadius: "50%", background: getSenderColor(selectedName), display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontSize: 11, fontWeight: 700, flexShrink: 0 }}>
                                  {getInitials(selectedName)}
                                </div>
                                <div style={{ flex: 1, position: "relative" }}>
                                  {(!isApproved) ? (
                                    <div className="custom-dropdown-container" onClick={(e) => e.stopPropagation()}>
                                      <button
                                        type="button"
                                        onClick={() => {
                                          setOpenAssigneeDropdownIdx(openAssigneeDropdownIdx === idx ? null : idx);
                                          setAssigneeSearchQuery("");
                                        }}
                                        style={{
                                          display: "flex", justifyContent: "space-between", alignItems: "center", gap: 6,
                                          padding: "2px 6px", margin: "-2px -6px", fontSize: 12, fontWeight: 600, color: "#0f172a",
                                          borderRadius: 4, border: "1px solid transparent", cursor: "pointer",
                                          background: openAssigneeDropdownIdx === idx ? "#f1f5f9" : "transparent",
                                          transition: "background 0.2s"
                                        }}
                                        onMouseEnter={e => e.currentTarget.style.background = "#f8fafc"}
                                        onMouseLeave={e => e.currentTarget.style.background = openAssigneeDropdownIdx === idx ? "#f1f5f9" : "transparent"}
                                      >
                                        <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
                                          {selectedName}
                                          {isMeDisplay && <span style={{ fontSize: 10, background: "#e2e8f0", color: "#475569", padding: "2px 6px", borderRadius: 10, fontWeight: 600 }}>Me</span>}
                                        </span>
                                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#64748b" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M6 9l6 6 6-6"/></svg>
                                      </button>
                                      
                                      {openAssigneeDropdownIdx === idx && (
                                        <div style={{ position: "absolute", top: "100%", left: 0, marginTop: 4, background: "#ffffff", border: "1px solid #e2e8f0", borderRadius: 8, boxShadow: "0 10px 15px -3px rgba(0,0,0,0.1)", zIndex: 100, minWidth: 200, overflow: "hidden", display: "flex", flexDirection: "column" }}>
                                          <div style={{ padding: "6px", borderBottom: "1px solid #f1f5f9" }}>
                                            <input 
                                              type="text" autoFocus placeholder="Search members..." 
                                              value={assigneeSearchQuery} onChange={(e) => setAssigneeSearchQuery(e.target.value)} 
                                              style={{ width: "100%", padding: "4px 8px", fontSize: 12, border: "1px solid #e2e8f0", borderRadius: 4, outline: "none" }} 
                                              onClick={(e) => e.stopPropagation()} 
                                            />
                                          </div>
                                          <div style={{ maxHeight: 160, overflowY: "auto", display: "flex", flexDirection: "column" }}>
                                            {Array.from(new Map([{ id: "", displayName: "Unassigned" }, ...teamMembers].map(m => [(m.id || m.userId || m.displayName || m.userDisplayName || "unassigned"), m])).values())
                                              .filter(mem => {
                                                const name = mem.displayName || mem.userDisplayName || mem.name || mem.email || "Unassigned";
                                                return name.toLowerCase().includes(assigneeSearchQuery.toLowerCase());
                                              })
                                              .map(mem => {
                                                const id = mem.id || mem.userId || "";
                                                const name = mem.displayName || mem.userDisplayName || mem.name || mem.email || "Unassigned";
                                                const isSelected = selectedId === id;
                                                const isMe = name === currentDisplayName;
                                                return (
                                                  <button 
                                                    type="button" 
                                                    key={id || name || "unassigned"} 
                                                    onClick={() => { 
                                                      setTaskAssignees(prev => {
                                                        const n = [...prev];
                                                        n[idx] = id;
                                                        return n;
                                                      });
                                                      setOpenAssigneeDropdownIdx(null); 
                                                      setAssigneeSearchQuery(""); 
                                                    }} 
                                                    style={{ padding: "8px 12px", background: isSelected ? "#f8fafc" : "transparent", border: "none", textAlign: "left", fontSize: 12, fontWeight: 500, color: "#0f172a", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "space-between" }} 
                                                    onMouseEnter={e => e.currentTarget.style.background = "#f1f5f9"} 
                                                    onMouseLeave={e => e.currentTarget.style.background = isSelected ? "#f8fafc" : "transparent"}
                                                  >
                                                    <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
                                                      {name}
                                                      {isMe && <span style={{ fontSize: 10, background: "#e2e8f0", color: "#475569", padding: "2px 6px", borderRadius: 10, fontWeight: 600 }}>Me</span>}
                                                    </span>
                                                    {isSelected && <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>}
                                                  </button>
                                                );
                                              })}
                                          </div>
                                        </div>
                                      )}
                                    </div>
                                  ) : (
                                    <div style={{ fontSize: 12, fontWeight: 600, color: "#0f172a" }}>{selectedName}</div>
                                  )}
                                  <div style={{ fontSize: 11, color: "#64748b" }}>Suggested Assignee</div>
                                </div>
                              </>
                            );
                          })()}

                          {/* Action Buttons */}
                          {isApproved ? (
                            <span style={{ fontSize: 11, color: "#15803d", fontWeight: 700, display: "flex", alignItems: "center", gap: 4 }}>
                              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
                              Created
                            </span>
                          ) : (
                            <div style={{ display: "flex", gap: 6 }}>
                              <button
                                type="button"
                                onClick={() => handleApproveTask(selectedItem, idx)}
                                className="task-action-btn approve"
                                disabled={isApproving || !taskTitles[idx]?.trim()}
                              >
                                {isApproving ? "Approving..." : "Approve Task"}
                              </button>
                            </div>
                          )}
                        </div>

                        {/* Editable Fields */}
                        {!isApproved && (
                          <div style={{ display: "flex", flexDirection: "column", gap: 12, marginTop: 4 }}>
                            <div>
                              <input
                                type="text"
                                value={taskTitles[idx] ?? (function(){try{return JSON.parse(actionItem).title}catch{return actionItem}}())}
                                onChange={(e) => setTaskTitles((prev) => { const n = [...prev]; n[idx] = e.target.value; return n; })}
                                className="task-input"
                                placeholder="Task title"
                                style={{ fontWeight: 600 }}
                              />
                            </div>
                            
                            <div>
                              <textarea
                                value={taskDescriptions[idx] ?? ""}
                                onChange={(e) => setTaskDescriptions((prev) => { const n = [...prev]; n[idx] = e.target.value; return n; })}
                                className="task-textarea"
                                placeholder="Task description..."
                                rows={2}
                              />
                            </div>

                            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                              <span style={{ fontSize: 12, fontWeight: 600, color: "#64748b" }}>Priority:</span>
                              <select
                                value={taskPriorities[idx] ?? "MEDIUM"}
                                onChange={(e) => setTaskPriorities((prev) => { const n = [...prev]; n[idx] = e.target.value; return n; })}
                                className="task-select"
                              >
                                <option value="LOW">Low</option>
                                <option value="MEDIUM">Medium</option>
                                <option value="HIGH">High</option>
                              </select>
                            </div>
                          </div>
                        )}
                        
                        {isApproved && (
                          <div style={{ fontSize: 12, color: "#0f172a", fontWeight: 500, padding: "4px 0" }}>
                            {taskTitles[idx]}
                          </div>
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
                  className="btn-outline-danger"
                >
                  {isDeleting ? "Deleting..." : (
                    <>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M3 6h18"></path>
                        <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                      </svg>
                      Delete
                    </>
                  )}
                </button>
                {selectedItem.status === "Pending Approval" ? (
                  <>
                    <button
                      onClick={() => handleReject(selectedItem)}
                      disabled={isArchiving}
                      className="btn-danger"
                      style={{ opacity: isArchiving ? 0.65 : 1, cursor: isArchiving ? "not-allowed" : undefined }}
                    >
                      {isArchiving ? "Archiving…" : "Archive"}
                    </button>
                    {/* Only show Close if no tasks — approve buttons are inline per task */}
                    {(!selectedItem.actionItems || selectedItem.actionItems.length === 0) && (
                      <button onClick={() => setSelectedItem(null)} className="btn-secondary">Close</button>
                    )}
                  </>
                ) : (
                  <>
                    <Link
                      href={`/lead-dashboard/projects/${selectedItem.projectId}`}
                      className="btn-outline-secondary"
                      onClick={() => setSelectedItem(null)}
                    >
                      Open Project Kanban →
                    </Link>
                    <button onClick={() => setSelectedItem(null)} className="btn-secondary">Close</button>
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
  headerRow: { display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: 32 },
  pageTitle: { fontSize: "clamp(28px, 2vw, 36px)", fontWeight: 800, color: "#0f172a", letterSpacing: "-0.5px", marginBottom: 6 },
  pageSub:   { fontSize: "clamp(13px, 1vw, 15px)", color: "#64748b", fontWeight: 500, margin: 0 },
  statGrid:  { display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "24px", marginBottom: 36 },
  statCard:  { padding: "20px 24px", display: "flex", flexDirection: "column", gap: 8, background: "#ffffff", borderRadius: 16, borderWidth: 1, borderStyle: "solid", borderColor: "#e2e8f0", boxShadow: "0 10px 15px -3px rgba(0,0,0,0.05), 0 4px 6px -2px rgba(0,0,0,0.025)" },
  statLabel: { fontSize: 12, fontWeight: 700, color: "#64748b", letterSpacing: "0.5px", textTransform: "uppercase" as const },
  statValue: { fontSize: "clamp(28px, 2.5vw, 36px)", fontWeight: 800, color: "#0f172a", letterSpacing: "-1px", lineHeight: 1 },
  statSub:   { fontSize: 13, color: "#64748b", fontWeight: 500 },
  tableCard: { overflow: "hidden", background: "#ffffff", borderRadius: 16, border: "1px solid #e2e8f0", boxShadow: "0 10px 15px -3px rgba(0,0,0,0.05)" },
  tableHeaderRow: { display: "flex", alignItems: "center", justifyContent: "space-between", padding: "20px 24px", borderBottom: "1px solid #e2e8f0", background: "#f8fafc" },
  sectionLabel: { fontSize: 13, fontWeight: 700, color: "#0f172a", letterSpacing: "0.5px", textTransform: "uppercase" as const, margin: 0 },
  filterTabs: { display: "flex", gap: 8, background: "#f1f5f9", padding: 4, borderRadius: 10 },
  filterTabBtn: { background: "none", border: "none", borderRadius: 6, padding: "6px 16px", fontSize: 13, color: "#64748b", cursor: "pointer", fontWeight: 600, transition: "all 0.2s" },
  filterTabBtnActive: { background: "#ffffff", color: "#0f172a", boxShadow: "0 1px 3px rgba(0,0,0,0.1)" },
  table:     { width: "100%", borderCollapse: "collapse" as const, fontSize: 14 },
  th:        { textAlign: "left" as const, padding: "16px 24px", fontSize: 12, fontWeight: 700, color: "#64748b", borderBottom: "1px solid #e2e8f0", background: "#ffffff", textTransform: "uppercase" as const, letterSpacing: "0.5px" },
  tr:        { borderBottom: "1px solid #e2e8f0", cursor: "pointer", transition: "background 0.2s" },
  td:        { padding: "18px 24px", color: "#334155", fontSize: 14, verticalAlign: "middle" as const },
  topicName: { fontWeight: 700, color: "#0f172a", fontSize: 15 },
  topicSub:  { fontSize: 12, color: "#64748b", fontWeight: 500, marginTop: 4 },
  confidenceBadge: { fontSize: 11, fontWeight: 700, color: "#15803d", background: "#dcfce7", border: "1px solid #bbf7d0", padding: "2px 8px", borderRadius: 12 },
  badge:     { fontSize: 11, fontWeight: 700, padding: "4px 10px", borderRadius: 12, display: "inline-flex", alignItems: "center", justifyContent: "center" },
  badgeDone: { background: "#10b981", color: "#ffffff", border: "1px solid #059669" },
  badgePending: { background: "#fffbeb", color: "#d97706", border: "1px solid #fde68a" },
  badgeArchived: { background: "#f1f5f9", color: "#64748b", border: "1px solid #e2e8f0" },
  toastSuccess: { background: "#f0fdf4", border: "1px solid #bbf7d0", borderRadius: 8, padding: "12px 20px", marginBottom: 24, fontSize: 14, color: "#15803d", fontWeight: 600, boxShadow: "0 4px 6px -1px rgba(0,0,0,0.05)" },
  toastError: { background: "#fef2f2", border: "1px solid #fecaca", borderRadius: 8, padding: "12px 20px", marginBottom: 24, fontSize: 14, color: "#dc2626", fontWeight: 600, boxShadow: "0 4px 6px -1px rgba(0,0,0,0.05)" },
};

const m: Record<string, React.CSSProperties> = {
  overlay:  { position: "fixed" as const, inset: 0, background: "rgba(15, 23, 42, 0.6)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 400, padding: 24, backdropFilter: "blur(2px)" },
  modal:    { background: "#fafafa", border: "1px solid rgba(0,0,0,0.06)", borderRadius: 16, width: "100%", maxWidth: 640, boxShadow: "0 20px 40px rgba(0,0,0,0.14), 0 4px 12px rgba(0,0,0,0.06)", display: "flex", flexDirection: "column" as const, maxHeight: "90vh" },
  header:   { padding: "20px 28px", borderBottom: "1px solid rgba(226, 232, 240, 0.8)", display: "flex", alignItems: "center", justifyContent: "space-between", background: "#ffffff", borderRadius: "16px 16px 0 0" },
  title:    { fontSize: 18, fontWeight: 700, margin: 0, background: "linear-gradient(135deg, #8b5cf6, #3b82f6)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" },
  body:     { padding: "28px", display: "flex", flexDirection: "column" as const, gap: 24, overflowY: "auto" as const },
  section:  { display: "flex", flexDirection: "column" as const, gap: 10 },
  label:    { fontSize: 13, fontWeight: 700, color: "#0f172a", letterSpacing: "0.2px", textTransform: "uppercase" as const, display: "block" },
  text:     { fontSize: 14, lineHeight: 1.6, color: "#334155", margin: 0, padding: "20px", background: "#ffffff", borderRadius: 12, border: "1px solid #e2e8f0", boxShadow: "0 2px 4px rgba(0,0,0,0.02)" },
  footer:   { padding: "16px 24px", borderTop: "1px solid #e2e8f0", background: "#ffffff", display: "flex", alignItems: "center", justifyContent: "space-between", borderRadius: "0 0 16px 16px" },
  input:      { width: "100%", boxSizing: "border-box" as const, padding: "10px 14px", border: "1px solid #e2e8f0", borderRadius: 8, fontSize: 13, fontFamily: "var(--font)", background: "#ffffff", color: "#0f172a", outline: "none", transition: "border 0.2s ease", boxShadow: "inset 0 1px 2px rgba(0,0,0,0.02)" },
};
