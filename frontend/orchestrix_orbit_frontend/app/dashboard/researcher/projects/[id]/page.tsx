"use client";

import React, { useState, useEffect, use, useCallback, useRef } from "react";
import Link from "next/link";
import { ProjectsService } from "@/lib/services/projects";
import { TasksService, type TaskStatus } from "@/lib/services/tasks";
import { getUserId } from "@/lib/auth";
import { useTasksRealtime } from "@/lib/useTasksRealtime";
import LoadingState from "@/components/ui/LoadingState";

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


function CustomStatusSelect({ value, onChange }: { value: TaskStatus, onChange: (val: TaskStatus) => void }) {
  const [open, setOpen] = useState(false);
  const options: {val: TaskStatus, label: string, shortLabel?: string}[] = [
    {val: "TODO", label: "To Do"},
    {val: "IN_PROGRESS", label: "In Progress"},
    {val: "DONE", label: "Completed (Pending Review)", shortLabel: "Review"},
  ];
  
  return (
    <div style={{ position: "relative" }} onClick={(e) => e.stopPropagation()}>
      <div 
        onClick={() => setOpen(!open)}
        style={{
          background: "#f9fafb",
          border: "1px solid #d1d5db",
          fontSize: 10,
          fontWeight: 600,
          color: "#374151",
          padding: "4px 8px",
          borderRadius: 4,
          cursor: "pointer",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          gap: 16,
          boxShadow: "0 1px 2px rgba(0,0,0,0.02)",
          minWidth: 100
        }}
        onMouseOver={(e) => e.currentTarget.style.borderColor = "#9ca3af"}
        onMouseOut={(e) => e.currentTarget.style.borderColor = "#d1d5db"}
      >
        <span>{options.find(o => o.val === value)?.shortLabel || options.find(o => o.val === value)?.label || "To Do"}</span>
        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M6 9l6 6 6-6"/></svg>
      </div>
      {open && (
        <>
          <div style={{position: "fixed", inset: 0, zIndex: 99}} onClick={(e) => { e.stopPropagation(); setOpen(false); }} />
          <div style={{
            position: "absolute", top: "100%", right: 0, marginTop: 4, 
            background: "#ffffff", border: "1px solid #e5e7eb", borderRadius: 6, 
            boxShadow: "0 10px 15px -3px rgba(0,0,0,0.1), 0 4px 6px -2px rgba(0,0,0,0.05)", zIndex: 100, minWidth: 160,
            overflow: "hidden"
          }}>
            {options.map(o => (
              <div 
                key={o.val}
                onClick={(e) => { e.stopPropagation(); onChange(o.val); setOpen(false); }}
                style={{ 
                  padding: "8px 12px", fontSize: 11, fontWeight: 500, color: "#374151",
                  cursor: "pointer", background: value === o.val ? "#f3f4f6" : "#fff", 
                  borderBottom: "1px solid #f3f4f6", transition: "background 0.1s ease" 
                }}
                onMouseOver={(e) => (e.currentTarget.style.background = "#f9fafb")}
                onMouseOut={(e) => (e.currentTarget.style.background = value === o.val ? "#f3f4f6" : "#fff")}
              >
                {o.label}
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

export function CustomToggle({ checked, onChange, label }: { checked: boolean, onChange: (val: boolean) => void, label: string }) {
  return (
    <div 
      onClick={() => onChange(!checked)}
      style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer", userSelect: "none" }}
    >
      <div style={{
        width: 36, height: 20, borderRadius: 16,
        background: checked ? "#161616" : "#e5e7eb",
        position: "relative",
        transition: "background 0.2s ease"
      }}>
        <div style={{
          width: 16, height: 16, borderRadius: "50%", background: "#fff",
          position: "absolute", top: 2, left: checked ? 18 : 2,
          transition: "left 0.2s ease",
          boxShadow: "0 1px 2px rgba(0,0,0,0.1)"
        }} />
      </div>
      <span style={{ fontSize: 13, fontWeight: 500, color: checked ? "#111827" : "#6b7280" }}>{label}</span>
    </div>
  );
}

export default function ResearcherProjectWorkspacePage({ params }: { params: Promise<{ id: string }> }) {
  const { id: projectId } = use(params);

  const [project, setProject]   = useState<any>(null);
  const [tasks, setTasks]       = useState<TaskItem[]>([]);
  const [members, setMembers]   = useState<any[]>([]);
  const [loading, setLoading]   = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [assignedOnly, setAssignedOnly] = useState(false);
  const [pendingMove, setPendingMove] = useState<{ taskId: string; taskTitle: string; from: TaskStatus; to: TaskStatus } | null>(null);

  const STAGE_LABELS: Record<TaskStatus, string> = {
    TODO: "To Do",
    IN_PROGRESS: "In Progress",
    DONE: "Completed (Pending Review)",
    ACCEPTED: "Accepted ✓",
  };


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

  const filteredTasks = tasks.filter(t => {
    const matchesSearch = !searchQuery || t.title.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesAssignee = !assignedOnly || t.assigneeId === currentUserId;
    return matchesSearch && matchesAssignee;
  });

  // Ownership check — researcher can only edit tasks assigned to them
  function isOwnTask(task: TaskItem) {
    return task.assigneeId === currentUserId;
  }

  function requestMove(taskId: string, targetStatus: TaskStatus) {
    if (isCompleted) return;
    const task = tasks.find(t => t.id === taskId);
    if (!task || task.status === targetStatus || !isOwnTask(task)) return;
    if (targetStatus === "ACCEPTED") return; // researchers cannot accept
    setPendingMove({ taskId, taskTitle: task.title, from: task.status, to: targetStatus });
  }


  const handleMoveTask = async (taskId: string, target: TaskStatus) => {
    setPendingMove(null);
    const task = tasks.find(t => t.id === taskId);
    if (!task || !isOwnTask(task)) return;  // view-only for others' tasks
    if (target === "ACCEPTED") return;       // only leads can accept
    setTasks(prev => prev.map(t => t.id === taskId ? { ...t, status: target } : t));
    try { await TasksService.update(projectId, taskId, { status: target as any }); }
    catch { setTasks(prev => prev.map(t => t.id === taskId ? { ...t } : t)); }
  };


  if (loading) {
    return <LoadingState variant="kanban" title="Loading Task Board…" subtitle="Fetching project tasks and assigned team members" />;
  }

  return (
    <div suppressHydrationWarning>
      <div style={s.topNavRow}>
        <Link href="/dashboard/researcher/projects" style={s.backLink}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>
          Back to Projects
        </Link>
      </div>

      <div style={s.headerRow}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 8 }}>
            <h1 style={s.pageTitle}>Task Board</h1>
            <span style={s.projectTag}>
              {currentProject.name} <span style={{ color: "#d1d5db" }}>|</span> ID: {projectId.substring(0,8)}
            </span>
            {isCompleted && (
              <span style={s.readOnlyBadge}>✓ Read-Only Mode (Completed)</span>
            )}
          </div>
          <p style={s.pageSub}>
            {isCompleted
              ? "All archived tasks for this completed project are locked in read-only mode."
              : "Drag cards to transition tasks between stages. Progress updates in real-time."}
          </p>
        </div>

        {/* Progress & Actions */}
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <div style={s.progressBox}>
            <span style={s.progressLabel}>PROGRESS</span>
            <div style={s.progressBarBg}>
              <div
                style={{
                  ...s.progressBarFill,
                  width: `${progressPct}%`,
                  background: progressPct === 100 ? "#2e7d32" : "#161616",
                }}
              />
            </div>
            <span style={s.progressVal}>{progressPct}%</span>
            <span style={s.progressSub}>({doneCount}/{totalCount})</span>
          </div>

          <CustomToggle 
            checked={assignedOnly}
            onChange={setAssignedOnly}
            label="Assigned to me"
          />

          <div style={{ position: "relative", display: "flex", alignItems: "center" }}>
            <svg style={{ position: "absolute", left: 10, color: "#9ca3af" }} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="8"></circle>
              <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
            </svg>
            <input
              type="text"
              placeholder="Filter tasks..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={s.searchInput}
              className="search-input-premium"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                style={{
                  position: "absolute",
                  right: 8,
                  background: "#f3f4f6",
                  border: "none",
                  fontSize: 10,
                  fontWeight: 700,
                  color: "#6b7280",
                  cursor: "pointer",
                  padding: "4px 6px",
                  borderRadius: 4,
                  lineHeight: 1,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center"
                }}
                title="Clear filter"
              >
                ESC
              </button>
            )}
            {!searchQuery && (
              <div style={{
                position: "absolute",
                right: 8,
                background: "transparent",
                border: "1px solid #e5e7eb",
                fontSize: 9,
                fontWeight: 600,
                color: "#9ca3af",
                padding: "2px 6px",
                borderRadius: 4,
                lineHeight: 1,
                pointerEvents: "none"
              }}>
                ⌘F
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Kanban Columns Grid ─────────────────────────────────────────────── */}
      <div style={isCompleted ? s.completedGrid : s.kanbanGrid}>
        {COLUMNS.map((col) => {
          const colTasks = isCompleted
            ? filteredTasks
            : filteredTasks.filter((t) => t.status === col.id);
          const isOver = dragOverCol === col.id;

          return (
            <div
              key={col.id}
              onDragOver={(e) => {
                if (isCompleted) return;
                if (col.id !== "ACCEPTED") e.preventDefault();
                if (dragOverCol !== col.id) setDragOverCol(col.id);
              }}
              onDragEnter={(e) => {
                if (isCompleted) return;
                if (col.id !== "ACCEPTED") e.preventDefault();
                if (dragOverCol !== col.id) setDragOverCol(col.id);
              }}
              onDragLeave={(e) => {
                if (isCompleted) return;
                const related = e.relatedTarget as Node;
                if (!e.currentTarget.contains(related)) {
                  setDragOverCol(null);
                }
              }}
              onDrop={(e) => {
                if (isCompleted) return;
                e.preventDefault();
                if (col.id === "ACCEPTED") return; // researchers cannot accept
                const id = e.dataTransfer.getData("text/plain") || draggedTaskId;
                if (id) requestMove(id, col.id);
                setDragOverCol(null);
                setDraggedTaskId(null);
              }}
              style={{
                ...s.column,
                ...(isOver ? (col.id === "ACCEPTED" ? s.columnOverForbidden : s.columnOver) : {}),
                ...(isCompleted ? s.completedColumn : {}),
              }}
            >
              {/* Column Header */}
              <div style={s.colHeader}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <div style={{ width: 8, height: 8, borderRadius: "50%", background: col.id === "TODO" ? "#d1d5db" : col.id === "IN_PROGRESS" ? "#f59e0b" : col.id === "DONE" ? "#8b5cf6" : "#10b981" }} />
                  <span style={s.colTitle}>
                    {isCompleted ? "All Completed Tasks" : col.title}
                  </span>
                </div>
                <span style={s.colCount}>{colTasks.length}</span>
              </div>

              {/* Tasks List */}
              <div style={isCompleted ? s.completedTasksGrid : s.taskList}>
                {colTasks.map((task) => {
                  const canEdit = isOwnTask(task);
                  return (
                  <div
                    key={task.id}
                    draggable={canEdit && !isCompleted && col.id !== "ACCEPTED"}
                    onClick={() => setSelectedTask(task)}
                    onDragStart={(e) => {
                      if (!canEdit || isCompleted) { e.preventDefault(); return; }
                      setDraggedTaskId(task.id);
                      e.dataTransfer.setData("text/plain", task.id);
                    }}
                    onDragEnd={() => {
                      setDraggedTaskId(null);
                      setDragOverCol(null);
                    }}
                    className="card-depth"
                    style={{
                      ...s.taskCard,
                      cursor: canEdit && !isCompleted && col.id !== "ACCEPTED" ? "grab" : "pointer",
                      background: canEdit ? "#ffffff" : "#f9fafb",
                      opacity: canEdit ? 1 : 0.65,
                      borderLeft: canEdit ? "4px solid #3b82f6" : "4px solid #d1d5db",
                      boxShadow: canEdit ? "0 4px 6px -1px rgba(0,0,0,0.1), 0 2px 4px -1px rgba(0,0,0,0.06)" : "none",
                    }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <span style={s.taskId} title={`Full ID: ${task.id}`}>
                          {task.id.substring(0, 5).toUpperCase()}
                        </span>
                      </div>
                      <span
                        style={{
                          fontSize: 10,
                          fontWeight: 700,
                          padding: "3px 8px",
                          borderRadius: 12,
                          letterSpacing: "0.5px",
                          background: task.priority === "HIGH" ? "#fee2e2" : task.priority === "MEDIUM" ? "#fef3c7" : "#f3f4f6",
                          color: task.priority === "HIGH" ? "#b91c1c" : task.priority === "MEDIUM" ? "#b45309" : "#4b5563",
                          border: `1px solid ${task.priority === "HIGH" ? "#fecaca" : task.priority === "MEDIUM" ? "#fde68a" : "#e5e7eb"}`
                        }}
                      >
                        {task.priority}
                      </span>
                    </div>

                    <div>
                      <h4 style={{ fontSize: 14, fontWeight: 600, color: "#111827", margin: "0 0 4px 0", lineHeight: 1.4 }}>{task.title}</h4>
                      {task.description && <p style={{ fontSize: 13, color: "#6b7280", margin: 0, lineHeight: 1.5, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>{task.description}</p>}
                    </div>

                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", paddingTop: 10, borderTop: "1px solid #f3f4f6" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 6, color: "#9ca3af", fontSize: 11, fontWeight: 500 }}>
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>
                        {task.dueDate}
                      </div>

                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        {isCompleted ? (
                          <span style={s.completedBadge}>✓ Completed</span>
                        ) : (
                          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                            {canEdit && !isCompleted && col.id !== "ACCEPTED" && (
                              <CustomStatusSelect
                                value={task.status}
                                onChange={(val) => requestMove(task.id, val)}
                              />
                            )}
                            {!canEdit && col.id !== "ACCEPTED" && (
                              <span style={{ fontSize: 10, color: "#9ca3af", fontStyle: "italic", paddingRight: 4 }}>view only</span>
                            )}
                            {col.id === "ACCEPTED" && <span style={s.completedBadge}>✓ Accepted</span>}
                          </div>
                        )}

                        <span
                          style={{
                            ...s.assigneeAvatar,
                            background: (!task.assignee || task.assignee === "Unassigned") ? "#f0f0f0" : "#161616",
                            color: (!task.assignee || task.assignee === "Unassigned") ? "#757575" : "#ffffff",
                            border: (!task.assignee || task.assignee === "Unassigned") ? "1px solid #d0d0d0" : "none",
                            cursor: canEdit ? "pointer" : "default",
                          }}
                          title={`Assignee: ${task.assignee}`}
                        >
                          {getInitials(task.assignee)}
                        </span>
                      </div>
                    </div>
                  </div>
                )})}

                {colTasks.length === 0 && (
                  <div style={s.emptyCol}>No tasks in this column</div>

                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* ── Task Details Modal ─────────────────────────────────────────────────── */}
      {selectedTask && (
        <div style={m.overlay} onClick={() => setSelectedTask(null)}>
          <div style={{ ...m.modal, maxWidth: 560, borderRadius: 10, overflow: "hidden" }} onClick={(e) => e.stopPropagation()}>
            <div style={{ padding: "16px 24px", display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid #f3f4f6" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <span style={{ fontSize: 13, fontFamily: "var(--font-mono)", color: "#6b7280", fontWeight: 500 }}>
                  {selectedTask.id.substring(0, 8).toUpperCase()}
                </span>
                {selectedTask.isAiGenerated && (
                  <span style={{ background: "#f5f3ff", color: "#6d28d9", fontSize: 11, fontWeight: 600, padding: "2px 8px", borderRadius: 12 }}>
                    AI Generated
                  </span>
                )}
              </div>
              <button onClick={() => setSelectedTask(null)} style={{ background: "none", border: "none", fontSize: 20, color: "#9ca3af", cursor: "pointer", padding: 0 }}>✕</button>
            </div>

            <div style={{ padding: "24px", display: "flex", flexDirection: "column", gap: 24 }}>
              {/* Task Title */}
              <h2 style={{ fontSize: 22, fontWeight: 700, color: "#111827", margin: 0, lineHeight: 1.3, letterSpacing: "-0.5px" }}>
                {selectedTask.title}
              </h2>

              {/* Metadata Row */}
              <div style={{ display: "flex", flexWrap: "wrap", gap: 24, alignItems: "center" }}>
                {/* Status */}
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{ fontSize: 12, color: "#6b7280", fontWeight: 500 }}>Status</span>
                  <span style={{
                    fontSize: 12, fontWeight: 600, padding: "2px 8px", borderRadius: 12,
                    background: selectedTask.status === "ACCEPTED" ? "#ecfdf5" : selectedTask.status === "DONE" ? "#f5f3ff" : selectedTask.status === "IN_PROGRESS" ? "#eff6ff" : "#f3f4f6",
                    color: selectedTask.status === "ACCEPTED" ? "#059669" : selectedTask.status === "DONE" ? "#7c3aed" : selectedTask.status === "IN_PROGRESS" ? "#2563eb" : "#4b5563"
                  }}>
                    {selectedTask.status === "ACCEPTED" ? "Accepted" : selectedTask.status === "DONE" ? "Completed" : selectedTask.status === "IN_PROGRESS" ? "In Progress" : "To Do"}
                  </span>
                </div>
                
                {/* Assignee */}
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{ fontSize: 12, color: "#6b7280", fontWeight: 500 }}>Assignee</span>
                  <span style={{ fontSize: 13, fontWeight: 500, color: "#111827", padding: "4px 8px", background: "#f3f4f6", borderRadius: 6 }}>
                    {selectedTask.assignee || "Unassigned"}
                  </span>
                </div>

                {/* Priority */}
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{ fontSize: 12, color: "#6b7280", fontWeight: 500 }}>Priority</span>
                  <span style={{
                    fontSize: 11, fontWeight: 700, padding: "4px 8px", borderRadius: 4,
                    background: selectedTask.priority === "HIGH" ? "#fef2f2" : selectedTask.priority === "MEDIUM" ? "#fffbeb" : "#f3f4f6",
                    color: selectedTask.priority === "HIGH" ? "#dc2626" : selectedTask.priority === "MEDIUM" ? "#d97706" : "#4b5563"
                  }}>
                    {selectedTask.priority}
                  </span>
                </div>
              </div>

              {/* Description */}
              <div>
                <p style={{ fontSize: 14, color: selectedTask.description ? "#374151" : "#9ca3af", lineHeight: 1.6, margin: 0, fontStyle: selectedTask.description ? "normal" : "italic" }}>
                  {selectedTask.description || "No description provided."}
                </p>
              </div>

              {/* Activity Log */}
              <div style={{ paddingTop: 16, borderTop: "1px solid #f3f4f6" }}>
                <p style={{ fontSize: 12, color: "#9ca3af", margin: 0 }}>
                  {selectedTask.isAiGenerated
                    ? "✨ Drafted by Orchestrix Context Engine"
                    : `Active since ${selectedTask.dueDate || "recent sprint"}`}
                </p>
              </div>
            </div>

            <div style={{ padding: "0 24px 24px", display: "flex", justifyContent: "flex-end", alignItems: "center" }}>
              <button
                onClick={() => setSelectedTask(null)}
                className="btn-hover-lift"
                style={m.btnPrimary}
              >
                Close Details
              </button>
            </div>
          </div>
        </div>
      )}
      {/* ── Move Confirmation Modal ──────────────────────────────────────────── */}
      {pendingMove && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0, 0, 0, 0.25)", backdropFilter: "blur(4px)", zIndex: 200, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}
          onClick={() => setPendingMove(null)}>
          <div style={{ background: "#ffffff", borderRadius: 16, padding: 32, maxWidth: 400, width: "100%", boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.25)", border: "1px solid rgba(255,255,255,0.1)", textAlign: "center" }}
            onClick={e => e.stopPropagation()}>
            {/* Action Icon */}
            <div style={{ width: 48, height: 48, borderRadius: "50%", background: "#f0f4ff", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 20px" }}>
              <svg 
                style={{ transition: "transform 0.2s", transform: ["TODO", "IN_PROGRESS", "DONE", "ACCEPTED"].indexOf(pendingMove.from) > ["TODO", "IN_PROGRESS", "DONE", "ACCEPTED"].indexOf(pendingMove.to) ? "scaleX(-1)" : "none" }}
                width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#3b5bdb" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M5 12h14M12 5l7 7-7 7"/>
              </svg>
            </div>
            <h3 style={{ fontSize: 18, fontWeight: 700, color: "#111827", margin: "0 0 8px", letterSpacing: "-0.5px" }}>
              Move Task?
            </h3>
            <p style={{ fontSize: 14, color: "#4b5563", margin: "0 0 28px", lineHeight: 1.5 }}>
              You are about to move <strong>&ldquo;{pendingMove.taskTitle}&rdquo;</strong> from{" "}
              <span style={{ fontWeight: 600, color: "#111827" }}>{STAGE_LABELS[pendingMove.from]}</span>{" "}
              to{" "}
              <span style={{ fontWeight: 600, color: "#3b5bdb" }}>{STAGE_LABELS[pendingMove.to]}</span>.
            </p>
            <div style={{ display: "flex", gap: 12 }}>
              <button
                onClick={() => setPendingMove(null)}
                className="btn-secondary-hover"
                style={{ flex: 1, padding: "10px 16px", borderRadius: 8, border: "1px solid #e5e7eb", background: "#ffffff", fontSize: 13, fontWeight: 600, color: "#374151", cursor: "pointer", transition: "all 0.2s" }}
              >Cancel</button>
              <button
                onClick={() => handleMoveTask(pendingMove.taskId, pendingMove.to)}
                className="btn-hover-lift"
                style={{ flex: 1, padding: "10px 16px", borderRadius: 8, border: "none", background: "#111827", fontSize: 13, fontWeight: 600, color: "#fff", cursor: "pointer", transition: "all 0.2s", boxShadow: "0 4px 6px -1px rgba(0,0,0,0.1)" }}
              >Confirm Move</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const s: Record<string, React.CSSProperties> = {
  topNavRow: {
    marginBottom: 24,
  },
  backLink: {
    display: "inline-flex",
    alignItems: "center",
    gap: 6,
    fontSize: 13,
    color: "#6b7280",
    textDecoration: "none",
    fontWeight: 500,
  },
  projectTag: {
    fontSize: 12,
    color: "#4b5563",
    fontWeight: 500,
    background: "#f9fafb",
    border: "1px solid #e5e7eb",
    padding: "4px 10px",
    borderRadius: 12,
    fontFamily: "var(--font-mono)",
  },
  headerRow: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-end",
    marginBottom: 32,
  },
  pageTitle: {
    fontSize: 32,
    fontWeight: 700,
    color: "#111827",
    letterSpacing: "-0.8px",
    margin: 0,
  },
  pageSub: {
    fontSize: 14,
    color: "#6b7280",
    marginTop: 8,
    margin: 0,
  },
  readOnlyBadge: {
    fontSize: 11,
    fontWeight: 600,
    color: "#2e7d32",
    background: "#e8f5e9",
    border: "1px solid #c8e6c9",
    padding: "3px 8px",
    borderRadius: 4,
  },
  progressBox: {
    display: "flex",
    alignItems: "center",
    gap: 8,
    background: "#ffffff",
    border: "1px solid #f3f4f6",
    borderRadius: 4,
    padding: "6px 12px",
  },
  progressLabel: {
    fontSize: 11,
    fontWeight: 600,
    color: "#9e9e9e",
    letterSpacing: "0.5px",
  },
  progressBarBg: {
    width: 80,
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
  progressVal: {
    fontSize: 12,
    fontWeight: 700,
    color: "#111827",
  },
  progressSub: {
    fontSize: 11,
    color: "#9e9e9e",
  },
  searchInput: {
    padding: "8px 36px 8px 34px",
    fontSize: 13,
    border: "1px solid rgba(0,0,0,0.08)",
    borderRadius: 8,
    width: 220,
    outline: "none",
    background: "#f9fafb",
    color: "#111827",
    transition: "all 0.2s ease",
    boxShadow: "inset 0 1px 2px rgba(0,0,0,0.02)",
  },
  btnPrimary: {
    padding: "8px 16px",
    background: "linear-gradient(180deg, #1f2937 0%, #111827 100%)",
    color: "#ffffff",
    border: "1px solid #030712",
    borderRadius: 6,
    fontSize: 13,
    fontWeight: 500,
    cursor: "pointer",
    boxShadow: "0 1px 2px rgba(0, 0, 0, 0.1), inset 0 1px 0 rgba(255,255,255,0.1)",
  },
  kanbanGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(4, 1fr)",
    gap: 16,
    alignItems: "flex-start",
  },
  completedGrid: {
    display: "flex",
    flexDirection: "column",
  },
  column: {
    background: "transparent",
    borderRadius: 8,
    minHeight: "65vh",
    display: "flex",
    flexDirection: "column",
    transition: "background 0.2s, border 0.2s, box-shadow 0.2s",
    border: "2px solid transparent",
  },
  columnOver: {
    background: "rgba(59, 130, 246, 0.04)",
    border: "2px dashed rgba(59, 130, 246, 0.4)",
  },
  columnOverForbidden: {
    background: "rgba(239, 68, 68, 0.04)",
    border: "2px dashed rgba(239, 68, 68, 0.4)",
  },
  completedColumn: {
    background: "transparent",
  },
  colHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
    padding: "0 4px",
  },
  colTitle: {
    fontSize: 13,
    fontWeight: 600,
    color: "#374151",
    letterSpacing: "0.2px",
  },
  colCount: {
    fontSize: 12,
    fontWeight: 600,
    color: "#6b7280",
  },
  taskList: {
    display: "flex",
    flexDirection: "column",
    flex: 1,
  },
  completedTasksGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(3, 1fr)",
    gap: 16,
  },
  taskCard: {
    background: "#ffffff",
    borderTop: "1px solid #f3f4f6",
    borderRight: "1px solid #f3f4f6",
    borderBottom: "1px solid #f3f4f6",
    borderLeft: "1px solid #f3f4f6",
    borderRadius: 10,
    padding: "16px",
    marginBottom: 12,
    display: "flex",
    flexDirection: "column",
    gap: 12,
    boxShadow: "0 2px 4px -1px rgba(0, 0, 0, 0.04), 0 1px 2px -1px rgba(0, 0, 0, 0.02)",
  },
  taskCardTop: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  taskId: {
    fontSize: 11,
    fontWeight: 600,
    color: "#9e9e9e",
    fontFamily: "var(--font-mono)",
  },
  priorityBadge: {
    fontSize: 10,
    fontWeight: 600,
    padding: "2px 5px",
    borderRadius: 3,
  },
  priHigh: { background: "#fde8e8", color: "#c62828" },
  priMed: { background: "#fff8e1", color: "#f57f17" },
  priLow: { background: "#f5f5f5", color: "#616161" },
  taskTitle: {
    fontSize: 14,
    fontWeight: 600,
    color: "#111827",
    lineHeight: 1.3,
    margin: 0,
  },
  taskDesc: {
    fontSize: 13,
    color: "#4b5563",
    lineHeight: 1.5,
    margin: 0,
  },
  taskCardBottom: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    flexWrap: "wrap",
    gap: 8,
    paddingTop: 12,
    borderTop: "1px solid #f9fafb",
  },
  taskDue: { fontSize: 12, color: "#9ca3af", fontWeight: 500 },
  completedBadge: { fontSize: 11, fontWeight: 600, color: "#2e7d32" },
  statusSelect: {
    fontSize: 11,
    padding: "3px 6px",
    border: "1px solid #e5e7eb",
    borderRadius: 4,
    background: "#f9fafb",
    color: "#374151",
    cursor: "pointer",
    fontWeight: 500,
  },
  assigneeAvatar: {
    width: 24,
    height: 24,
    borderRadius: 12,
    background: "#161616",
    color: "#ffffff",
    fontSize: 10,
    fontWeight: 700,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    letterSpacing: "0.5px",
    flexShrink: 0,
    cursor: "default",
  },
  emptyCol: {
    padding: "40px 12px",
    textAlign: "center",
    fontSize: 13,
    fontWeight: 500,
    color: "#9ca3af",
    border: "1px dashed #e5e7eb",
    borderRadius: 10,
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    background: "#fafafa",
  },
};


const m: Record<string, React.CSSProperties> = {
  overlay: { position: "fixed" as const, inset: 0, background: "rgba(0,0,0,0.4)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 100, padding: 20 },
  modal: { background: "#ffffff", border: "1px solid #f3f4f6", borderRadius: 6, width: "100%", maxWidth: 520, boxShadow: "0 10px 25px rgba(0,0,0,0.1)" },
  header: { padding: "18px 24px", borderBottom: "1px solid #eeeeee", display: "flex", alignItems: "center", justifyContent: "space-between" },
  title: { fontSize: 16, fontWeight: 700, color: "#111827" },
  closeBtn: { background: "none", border: "none", fontSize: 15, color: "#9e9e9e", cursor: "pointer" },
  body: { padding: "20px 24px", display: "flex", flexDirection: "column", gap: 14 },
  label: { fontSize: 11, fontWeight: 600, color: "#9e9e9e", letterSpacing: "0.5px", display: "block" },
  field: { display: "flex", flexDirection: "column", gap: 6 },
  input: { padding: "8px 12px", fontSize: 13, border: "1px solid #d0d0d0", borderRadius: 4, outline: "none" },
  textarea: { padding: "8px 12px", fontSize: 13, border: "1px solid #d0d0d0", borderRadius: 4, outline: "none", resize: "none" },
  select: { padding: "8px 12px", fontSize: 13, border: "1px solid #d0d0d0", borderRadius: 4, background: "#ffffff", outline: "none" },
  footer: { display: "flex", gap: 8, paddingTop: 10 },
  btnPrimary: { padding: "8px 16px", background: "#161616", color: "#ffffff", border: "none", borderRadius: 4, fontSize: 13, fontWeight: 600, cursor: "pointer" , boxShadow: "0 4px 6px -1px rgba(17, 24, 39, 0.15)"},
  btnSecondary: { padding: "8px 14px", background: "#ffffff", color: "#374151", border: "1px solid #d0d0d0", borderRadius: 4, fontSize: 13, fontWeight: 500, cursor: "pointer" },
};
