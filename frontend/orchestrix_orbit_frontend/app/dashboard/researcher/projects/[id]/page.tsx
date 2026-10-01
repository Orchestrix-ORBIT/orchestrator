"use client";

import React, { useState, useEffect, use, useCallback, useRef } from "react";
import Link from "next/link";
import { ProjectsService } from "@/lib/services/projects";
import { TasksService, type TaskStatus } from "@/lib/services/tasks";
import { getUserId } from "@/lib/auth";
import { useTasksRealtime } from "@/lib/useTasksRealtime";

type Priority = "LOW" | "MEDIUM" | "HIGH";

interface TaskItem {
  id: string;
  title: string;
  description: string;
  status: TaskStatus;
  assigneeId?: string;
  assignee: string;
  priority: Priority;
  dueDate: string;
}

const COLUMNS: { id: TaskStatus; title: string }[] = [
  { id: "TODO",        title: "To Do" },
  { id: "IN_PROGRESS", title: "In Progress" },
  { id: "DONE",        title: "Completed (Pending Review)" },
  { id: "ACCEPTED",    title: "Accepted ✓" },
];

function getInitials(name: string) {
  if (!name || name === "Unassigned") return "UA";
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export default function ResearcherProjectWorkspacePage({ params }: { params: Promise<{ id: string }> }) {
  const { id: projectId } = use(params);

  const [project, setProject]   = useState<any>(null);
  const [tasks, setTasks]       = useState<TaskItem[]>([]);
  const [members, setMembers]   = useState<any[]>([]);
  const [loading, setLoading]   = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  // Drag & drop
  const [draggedTaskId, setDraggedTaskId] = useState<string | null>(null);
  const [dragOverCol, setDragOverCol]     = useState<TaskStatus | null>(null);

  // Current user for ownership checks
  const currentUserId = getUserId() || "";

  // Task detail modal
  const [selectedTask, setSelectedTask]   = useState<TaskItem | null>(null);


  useEffect(() => {
    async function loadData() {
      try {
        const proj = await ProjectsService.getById(projectId).catch(() => ({
          id: projectId, name: `Project ${projectId.substring(0, 8)}`,
          status: "ACTIVE" as const, teamId: undefined as string | undefined,
        }));
        setProject(proj);

        const [taskList, teamMembers] = await Promise.all([
          TasksService.getByProject(projectId).catch(() => []),
          proj.teamId ? (await import("@/lib/services/teams")).TeamsService.getTeamMembers(proj.teamId).catch(() => []) : Promise.resolve([]),
        ]);

        setMembers(teamMembers as any[]);

        const mapped: TaskItem[] = (taskList as any[]).map((t: any) => {
          let uiStatus: TaskStatus = "TODO";
          if (t.status === "ACCEPTED") uiStatus = "ACCEPTED";
          else if (t.status === "DONE") uiStatus = "DONE";
          else if (t.status === "IN_PROGRESS") uiStatus = "IN_PROGRESS";

          const matchedMember = (teamMembers as any[]).find((m: any) => (m.userId || m.id) === t.assigneeId);
          const assigneeName = matchedMember
            ? (matchedMember.displayName || matchedMember.userDisplayName || matchedMember.email)
            : t.assigneeId ? t.assigneeId : "Unassigned";

          return {
            id: t.id,
            title: t.title,
            description: t.description || "",
            status: uiStatus,
            assigneeId: t.assigneeId,
            assignee: assigneeName,
            priority: (t.priority === "URGENT" || t.priority === "CRITICAL") ? "HIGH" : (t.priority || "MEDIUM"),
            dueDate: t.dueDate ? new Date(t.dueDate).toLocaleDateString() : (t.createdAt ? new Date(t.createdAt).toLocaleDateString() : "Active"),
          };
        });
        setTasks(mapped);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [projectId]);

  // ── Realtime polling: merge remote status changes every 8s ───────────────
  // Store members in a ref so the callback doesn't re-create on every render
  const membersRef = useRef<any[]>([]);
  useEffect(() => { membersRef.current = members; }, [members]);

  const handleRemoteUpdate = useCallback((remoteTasks: any[]) => {
    setTasks(prev => {
      const map = new Map(remoteTasks.map(t => [t.id, t]));
      const updated = prev.map(local => {
        const remote = map.get(local.id);
        if (!remote) return local;
        // Only patch status/assignee if they changed remotely
        if (remote.status === local.status && remote.assigneeId === local.assigneeId) return local;
        let uiStatus: TaskStatus = "TODO";
        if (remote.status === "ACCEPTED") uiStatus = "ACCEPTED";
        else if (remote.status === "DONE") uiStatus = "DONE";
        else if (remote.status === "IN_PROGRESS") uiStatus = "IN_PROGRESS";
        const match = membersRef.current.find((m: any) => (m.userId || m.id) === remote.assigneeId);
        const assigneeName = match
          ? (match.displayName || match.userDisplayName || match.email)
          : remote.assigneeId ? remote.assigneeId : "Unassigned";
        return { ...local, status: uiStatus, assigneeId: remote.assigneeId, assignee: assigneeName };
      });
      // Append brand-new tasks created by other members
      const existingIds = new Set(prev.map(t => t.id));
      const newItems: any[] = remoteTasks
        .filter(t => !existingIds.has(t.id))
        .map((t: any) => {
          let uiStatus: TaskStatus = "TODO";
          if (t.status === "ACCEPTED") uiStatus = "ACCEPTED";
          else if (t.status === "DONE") uiStatus = "DONE";
          else if (t.status === "IN_PROGRESS") uiStatus = "IN_PROGRESS";
          const match = membersRef.current.find((m: any) => (m.userId || m.id) === t.assigneeId);
          return {
            id: t.id, title: t.title, description: t.description || "",
            status: uiStatus, assigneeId: t.assigneeId,
            assignee: match ? (match.displayName || match.email) : t.assigneeId || "Unassigned",
            priority: (t.priority === "URGENT" || t.priority === "CRITICAL") ? "HIGH" : (t.priority || "MEDIUM"),
            dueDate: t.dueDate ? new Date(t.dueDate).toLocaleDateString() : "Active",
          };
        });
      return newItems.length > 0 ? [...updated, ...newItems] : updated;
    });
  }, []);

  useTasksRealtime([projectId], handleRemoteUpdate);

  const currentProject = project || { id: projectId, name: `Project ${projectId.substring(0, 8)}`, status: "ACTIVE" };
  const isCompleted = currentProject.status === "COMPLETED";

  const totalCount = tasks.length;
  const doneCount = tasks.filter(t => t.status === "ACCEPTED").length;
  const progressPct = totalCount > 0 ? Math.round((doneCount / totalCount) * 100) : 0;

  const filteredTasks = tasks.filter(t =>
    !searchQuery || t.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Ownership check — researcher can only edit tasks assigned to them
  function isOwnTask(task: TaskItem) {
    return task.assigneeId === currentUserId;
  }

  const handleMoveTask = async (taskId: string, target: TaskStatus) => {
    const task = tasks.find(t => t.id === taskId);
    if (!task || !isOwnTask(task)) return;  // view-only for others' tasks
    if (target === "ACCEPTED") return;       // only leads can accept
    setTasks(prev => prev.map(t => t.id === taskId ? { ...t, status: target } : t));
    try { await TasksService.update(projectId, taskId, { status: target as any }); }
    catch { setTasks(prev => prev.map(t => t.id === taskId ? { ...t } : t)); }
  };


  if (loading) return <p style={{ padding: 40, color: "#888", fontSize: 14 }}>Loading workspace…</p>;

  return (
    <div>
      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div style={s.header}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4 }}>
            <Link href="/dashboard/researcher/projects" style={{ fontSize: 12, color: "#888", textDecoration: "none" }}>
              ← My Projects
            </Link>
            <span style={{ color: "#ccc" }}>/</span>
            <span style={{ fontSize: 12, color: "#444", fontWeight: 600 }}>{currentProject.name}</span>
          </div>
          <h1 style={s.title}>{currentProject.name}</h1>
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginTop: 6 }}>
            <span style={{ fontSize: 11, fontWeight: 600, color: "#374151", background: "#f3f4f6", padding: "2px 8px", borderRadius: 4 }}>
              📋 {doneCount}/{totalCount} tasks done
            </span>
            <div style={{ width: 80, height: 4, background: "#e5e7eb", borderRadius: 2 }}>
              <div style={{ width: `${progressPct}%`, height: "100%", background: "#161616", borderRadius: 2, transition: "width 0.3s" }} />
            </div>
            <span style={{ fontSize: 11, color: "#888" }}>{progressPct}%</span>
          </div>
        </div>
        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
          <input
            placeholder="Filter cards…"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            style={s.searchInput}
          />
        </div>
      </div>

      {/* ── Kanban Board ───────────────────────────────────────────────────── */}
      <div style={s.kanbanGrid}>
        {COLUMNS.map(col => {
          const colTasks = filteredTasks.filter(t => t.status === col.id);
          const isOver = dragOverCol === col.id;
          return (
            <div
              key={col.id}
              onDragOver={e => { if (col.id !== "ACCEPTED") e.preventDefault(); }}
              onDragEnter={() => { if (col.id !== "ACCEPTED") setDragOverCol(col.id); }}
              onDragLeave={() => setDragOverCol(null)}
              onDrop={e => {
                e.preventDefault();
                if (col.id === "ACCEPTED") return; // researchers cannot accept
                const id = e.dataTransfer.getData("text/plain") || draggedTaskId;
                if (id) {
                  const t = tasks.find(tk => tk.id === id);
                  if (t && isOwnTask(t)) handleMoveTask(id, col.id);
                }
                setDragOverCol(null); setDraggedTaskId(null);
              }}
              style={{ ...s.column, ...(isOver ? s.columnOver : {}) }}
            >
              {/* Column Header */}
              <div style={s.colHeader}>
                <span style={s.colTitle}>{col.title}</span>
                <span style={s.colCount}>{colTasks.length}</span>
              </div>

              {/* Tasks */}
              <div style={s.taskList}>
                {colTasks.map(task => {
                  const canEdit = isOwnTask(task);
                  return (
                  <div
                    key={task.id}
                    draggable={canEdit && !isCompleted && col.id !== "ACCEPTED"}
                    onClick={() => setSelectedTask(task)}
                    onDragStart={e => {
                      if (!canEdit) { e.preventDefault(); return; }
                      setDraggedTaskId(task.id);
                      e.dataTransfer.setData("text/plain", task.id);
                    }}
                    onDragEnd={() => { setDraggedTaskId(null); setDragOverCol(null); }}
                    style={{
                      ...s.taskCard,
                      cursor: "pointer",
                      opacity: canEdit ? 1 : 0.75,
                      borderLeft: canEdit ? undefined : "3px solid #e0e0e0",
                    }}
                  >
                    {/* Card Top */}
                    <div style={s.taskCardTop}>
                      <span style={s.taskId} title={`Full ID: ${task.id}`}>
                        #{task.id.length > 8 ? task.id.substring(0, 8) : task.id}
                      </span>
                      <span style={{ ...s.priorityBadge, ...(task.priority === "HIGH" ? s.priHigh : task.priority === "MEDIUM" ? s.priMed : s.priLow) }}>
                        {task.priority}
                      </span>
                    </div>

                    <h4 style={s.taskTitle}>{task.title}</h4>
                    {task.description && <p style={s.taskDesc}>{task.description}</p>}

                    {/* Card Bottom */}
                    <div style={s.taskCardBottom}>
                      <span style={s.taskDue}>{task.dueDate}</span>
                      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                        {canEdit && !isCompleted && col.id !== "ACCEPTED" && (
                          <select
                            value={task.status}
                            onClick={e => e.stopPropagation()}
                            onChange={e => { e.stopPropagation(); handleMoveTask(task.id, e.target.value as TaskStatus); }}
                            style={s.statusSelect}
                          >
                            <option value="TODO">To Do</option>
                            <option value="IN_PROGRESS">In Progress</option>
                            <option value="DONE">Completed (Pending Review)</option>
                          </select>
                        )}
                        {!canEdit && col.id !== "ACCEPTED" && (
                          <span style={{ fontSize: 10, color: "#9e9e9e", fontStyle: "italic" }}>view only</span>
                        )}
                        {col.id === "ACCEPTED" && <span style={s.completedBadge}>✓ Accepted</span>}
                        <span
                          style={{
                            ...s.assigneeAvatar,
                            background: task.assignee === "Unassigned" ? "#f0f0f0" : "#161616",
                            color: task.assignee === "Unassigned" ? "#757575" : "#ffffff",
                            border: task.assignee === "Unassigned" ? "1px solid #d0d0d0" : "none",
                          }}
                          title={`Assignee: ${task.assignee}`}
                          onClick={e => { e.stopPropagation(); setSelectedTask(task); }}
                        >
                          {getInitials(task.assignee)}
                        </span>
                      </div>
                    </div>
                  </div>
                  );
                })}

                {colTasks.length === 0 && (
                  <div style={s.emptyCol}>No tasks in this column</div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* ── Task Detail Modal ───────────────────────────────────────────────── */}
      {selectedTask && (
        <div style={m.overlay} onClick={() => setSelectedTask(null)}>
          <div style={{ ...m.modal, maxWidth: 560, borderRadius: 10, overflow: "hidden" }} onClick={e => e.stopPropagation()}>
            <div style={{ ...m.header, background: "#fcfcfc", borderBottom: "1px solid #eee", padding: "18px 24px" }}>
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <h3 style={{ ...m.title, fontSize: 17, fontWeight: 700 }}>📋 Task Card Details</h3>
                  <span style={{ fontSize: 11, fontFamily: "monospace", color: "#666", background: "#f0f0f0", padding: "2px 8px", borderRadius: 4, fontWeight: 600 }}>
                    #{selectedTask.id.substring(0, 8)}
                  </span>
                </div>
                <p style={{ fontSize: 11, color: "#9e9e9e", marginTop: 4 }}>
                  Full ID: <code style={{ background: "#f5f5f5", padding: "1px 5px", borderRadius: 3, fontSize: 11 }}>{selectedTask.id}</code>
                </p>
              </div>
              <button onClick={() => setSelectedTask(null)} style={m.closeBtn}>✕</button>
            </div>

            <div style={{ ...m.body, padding: "20px 24px", display: "flex", flexDirection: "column", gap: 16 }}>
              <div>
                <span style={{ ...m.label, fontSize: 10, letterSpacing: "0.8px", color: "#9e9e9e", fontWeight: 700 }}>TASK TITLE</span>
                <p style={{ fontSize: 15, fontWeight: 700, color: "#161616", marginTop: 4, lineHeight: 1.4 }}>{selectedTask.title}</p>
              </div>

              <div style={{ background: "#f9fafb", border: "1px solid #f0f0f0", borderRadius: 6, padding: "12px 14px" }}>
                <span style={{ ...m.label, fontSize: 10, letterSpacing: "0.8px", color: "#9e9e9e", fontWeight: 700 }}>DESCRIPTION</span>
                <p style={{ fontSize: 13, color: "#424242", lineHeight: 1.5, marginTop: 4 }}>
                  {selectedTask.description || "No description provided for this task card."}
                </p>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12, background: "#ffffff", border: "1px solid #e8e8e8", borderRadius: 8, padding: "12px 14px" }}>
                {/* Status */}
                <div>
                  <span style={{ ...m.label, fontSize: 10, letterSpacing: "0.8px", color: "#9e9e9e", fontWeight: 700 }}>STATUS</span>
                  <div style={{ marginTop: 4 }}>
                    <span style={{
                      fontSize: 11, fontWeight: 700, padding: "3px 8px", borderRadius: 12, display: "inline-block",
                      background: selectedTask.status === "ACCEPTED" ? "#e8f5e9" : selectedTask.status === "DONE" ? "#f3e8ff" : selectedTask.status === "IN_PROGRESS" ? "#e3f2fd" : "#f5f5f5",
                      color: selectedTask.status === "ACCEPTED" ? "#2e7d32" : selectedTask.status === "DONE" ? "#6b21a8" : selectedTask.status === "IN_PROGRESS" ? "#1565c0" : "#616161",
                    }}>
                      {selectedTask.status === "ACCEPTED" ? "Accepted ✓" : selectedTask.status === "DONE" ? "Pending Review" : selectedTask.status === "IN_PROGRESS" ? "In Progress" : "To Do"}
                    </span>
                  </div>
                </div>
                {/* Assignee */}
                <div>
                  <span style={{ ...m.label, fontSize: 10, letterSpacing: "0.8px", color: "#9e9e9e", fontWeight: 700 }}>ASSIGNEE</span>
                  <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 4 }}>
                    <span style={{ width: 22, height: 22, borderRadius: 11, background: selectedTask.assignee === "Unassigned" ? "#e0e0e0" : "#161616", color: selectedTask.assignee === "Unassigned" ? "#616161" : "#ffffff", fontSize: 9, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center" }}>
                      {getInitials(selectedTask.assignee)}
                    </span>
                    <span style={{ fontSize: 12, fontWeight: 600, color: "#161616" }}>{selectedTask.assignee}</span>
                  </div>
                </div>
                {/* Priority */}
                <div>
                  <span style={{ ...m.label, fontSize: 10, letterSpacing: "0.8px", color: "#9e9e9e", fontWeight: 700 }}>PRIORITY</span>
                  <div style={{ marginTop: 4 }}>
                    <span style={{
                      fontSize: 10, fontWeight: 700, padding: "3px 8px", borderRadius: 3, display: "inline-block",
                      background: selectedTask.priority === "HIGH" ? "#fde8e8" : selectedTask.priority === "MEDIUM" ? "#fff8e1" : "#f5f5f5",
                      color: selectedTask.priority === "HIGH" ? "#c62828" : selectedTask.priority === "MEDIUM" ? "#f57f17" : "#616161",
                    }}>
                      {selectedTask.priority}
                    </span>
                  </div>
                </div>
              </div>

              <div style={{ background: "#fafafa", border: "1px solid #eee", borderRadius: 6, padding: "12px 14px" }}>
                <span style={{ ...m.label, fontSize: 10, letterSpacing: "0.8px", color: "#9e9e9e", fontWeight: 700 }}>🕒 ACTIVITY LOG</span>
                <p style={{ fontSize: 12, color: "#616161", lineHeight: 1.5, marginTop: 4 }}>
                  Task active since {selectedTask.dueDate || "recent sprint"}. All updates are synchronized in real-time across team workspaces.
                </p>
              </div>
            </div>

            <div style={{ padding: "14px 24px 18px", borderTop: "1px solid #eee", display: "flex", justifyContent: "flex-end" }}>
              <button onClick={() => setSelectedTask(null)} style={m.btnPrimary}>Close Details</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const s: Record<string, React.CSSProperties> = {
  header: { display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 24 },
  title: { fontSize: 22, fontWeight: 700, color: "#161616", marginBottom: 4 },
  searchInput: { padding: "8px 28px 8px 14px", fontSize: 13, border: "1px solid #d0d0d0", borderRadius: 6, width: 200, outline: "none", background: "#ffffff" },
  btnPrimary: { padding: "9px 16px", background: "#161616", color: "#ffffff", border: "none", borderRadius: 6, fontSize: 13, fontWeight: 600, cursor: "pointer" },
  kanbanGrid: { display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16, alignItems: "flex-start" },
  column: { background: "#ffffff", border: "1px solid #e0e0e0", borderRadius: 6, padding: "16px", minHeight: 450, display: "flex", flexDirection: "column" },
  columnOver: { background: "#f9f9f9", borderColor: "#9e9e9e" },
  colHeader: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14, paddingBottom: 10, borderBottom: "1px solid #eeeeee" },
  colTitle: { fontSize: 11, fontWeight: 600, color: "#9e9e9e", letterSpacing: "0.5px", textTransform: "uppercase" as const },
  colCount: { fontSize: 11, fontWeight: 700, color: "#161616", background: "#f0f0f0", padding: "2px 6px", borderRadius: 10 },
  taskList: { display: "flex", flexDirection: "column", gap: 10, flex: 1 },
  taskCard: { background: "#ffffff", border: "1px solid #e0e0e0", borderRadius: 4, padding: "14px 16px", boxShadow: "0 1px 2px rgba(0,0,0,0.02)" },
  taskCardTop: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 },
  taskId: { fontSize: 11, fontWeight: 600, color: "#9e9e9e", fontFamily: "monospace" },
  priorityBadge: { fontSize: 10, fontWeight: 600, padding: "2px 5px", borderRadius: 3 },
  priHigh: { background: "#fde8e8", color: "#c62828" },
  priMed: { background: "#fff8e1", color: "#f57f17" },
  priLow: { background: "#f5f5f5", color: "#616161" },
  taskTitle: { fontSize: 13, fontWeight: 600, color: "#161616", lineHeight: 1.3, marginBottom: 6 },
  taskDesc: { fontSize: 12, color: "#616161", lineHeight: 1.4, marginBottom: 12 },
  taskCardBottom: { display: "flex", justifyContent: "space-between", alignItems: "center", paddingTop: 10, borderTop: "1px solid #f5f5f5" },
  taskDue: { fontSize: 11, color: "#9e9e9e" },
  statusSelect: { fontSize: 11, padding: "3px 6px", border: "1px solid #d0d0d0", borderRadius: 3, background: "#ffffff", color: "#424242", cursor: "pointer" },
  completedBadge: { fontSize: 11, fontWeight: 600, color: "#2e7d32" },
  assigneeAvatar: { width: 24, height: 24, borderRadius: 12, background: "#161616", color: "#ffffff", fontSize: 10, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center", letterSpacing: "0.5px", flexShrink: 0, cursor: "pointer" },
  emptyCol: { padding: "24px 12px", textAlign: "center" as const, fontSize: 12, color: "#9e9e9e", border: "1px dashed #d0d0d0", borderRadius: 4 },
};

const m: Record<string, React.CSSProperties> = {
  overlay: { position: "fixed" as const, inset: 0, background: "rgba(0,0,0,0.4)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 100, padding: 20 },
  modal: { background: "#ffffff", border: "1px solid #e0e0e0", borderRadius: 6, width: "100%", maxWidth: 520, boxShadow: "0 10px 25px rgba(0,0,0,0.1)" },
  header: { padding: "18px 24px", borderBottom: "1px solid #eeeeee", display: "flex", alignItems: "center", justifyContent: "space-between" },
  title: { fontSize: 16, fontWeight: 700, color: "#161616" },
  closeBtn: { background: "none", border: "none", fontSize: 15, color: "#9e9e9e", cursor: "pointer" },
  body: { padding: "20px 24px", display: "flex", flexDirection: "column", gap: 14 },
  label: { fontSize: 11, fontWeight: 600, color: "#9e9e9e", letterSpacing: "0.5px", display: "block" },
  field: { display: "flex", flexDirection: "column", gap: 6 },
  input: { padding: "8px 12px", fontSize: 13, border: "1px solid #d0d0d0", borderRadius: 4, outline: "none" },
  textarea: { padding: "8px 12px", fontSize: 13, border: "1px solid #d0d0d0", borderRadius: 4, outline: "none", resize: "none" },
  select: { padding: "8px 12px", fontSize: 13, border: "1px solid #d0d0d0", borderRadius: 4, background: "#ffffff", outline: "none" },
  footer: { display: "flex", gap: 8, paddingTop: 10 },
  btnPrimary: { padding: "8px 16px", background: "#161616", color: "#ffffff", border: "none", borderRadius: 4, fontSize: 13, fontWeight: 600, cursor: "pointer" },
  btnSecondary: { padding: "8px 14px", background: "#ffffff", color: "#424242", border: "1px solid #d0d0d0", borderRadius: 4, fontSize: 13, fontWeight: 500, cursor: "pointer" },
};
