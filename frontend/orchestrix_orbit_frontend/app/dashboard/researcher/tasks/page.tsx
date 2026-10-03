"use client";

import { useEffect, useState, useCallback } from "react";
import LoadingState from "@/components/ui/LoadingState";
import { ProjectsService, type Project } from "@/lib/services/projects";
import { TasksService, type Task, type TaskStatus, type TaskPriority } from "@/lib/services/tasks";
import { TeamsService } from "@/lib/services/teams";
import { getUserId } from "@/lib/auth";
import { useTasksRealtime } from "@/lib/useTasksRealtime";

const COLUMNS: { id: TaskStatus; title: string }[] = [
  { id: "TODO",        title: "To Do" },
  { id: "IN_PROGRESS", title: "In Progress" },
  { id: "DONE",        title: "Completed (Pending Review)" },
  { id: "ACCEPTED",    title: "Accepted ✓" },
];

function getInitials(name?: string): string {
  if (!name || name === "Unassigned") return "UA";
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function priorityColors(p: TaskPriority): React.CSSProperties {
  if (p === "URGENT" || p === "CRITICAL" || p === "HIGH") return { background: "#fde8e8", color: "#c62828" };
  if (p === "MEDIUM") return { background: "#fff8e1", color: "#f57f17" };
  return { background: "#f5f5f5", color: "#616161" };
}

export default function ResearcherTasksPage() {
  const [projects, setProjects]     = useState<Project[]>([]);
  const [tasks, setTasks]           = useState<Task[]>([]);
  const [members, setMembers]       = useState<any[]>([]);
  const [loading, setLoading]       = useState(true);
  const [error, setError]           = useState<string | null>(null);
  const [selectedProject, setSelectedProject] = useState<string>("ALL");
  const [assignedOnly, setAssignedOnly]       = useState<boolean>(true);

  // Drag & drop
  const [draggedTaskId, setDraggedTaskId] = useState<string | null>(null);
  const [dragOverCol, setDragOverCol]     = useState<TaskStatus | null>(null);

  // Task detail modal
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);

  const currentUserId = getUserId() || "";

  // Project IDs list for realtime polling
  const [projectIds, setProjectIds] = useState<string[]>([]);

  useEffect(() => {
    async function load() {
      try {
        const projectList = await ProjectsService.getAll();
        setProjects(projectList);
        setProjectIds(projectList.map(p => p.id));

        // Fetch tasks and team members concurrently
        const teamRequests = projectList.map(p => p.teamId ? TeamsService.getTeamMembers(p.teamId).catch(() => []) : Promise.resolve([]));
        const [taskResults, ...teamResults] = await Promise.all([
          Promise.all(projectList.map(p => TasksService.getByProject(p.id).catch(() => [] as Task[]))),
          ...teamRequests
        ]);

        setTasks(taskResults.flat());
        setMembers(teamResults.flat());
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : "Failed to load tasks");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  // ── Realtime polling: merge remote changes every 8s ─────────────────────
  const handleRemoteUpdate = useCallback((remoteTasks: Task[]) => {
    setTasks(prev => {
      // For each remote task, update status/assignee only if different
      // (preserves local optimistic state for tasks being dragged)
      const map = new Map(remoteTasks.map(t => [t.id, t]));
      const updated = prev.map(t => {
        const remote = map.get(t.id);
        if (!remote) return t;
        // Only update fields that could have changed remotely
        if (remote.status !== t.status || remote.assigneeId !== t.assigneeId) {
          return { ...t, status: remote.status, assigneeId: remote.assigneeId };
        }
        return t;
      });
      // Add any brand-new tasks from other members
      const existingIds = new Set(prev.map(t => t.id));
      const newTasks = remoteTasks.filter(t => !existingIds.has(t.id));
      return newTasks.length > 0 ? [...updated, ...newTasks] : updated;
    });
  }, []);

  useTasksRealtime(projectIds, handleRemoteUpdate);


  const filteredTasks = tasks.filter(t => {
    const matchesProject = selectedProject === "ALL" || t.projectId === selectedProject;
    const matchesAssignee = !assignedOnly || !t.assigneeId || t.assigneeId === currentUserId;
    return matchesProject && matchesAssignee;
  });

  function getAssigneeName(assigneeId?: string) {
    if (!assigneeId) return "Unassigned";
    const match = members.find(m => (m.userId || m.id) === assigneeId);
    return match ? (match.displayName || match.userDisplayName || match.email || assigneeId) : assigneeId;
  }

  // A researcher can only modify tasks assigned to them.
  // They also cannot move a task to ACCEPTED (only leads can accept).
  function isOwnTask(task: Task) {
    return task.assigneeId === currentUserId;
  }

  // Confirmation modal state + helpers
  const [pendingMove, setPendingMove] = useState<{ task: Task; to: TaskStatus } | null>(null);

  const STAGE_LABELS: Record<TaskStatus, string> = {
    TODO: "To Do",
    IN_PROGRESS: "In Progress",
    IN_REVIEW: "In Review",
    DONE: "Completed (Pending Review)",
    ACCEPTED: "Accepted ✓",
    BLOCKED: "Blocked",
  };

  function requestMove(task: Task, newStatus: TaskStatus) {
    if (!isOwnTask(task)) return;
    if (newStatus === "ACCEPTED") return;
    if (task.status === newStatus) return;
    setPendingMove({ task, to: newStatus });
  }

  async function moveTask(task: Task, newStatus: TaskStatus) {
    if (!isOwnTask(task)) return;           // view-only for unassigned tasks
    if (newStatus === "ACCEPTED") return;    // researchers cannot accept
    setPendingMove(null);
    setTasks(prev => prev.map(t => t.id === task.id ? { ...t, status: newStatus } : t));
    try { await TasksService.update(task.projectId, task.id, { status: newStatus }); }
    catch { setTasks(prev => prev.map(t => t.id === task.id ? { ...t, status: task.status } : t)); }
  }


  if (loading) return <LoadingState variant="researcher-tasks" title="Loading Tasks..." subtitle="Fetching your assigned tasks" />;
  if (error)   return <p style={{ padding: 24, color: "#c62828", fontSize: 14 }}>Error: {error}</p>;

  return (
    <div>
      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div style={s.header}>
        <div>
          <h1 style={s.title}>My Tasks</h1>
          <p style={s.sub}>{filteredTasks.length} total task{filteredTasks.length !== 1 ? "s" : ""} across {projects.length} project{projects.length !== 1 ? "s" : ""}</p>
        </div>
        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
          <select
            id="select-project-filter"
            style={s.select}
            value={selectedProject}
            onChange={e => setSelectedProject(e.target.value)}
          >
            <option value="ALL">All Projects</option>
            {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
          <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13, color: "#374151", fontWeight: 500, cursor: "pointer", whiteSpace: "nowrap" }}>
            <input
              type="checkbox"
              checked={assignedOnly}
              onChange={e => setAssignedOnly(e.target.checked)}
              style={{ width: 16, height: 16, cursor: "pointer" }}
            />
            Assigned to me
          </label>
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
                if (col.id === "ACCEPTED") return; // researchers cannot drop to Accepted
                const id = e.dataTransfer.getData("text/plain") || draggedTaskId;
                const task = tasks.find(t => t.id === id);
                if (task && isOwnTask(task)) requestMove(task, col.id);
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
                    id={`task-card-${task.id}`}
                    draggable={canEdit && col.id !== "ACCEPTED"}
                    onClick={() => setSelectedTask(task)}
                    onDragStart={e => {
                      if (!canEdit) { e.preventDefault(); return; }
                      setDraggedTaskId(task.id); e.dataTransfer.setData("text/plain", task.id);
                    }}
                    onDragEnd={() => { setDraggedTaskId(null); setDragOverCol(null); }}
                    style={{
                      ...s.taskCard,
                      cursor: "pointer",
                      opacity: canEdit ? 1 : 0.75,
                      borderLeft: canEdit ? undefined : "3px solid #e0e0e0",
                    }}
                  >
                    {/* Card Top: id + priority */}
                    <div style={s.taskCardTop}>
                      <span style={s.taskId} title={`Full ID: ${task.id}`}>#{task.id.substring(0, 8)}</span>
                      <span style={{ ...s.priorityBadge, ...priorityColors(task.priority) }}>
                        {task.priority}
                      </span>
                    </div>

                    <h4 style={s.taskTitle}>{task.title}</h4>
                    {task.description && <p style={s.taskDesc}>{task.description}</p>}

                    {/* Card Bottom: due + status + avatar */}
                    <div style={s.taskCardBottom}>
                      <span style={s.taskDue}>
                        {task.dueDate ? new Date(task.dueDate).toLocaleDateString() : ""}
                      </span>
                      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                        {/* Only show status select for tasks assigned to the current user, and not on ACCEPTED column */}
                        {canEdit && col.id !== "ACCEPTED" && (
                          <select
                            value={task.status}
                            onClick={e => e.stopPropagation()}
                            onChange={e => { e.stopPropagation(); requestMove(task, e.target.value as TaskStatus); }}
                            style={s.statusSelect}
                          >
                            <option value="TODO">To Do</option>
                            <option value="IN_PROGRESS">In Progress</option>
                            <option value="DONE">Completed (Pending Review)</option>
                          </select>
                        )}
                        {/* View-only indicator for tasks not assigned to this researcher */}
                        {!canEdit && col.id !== "ACCEPTED" && (
                          <span style={{ fontSize: 10, color: "#9e9e9e", fontStyle: "italic" }}>view only</span>
                        )}
                        {col.id === "ACCEPTED" && <span style={s.completedBadge}>✓ Accepted</span>}
                        <span
                          style={{
                            ...s.assigneeAvatar,
                            background: !task.assigneeId ? "#f0f0f0" : "#161616",
                            color: !task.assigneeId ? "#757575" : "#ffffff",
                            border: !task.assigneeId ? "1px solid #d0d0d0" : "none",
                          }}
                          title={`Assignee: ${getAssigneeName(task.assigneeId)}`}
                          onClick={e => { e.stopPropagation(); setSelectedTask(task); }}
                        >
                          {getInitials(getAssigneeName(task.assigneeId))}
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

      {/* ── Move Confirmation Modal ──────────────────────────────────────────── */}
      {pendingMove && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.45)", zIndex: 200, display: "flex", alignItems: "center", justifyContent: "center" }}
          onClick={() => setPendingMove(null)}>
          <div style={{ background: "#ffffff", borderRadius: 12, padding: "28px 32px", maxWidth: 420, width: "90%", boxShadow: "0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)" }}
            onClick={e => e.stopPropagation()}>
            <div style={{ width: 44, height: 44, borderRadius: "50%", background: "#f0f4ff", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 16 }}>
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="#3b5bdb" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M5 10h10M12 7l3 3-3 3"/>
              </svg>
            </div>
            <h3 style={{ fontSize: 16, fontWeight: 700, color: "#111827", margin: "0 0 6px" }}>Move Task?</h3>
            <p style={{ fontSize: 13, color: "#374151", margin: "0 0 18px", lineHeight: 1.5 }}>
              Move <strong>&ldquo;{pendingMove.task.title}&rdquo;</strong> from{" "}
              <span style={{ fontWeight: 600, color: "#555" }}>{STAGE_LABELS[pendingMove.task.status]}</span>{" "}
              →{" "}
              <span style={{ fontWeight: 700, color: "#111827" }}>{STAGE_LABELS[pendingMove.to]}</span>?
            </p>
            <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
              <button
                onClick={() => setPendingMove(null)}
                style={{ padding: "8px 18px", borderRadius: 7, border: "1px solid #d0d0d0", background: "#ffffff", fontSize: 13, fontWeight: 600, color: "#374151", cursor: "pointer" }}
              >Cancel</button>
              <button
                onClick={() => moveTask(pendingMove.task, pendingMove.to)}
                style={{ padding: "8px 18px", borderRadius: 7, border: "none", background: "#161616", fontSize: 13, fontWeight: 700, color: "#fff", cursor: "pointer" }}
              >Confirm Move</button>
            </div>
          </div>
        </div>
      )}

      {/* ── Task Detail Modal ───────────────────────────────────────────────── */}
      {selectedTask && (
        <div style={m.overlay} onClick={() => setSelectedTask(null)}>
          <div style={{ ...m.modal, maxWidth: 560, borderRadius: 10, overflow: "hidden" }} onClick={e => e.stopPropagation()}>
            <div style={{ ...m.header, background: "#fcfcfc", borderBottom: "1px solid #eee", padding: "18px 24px" }}>
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <h3 style={{ ...m.title, fontSize: 17, fontWeight: 700 }}>📋 Task Card Details</h3>
                  <span style={{ fontSize: 11, fontFamily: "var(--font-mono)", color: "#666", background: "#f0f0f0", padding: "2px 8px", borderRadius: 4, fontWeight: 600 }}>
                    #{selectedTask.id.substring(0, 8)}
                  </span>
                </div>
                <p style={{ fontSize: 11, color: "#9e9e9e", marginTop: 4 }}>
                  Full ID: <code style={{ background: "#f5f5f5", padding: "1px 5px", borderRadius: 3, fontSize: 11 }}>{selectedTask.id}</code>
                </p>
              </div>
              <button onClick={() => setSelectedTask(null)} style={m.closeBtn}>✕</button>
            </div>

            <div style={{ ...m.body, display: "flex", flexDirection: "column", gap: 16 }}>
              <div>
                <span style={m.metaLabel}>TASK TITLE</span>
                <p style={{ fontSize: 15, fontWeight: 700, color: "#111827", marginTop: 4, lineHeight: 1.4 }}>{selectedTask.title}</p>
              </div>

              <div style={{ background: "#f9fafb", border: "1px solid #f0f0f0", borderRadius: 6, padding: "12px 14px" }}>
                <span style={m.metaLabel}>DESCRIPTION</span>
                <p style={{ fontSize: 13, color: "#374151", lineHeight: 1.5, marginTop: 4 }}>
                  {selectedTask.description || "No description provided for this task card."}
                </p>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12, background: "#ffffff", border: "1px solid #f3f4f6", borderRadius: 12, padding: "12px 14px" }}>
                <div>
                  <span style={m.metaLabel}>STATUS</span>
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
                <div>
                  <span style={m.metaLabel}>ASSIGNEE</span>
                  <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 4 }}>
                    <span style={{ width: 22, height: 22, borderRadius: 11, background: selectedTask.assigneeId ? "#161616" : "#e0e0e0", color: selectedTask.assigneeId ? "#ffffff" : "#616161", fontSize: 9, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center" }}>
                      {getInitials(getAssigneeName(selectedTask.assigneeId))}
                    </span>
                    <span style={{ fontSize: 12, fontWeight: 600, color: "#111827" }}>{getAssigneeName(selectedTask.assigneeId)}</span>
                  </div>
                </div>
                <div>
                  <span style={m.metaLabel}>PRIORITY</span>
                  <div style={{ marginTop: 4 }}>
                    <span style={{ fontSize: 10, fontWeight: 700, padding: "3px 8px", borderRadius: 3, display: "inline-block", ...priorityColors(selectedTask.priority) }}>
                      {selectedTask.priority}
                    </span>
                  </div>
                </div>
              </div>

              <div style={{ background: "#fafafa", border: "1px solid #eee", borderRadius: 6, padding: "12px 14px" }}>
                <span style={m.metaLabel}>🕒 ACTIVITY LOG</span>
                <p style={{ fontSize: 12, color: "#616161", lineHeight: 1.5, marginTop: 4 }}>
                  Task active since {selectedTask.dueDate ? new Date(selectedTask.dueDate).toLocaleDateString() : selectedTask.createdAt ? new Date(selectedTask.createdAt).toLocaleDateString() : "recent sprint"}. All updates are synchronized in real-time across team workspaces.
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
  title: { fontSize: 22, fontWeight: 700, color: "#111827", marginBottom: 4 },
  sub: { fontSize: 13, color: "#6b7280" },
  select: { padding: "8px 12px", fontSize: 13, border: "1.5px solid #d0d0d0", borderRadius: 6, fontFamily: "inherit", background: "#ffffff" },
  btnPrimary: { padding: "9px 16px", background: "#161616", color: "#ffffff", border: "none", borderRadius: 6, fontSize: 13, fontWeight: 600, cursor: "pointer" , boxShadow: "0 4px 6px -1px rgba(17, 24, 39, 0.15)"},
  kanbanGrid: { display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16, alignItems: "flex-start" },
  column: { background: "#ffffff", border: "1px solid #f3f4f6", borderRadius: 6, padding: "16px", minHeight: 450, display: "flex", flexDirection: "column" },
  columnOver: { background: "#f9f9f9", borderColor: "#9e9e9e" },
  colHeader: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14, paddingBottom: 10, borderBottom: "1px solid #eeeeee" },
  colTitle: { fontSize: 11, fontWeight: 600, color: "#9e9e9e", letterSpacing: "0.5px", textTransform: "uppercase" as const },
  colCount: { fontSize: 11, fontWeight: 700, color: "#111827", background: "#f0f0f0", padding: "2px 6px", borderRadius: 10 },
  taskList: { display: "flex", flexDirection: "column", gap: 10, flex: 1 },
  taskCard: { background: "#ffffff", border: "1px solid #f3f4f6", borderRadius: 4, padding: "14px 16px", boxShadow: "0 1px 2px rgba(0,0,0,0.02)" },
  taskCardTop: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 },
  taskId: { fontSize: 11, fontWeight: 600, color: "#9e9e9e", fontFamily: "var(--font-mono)" },
  priorityBadge: { fontSize: 10, fontWeight: 600, padding: "2px 5px", borderRadius: 3 },
  taskTitle: { fontSize: 13, fontWeight: 600, color: "#111827", lineHeight: 1.3, marginBottom: 6 },
  taskDesc: { fontSize: 12, color: "#616161", lineHeight: 1.4, marginBottom: 12 },
  taskCardBottom: { display: "flex", justifyContent: "space-between", alignItems: "center", paddingTop: 10, borderTop: "1px solid #f5f5f5" },
  taskDue: { fontSize: 11, color: "#9e9e9e" },
  statusSelect: { fontSize: 11, padding: "3px 6px", border: "1px solid #d0d0d0", borderRadius: 3, background: "#ffffff", color: "#374151", cursor: "pointer" },
  completedBadge: { fontSize: 11, fontWeight: 600, color: "#2e7d32" },
  assigneeAvatar: { width: 24, height: 24, borderRadius: 12, background: "#161616", color: "#ffffff", fontSize: 10, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center", letterSpacing: "0.5px", flexShrink: 0, cursor: "pointer" },
  emptyCol: { padding: "24px 12px", textAlign: "center" as const, fontSize: 12, color: "#9e9e9e", border: "1px dashed #d0d0d0", borderRadius: 4 },
};

const m: Record<string, React.CSSProperties> = {
  overlay: { position: "fixed" as const, inset: 0, background: "rgba(0,0,0,0.4)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 100, padding: 20 },
  modal: { background: "#ffffff", border: "1px solid #f3f4f6", borderRadius: 6, width: "100%", maxWidth: 520, boxShadow: "0 10px 25px rgba(0,0,0,0.1)" },
  header: { padding: "18px 24px", borderBottom: "1px solid #eeeeee", display: "flex", alignItems: "center", justifyContent: "space-between" },
  title: { fontSize: 16, fontWeight: 700, color: "#111827" },
  closeBtn: { background: "none", border: "none", fontSize: 15, color: "#9e9e9e", cursor: "pointer" },
  body: { padding: "20px 24px", display: "flex", flexDirection: "column", gap: 14 },
  metaLabel: { fontSize: 10, fontWeight: 700, color: "#9e9e9e", letterSpacing: "0.8px", display: "block" } as React.CSSProperties,
  label: { fontSize: 11, fontWeight: 600, color: "#9e9e9e", letterSpacing: "0.5px", display: "block" },
  field: { display: "flex", flexDirection: "column", gap: 6 },
  input: { padding: "8px 12px", fontSize: 13, border: "1px solid #d0d0d0", borderRadius: 4, outline: "none" },
  textarea: { padding: "8px 12px", fontSize: 13, border: "1px solid #d0d0d0", borderRadius: 4, outline: "none", resize: "none" } as React.CSSProperties,
  select: { padding: "8px 12px", fontSize: 13, border: "1px solid #d0d0d0", borderRadius: 4, background: "#ffffff", outline: "none" },
  footer: { display: "flex", gap: 8, paddingTop: 10 },
  btnPrimary: { padding: "8px 16px", background: "#161616", color: "#ffffff", border: "none", borderRadius: 4, fontSize: 13, fontWeight: 600, cursor: "pointer" , boxShadow: "0 4px 6px -1px rgba(17, 24, 39, 0.15)"},
  btnSecondary: { padding: "8px 14px", background: "#ffffff", color: "#374151", border: "1px solid #d0d0d0", borderRadius: 4, fontSize: 13, fontWeight: 500, cursor: "pointer" },
};
