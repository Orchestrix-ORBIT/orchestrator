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

function CustomProjectSelect({ projects, value, onChange }: { projects: Project[], value: string, onChange: (val: string) => void }) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const selectedLabel = value === "ALL" ? "All Projects" : projects.find(p => p.id === value)?.name || "All Projects";

  const filteredProjects = projects.filter(p => p.name.toLowerCase().includes(search.toLowerCase()));

  return (
    <div style={{ position: "relative" }} onClick={(e) => e.stopPropagation()}>
      <div 
        onClick={() => setOpen(!open)}
        style={{
          background: "#ffffff",
          border: "1px solid #d1d5db",
          fontSize: 13,
          fontWeight: 500,
          color: "#111827",
          padding: "8px 12px",
          borderRadius: 6,
          cursor: "pointer",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          gap: 16,
          boxShadow: "0 1px 2px rgba(0,0,0,0.02)",
          minWidth: 160
        }}
        onMouseOver={(e) => e.currentTarget.style.borderColor = "#9ca3af"}
        onMouseOut={(e) => e.currentTarget.style.borderColor = "#d1d5db"}
      >
        <span>{selectedLabel}</span>
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M6 9l6 6 6-6"/></svg>
      </div>
      {open && (
        <>
          <div style={{position: "fixed", inset: 0, zIndex: 99}} onClick={(e) => { e.stopPropagation(); setOpen(false); }} />
          <div style={{
            position: "absolute", top: "100%", right: 0, marginTop: 4, 
            background: "#ffffff", border: "1px solid #e5e7eb", borderRadius: 8, 
            boxShadow: "0 10px 15px -3px rgba(0,0,0,0.1), 0 4px 6px -2px rgba(0,0,0,0.05)", zIndex: 100, minWidth: "100%",
            maxHeight: 320, overflowY: "auto", display: "flex", flexDirection: "column"
          }}>
            <div style={{ padding: "8px", borderBottom: "1px solid #f3f4f6" }} onClick={(e) => e.stopPropagation()}>
              <div style={{ position: "relative", display: "flex", alignItems: "center", border: "1px solid #e5e7eb", borderRadius: 6, padding: "8px 10px", transition: "border-color 0.2s", background: "#fff" }}>
                <svg style={{ color: "#9ca3af", flexShrink: 0, marginRight: 8 }} width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
                <input 
                  autoFocus
                  type="text" 
                  placeholder="Search projects..." 
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  style={{ width: "100%", fontSize: 13, color: "#111827" }}
                  onFocus={(e) => e.target.parentElement!.style.borderColor = "#3b82f6"}
                  onBlur={(e) => e.target.parentElement!.style.borderColor = "#e5e7eb"}
                  className="no-default-input"
                />
              </div>
            </div>
            
            <div style={{ flex: 1, overflowY: "auto" }}>
              {"All Projects".toLowerCase().includes(search.toLowerCase()) && (
                <div 
                  onClick={(e) => { e.stopPropagation(); onChange("ALL"); setOpen(false); setSearch(""); }}
              style={{ padding: "10px 14px", fontSize: 13, fontWeight: value === "ALL" ? 600 : 500, color: value === "ALL" ? "#3b82f6" : "#374151", cursor: "pointer", background: value === "ALL" ? "#eff6ff" : "#fff", borderBottom: "1px solid #f3f4f6", transition: "background 0.1s ease" }}
              onMouseOver={(e) => (e.currentTarget.style.background = value === "ALL" ? "#eff6ff" : "#f9fafb")}
              onMouseOut={(e) => (e.currentTarget.style.background = value === "ALL" ? "#eff6ff" : "#fff")}
            >
                  All Projects
                </div>
              )}
              {filteredProjects.map(p => (
                <div 
                  key={p.id}
                  onClick={(e) => { e.stopPropagation(); onChange(p.id); setOpen(false); setSearch(""); }}
                  style={{ padding: "10px 14px", fontSize: 13, fontWeight: value === p.id ? 600 : 500, color: value === p.id ? "#3b82f6" : "#374151", cursor: "pointer", background: value === p.id ? "#eff6ff" : "#fff", borderBottom: "1px solid #f3f4f6", transition: "background 0.1s ease", whiteSpace: "nowrap" }}
                  onMouseOver={(e) => (e.currentTarget.style.background = value === p.id ? "#eff6ff" : "#f9fafb")}
                  onMouseOut={(e) => (e.currentTarget.style.background = value === p.id ? "#eff6ff" : "#fff")}
                >
                  {p.name}
                </div>
              ))}
              {filteredProjects.length === 0 && !("All Projects".toLowerCase().includes(search.toLowerCase())) && (
                <div style={{ padding: "12px 14px", fontSize: 13, color: "#9ca3af", textAlign: "center", fontStyle: "italic" }}>
                  No projects found.
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function CustomToggle({ checked, onChange, label }: { checked: boolean, onChange: (val: boolean) => void, label: string }) {
  return (
    <div 
      onClick={() => onChange(!checked)}
      style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer", userSelect: "none", marginLeft: 8 }}
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

  function getProjectName(projectId: string) {
    const proj = projects.find(p => p.id === projectId);
    return proj ? proj.name : "Unknown Project";
  }

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
          <CustomProjectSelect
            projects={projects}
            value={selectedProject}
            onChange={setSelectedProject}
          />
          <CustomToggle 
            checked={assignedOnly}
            onChange={setAssignedOnly}
            label="Assigned to me"
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
              onDragOver={e => { 
                if (col.id !== "ACCEPTED") e.preventDefault(); 
                if (dragOverCol !== col.id) setDragOverCol(col.id);
              }}
              onDragEnter={(e) => { 
                if (col.id !== "ACCEPTED") e.preventDefault(); 
                if (dragOverCol !== col.id) setDragOverCol(col.id);
              }}
              onDragLeave={(e) => {
                const related = e.relatedTarget as Node;
                if (!e.currentTarget.contains(related)) {
                  setDragOverCol(null);
                }
              }}
              onDrop={e => {
                e.preventDefault();
                if (col.id === "ACCEPTED") return; // researchers cannot drop to Accepted
                const id = e.dataTransfer.getData("text/plain") || draggedTaskId;
                const task = tasks.find(t => t.id === id);
                if (task && isOwnTask(task)) requestMove(task, col.id);
                setDragOverCol(null); setDraggedTaskId(null);
              }}
              style={{ ...s.column, ...(isOver ? (col.id === "ACCEPTED" ? s.columnOverForbidden : s.columnOver) : {}) }}
            >
              {/* Column Header */}
              <div style={s.colHeader}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <div style={{ width: 8, height: 8, borderRadius: "50%", background: col.id === "TODO" ? "#d1d5db" : col.id === "IN_PROGRESS" ? "#f59e0b" : col.id === "DONE" ? "#8b5cf6" : "#10b981" }} />
                  <span style={s.colTitle}>{col.title}</span>
                </div>
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
                    className="card-depth"
                    style={{
                      ...s.taskCard,
                      cursor: canEdit && col.id !== "ACCEPTED" ? "grab" : "pointer",
                      background: canEdit ? "#ffffff" : "#f9fafb",
                      opacity: canEdit ? 1 : 0.65,
                      borderLeft: canEdit ? "4px solid #3b82f6" : "4px solid #d1d5db",
                      boxShadow: canEdit ? "0 4px 6px -1px rgba(0,0,0,0.1), 0 2px 4px -1px rgba(0,0,0,0.06)" : "none",
                    }}
                  >
                    {/* Card Top: id + project + priority */}
                    <div style={s.taskCardTop}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                        <span style={s.taskId} title={`Full ID: ${task.id}`}>#{task.id.substring(0, 8)}</span>
                        {selectedProject === "ALL" && (
                          <span style={{ fontSize: 10, fontWeight: 700, color: "#6b7280", background: "#f3f4f6", padding: "2px 6px", borderRadius: 4, whiteSpace: "nowrap" }}>
                            {getProjectName(task.projectId)}
                          </span>
                        )}
                      </div>
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
                          <CustomStatusSelect
                            value={task.status}
                            onChange={(val) => requestMove(task, val)}
                          />
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
        <div style={{ position: "fixed", inset: 0, background: "rgba(0, 0, 0, 0.25)", backdropFilter: "blur(4px)", zIndex: 200, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}
          onClick={() => setPendingMove(null)}>
          <div style={{ background: "#ffffff", borderRadius: 16, padding: 32, maxWidth: 400, width: "100%", boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.25)", border: "1px solid rgba(255,255,255,0.1)", textAlign: "center" }}
            onClick={e => e.stopPropagation()}>
            {/* Action Icon */}
            <div style={{ width: 48, height: 48, borderRadius: "50%", background: "#f0f4ff", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 20px" }}>
              <svg 
                style={{ transition: "transform 0.2s", transform: ["TODO", "IN_PROGRESS", "DONE", "ACCEPTED"].indexOf(pendingMove.task.status) > ["TODO", "IN_PROGRESS", "DONE", "ACCEPTED"].indexOf(pendingMove.to) ? "scaleX(-1)" : "none" }}
                width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#3b5bdb" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M5 12h14M12 5l7 7-7 7"/>
              </svg>
            </div>
            <h3 style={{ fontSize: 18, fontWeight: 700, color: "#111827", margin: "0 0 8px", letterSpacing: "-0.5px" }}>
              Move Task?
            </h3>
            <p style={{ fontSize: 14, color: "#4b5563", margin: "0 0 28px", lineHeight: 1.5 }}>
              You are about to move <strong>&ldquo;{pendingMove.task.title}&rdquo;</strong> from{" "}
              <span style={{ fontWeight: 600, color: "#111827" }}>{STAGE_LABELS[pendingMove.task.status]}</span>{" "}
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
                onClick={() => moveTask(pendingMove.task, pendingMove.to)}
                className="btn-hover-lift"
                style={{ flex: 1, padding: "10px 16px", borderRadius: 8, border: "none", background: "#111827", fontSize: 13, fontWeight: 600, color: "#fff", cursor: "pointer", transition: "all 0.2s", boxShadow: "0 4px 6px -1px rgba(0,0,0,0.1)" }}
              >Confirm Move</button>
            </div>
          </div>
        </div>
      )}

      {/* ── Task Detail Modal ───────────────────────────────────────────────── */}
      {selectedTask && (
        <div style={m.overlay} onClick={() => setSelectedTask(null)}>
          <div style={{ ...m.modal, maxWidth: 560, borderRadius: 10, overflow: "hidden" }} onClick={e => e.stopPropagation()}>
            <div style={{ padding: "16px 24px", display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid #f3f4f6" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <span style={{ fontSize: 13, fontFamily: "var(--font-mono)", color: "#6b7280", fontWeight: 500 }}>
                  {selectedTask.id.substring(0, 8).toUpperCase()}
                </span>
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
                    {getAssigneeName(selectedTask.assigneeId)}
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
                  Active since {selectedTask.dueDate ? new Date(selectedTask.dueDate).toLocaleDateString() : selectedTask.createdAt ? new Date(selectedTask.createdAt).toLocaleDateString() : "recent sprint"}
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
  column: { background: "transparent", borderRadius: 8, minHeight: "65vh", display: "flex", flexDirection: "column", transition: "background 0.2s, border 0.2s, box-shadow 0.2s", borderTop: "2px solid transparent", borderRight: "2px solid transparent", borderBottom: "2px solid transparent", borderLeft: "2px solid transparent" },
  columnOver: { background: "rgba(59, 130, 246, 0.04)", borderTop: "2px dashed rgba(59, 130, 246, 0.4)", borderRight: "2px dashed rgba(59, 130, 246, 0.4)", borderBottom: "2px dashed rgba(59, 130, 246, 0.4)", borderLeft: "2px dashed rgba(59, 130, 246, 0.4)" },
  columnOverForbidden: { background: "rgba(239, 68, 68, 0.04)", borderTop: "2px dashed rgba(239, 68, 68, 0.4)", borderRight: "2px dashed rgba(239, 68, 68, 0.4)", borderBottom: "2px dashed rgba(239, 68, 68, 0.4)", borderLeft: "2px dashed rgba(239, 68, 68, 0.4)" },
  colHeader: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16, padding: "0 4px" },
  colTitle: { fontSize: 13, fontWeight: 600, color: "#374151", letterSpacing: "0.2px" },
  colCount: { fontSize: 12, fontWeight: 600, color: "#6b7280" },
  taskList: { display: "flex", flexDirection: "column", flex: 1 },
  taskCard: { background: "#ffffff", borderTop: "1px solid #f3f4f6", borderRight: "1px solid #f3f4f6", borderBottom: "1px solid #f3f4f6", borderLeft: "1px solid #f3f4f6", borderRadius: 10, padding: "16px", display: "flex", flexDirection: "column", gap: 12, boxShadow: "0 2px 4px -1px rgba(0, 0, 0, 0.04), 0 1px 2px -1px rgba(0, 0, 0, 0.02)" },
  taskCardTop: { display: "flex", justifyContent: "space-between", alignItems: "flex-start" },
  taskId: { fontSize: 11, fontWeight: 600, color: "#9e9e9e", fontFamily: "var(--font-mono)" },
  priorityBadge: { fontSize: 10, fontWeight: 600, padding: "2px 5px", borderRadius: 3 },
  taskTitle: { fontSize: 14, fontWeight: 600, color: "#111827", lineHeight: 1.3, margin: 0 },
  taskDesc: { fontSize: 13, color: "#4b5563", lineHeight: 1.5, margin: 0 },
  taskCardBottom: { display: "flex", justifyContent: "space-between", alignItems: "center", paddingTop: 12, borderTop: "1px solid #f9fafb", gap: 8, flexWrap: "wrap" },
  taskDue: { fontSize: 12, color: "#9ca3af", fontWeight: 500 },
  statusSelect: { fontSize: 11, padding: "3px 6px", border: "1px solid #d0d0d0", borderRadius: 3, background: "#ffffff", color: "#374151", cursor: "pointer" },
  completedBadge: { fontSize: 11, fontWeight: 600, color: "#2e7d32" },
  assigneeAvatar: { width: 24, height: 24, borderRadius: 12, background: "#161616", color: "#ffffff", fontSize: 10, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center", letterSpacing: "0.5px", flexShrink: 0, cursor: "default" },
  emptyCol: { padding: "40px 12px", textAlign: "center", fontSize: 13, fontWeight: 500, color: "#9ca3af", border: "1px dashed #e5e7eb", borderRadius: 10, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", background: "#fafafa" },
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
