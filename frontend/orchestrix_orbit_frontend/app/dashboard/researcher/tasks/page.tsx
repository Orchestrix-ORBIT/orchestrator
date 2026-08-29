"use client";

import { useEffect, useState } from "react";
import { ProjectsService, type Project } from "@/lib/services/projects";
import { TasksService, type Task, type TaskStatus, type TaskPriority } from "@/lib/services/tasks";

/*
 * KANBAN BOARD (teaching note):
 *
 * The Kanban board groups tasks by their `status` field from the backend.
 * When a user moves a task to a different column, we call:
 *   PATCH /api/projects/{projectId}/tasks/{taskId}
 *   Body: { status: "IN_PROGRESS" }
 *
 * The backend returns the updated task. We update local state to reflect it.
 * This is a "local-first update" — the UI changes immediately, then we sync to the server.
 */

const COLUMNS: { id: TaskStatus; label: string }[] = [
  { id: "TODO",        label: "To Do" },
  { id: "IN_PROGRESS", label: "In Progress" },
  { id: "DONE",        label: "Completed (Pending Review)" },
  { id: "ACCEPTED",    label: "Accepted ✓" },
  { id: "BLOCKED",     label: "Blocked" },
];

export default function ResearcherTasksPage() {
  const [projects, setProjects]         = useState<Project[]>([]);
  const [tasks, setTasks]               = useState<Task[]>([]);
  const [loading, setLoading]           = useState(true);
  const [error, setError]               = useState<string | null>(null);
  const [selectedProject, setSelectedProject] = useState<string>("ALL");

  // New task modal state
  const [showModal, setShowModal]       = useState(false);
  const [modalProjectId, setModalProjectId] = useState("");
  const [newTitle, setNewTitle]         = useState("");
  const [newPriority, setNewPriority]   = useState<TaskPriority>("MEDIUM");
  const [newDue, setNewDue]             = useState("");
  const [creating, setCreating]         = useState(false);

  /* ── Load projects + tasks ──────────────────────────────────────────── */
  useEffect(() => {
    async function load() {
      try {
        const projectList = await ProjectsService.getAll();
        setProjects(projectList);
        if (projectList.length > 0) {
          setModalProjectId(projectList[0].id);
        }

        // Fetch tasks for all projects in parallel
        const results = await Promise.all(
          projectList.map(p => TasksService.getByProject(p.id).catch(() => [] as Task[]))
        );
        setTasks(results.flat());
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : "Failed to load tasks");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const [assignedOnly, setAssignedOnly] = useState<boolean>(true);

  let currentUserId = "";
  try {
    const userStr = localStorage.getItem("user") || "{}";
    currentUserId = JSON.parse(userStr).id || "";
  } catch (e) {}

  /* ── Filtered tasks ─────────────────────────────────────────────────── */
  const filteredTasks = tasks.filter((t) => {
    const matchesProject = selectedProject === "ALL" || t.projectId === selectedProject;
    const matchesAssignee = !assignedOnly || !t.assigneeId || t.assigneeId === currentUserId;
    return matchesProject && matchesAssignee;
  });

  /* ── Move task to different status ─────────────────────────────────── */
  async function moveTask(task: Task, newStatus: TaskStatus) {
    // Optimistic update: change the UI immediately
    setTasks(prev => prev.map(t => t.id === task.id ? { ...t, status: newStatus } : t));
    try {
      await TasksService.update(task.projectId, task.id, { status: newStatus });
    } catch {
      // Rollback if the API call fails
      setTasks(prev => prev.map(t => t.id === task.id ? { ...t, status: task.status } : t));
    }
  }

  /* ── Create new task ────────────────────────────────────────────────── */
  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!newTitle.trim() || !modalProjectId) return;
    setCreating(true);
    try {
      const created = await TasksService.create(modalProjectId, {
        title: newTitle.trim(),
        priority: newPriority,
        dueDate: newDue || undefined,
      });
      setTasks(prev => [...prev, created]);
      setShowModal(false);
      setNewTitle("");
      setNewDue("");
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Failed to create task");
    } finally {
      setCreating(false);
    }
  }

  if (loading) return <p style={{ padding: 40, color: "#888", fontSize: 14 }}>Loading tasks…</p>;
  if (error)   return <p style={{ padding: 24, color: "#c62828", fontSize: 14 }}>Error: {error}</p>;

  return (
    <div>
      {/* ── Header ──────────────────────────────────────────────────────── */}
      <div style={s.header}>
        <div>
          <h1 style={s.title}>My Tasks</h1>
          <p style={s.sub}>{tasks.length} total tasks across {projects.length} projects</p>
        </div>
        <div style={{ display: "flex", gap: 10 }}>
          <select
            id="select-project-filter"
            style={s.select}
            value={selectedProject}
            onChange={e => setSelectedProject(e.target.value)}
          >
            <option value="ALL">All Projects</option>
            {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
          <button id="btn-new-task" style={s.btnPrimary} onClick={() => setShowModal(true)}>
            + New Task
          </button>
        </div>
      </div>

      {/* ── Kanban board ────────────────────────────────────────────────── */}
      <div style={s.board}>
        {COLUMNS.map(col => {
          const colTasks = filteredTasks.filter(t => t.status === col.id);
          return (
            <div key={col.id} style={s.col}>
              <div style={s.colHead}>
                <span style={s.colLabel}>{col.label}</span>
                <span style={s.colCount}>{colTasks.length}</span>
              </div>
              <div style={s.colBody}>
                {colTasks.map(task => (
                  <div key={task.id} id={`task-card-${task.id}`} style={s.taskCard}>
                    <div style={s.taskTitle}>{task.title}</div>
                    <div style={s.taskMeta}>
                      <span style={{ ...s.priority, ...priorityStyle(task.priority) }}>
                        {task.priority}
                      </span>
                      {task.dueDate && (
                        <span style={s.due}>{new Date(task.dueDate).toLocaleDateString()}</span>
                      )}
                    </div>
                    {/* Status mover buttons */}
                    <div style={s.moveRow}>
                      {COLUMNS.filter(c => c.id !== col.id).map(c => (
                        <button
                          key={c.id}
                          style={s.moveBtn}
                          onClick={() => moveTask(task, c.id)}
                          title={`Move to ${c.label}`}
                        >
                          → {c.label}
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
                {colTasks.length === 0 && (
                  <div style={s.empty}>No tasks</div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* ── Create Task Modal ────────────────────────────────────────────── */}
      {showModal && (
        <div style={s.overlay}>
          <div style={s.modal}>
            <div style={s.modalHead}>
              <span style={s.modalTitle}>New Task</span>
              <button style={s.closeBtn} onClick={() => setShowModal(false)}>×</button>
            </div>
            <form onSubmit={handleCreate} style={s.modalForm}>
              <div style={s.field}>
                <label style={s.label}>Project *</label>
                <select id="select-task-project" style={s.input} value={modalProjectId}
                  onChange={e => setModalProjectId(e.target.value)} required>
                  {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              </div>
              <div style={s.field}>
                <label style={s.label}>Task title *</label>
                <input id="input-task-title" style={s.input} value={newTitle}
                  onChange={e => setNewTitle(e.target.value)} placeholder="e.g. Review literature" required />
              </div>
              <div style={s.field}>
                <label style={s.label}>Priority</label>
                <select id="select-task-priority" style={s.input} value={newPriority}
                  onChange={e => setNewPriority(e.target.value as TaskPriority)}>
                  <option value="LOW">Low</option>
                  <option value="MEDIUM">Medium</option>
                  <option value="HIGH">High</option>
                  <option value="URGENT">Urgent</option>
                </select>
              </div>
              <div style={s.field}>
                <label style={s.label}>Due date</label>
                <input id="input-task-due" type="date" style={s.input}
                  value={newDue} onChange={e => setNewDue(e.target.value)} />
              </div>
              <div style={s.modalActions}>
                <button type="button" style={s.btnSecondary} onClick={() => setShowModal(false)}>Cancel</button>
                <button id="btn-create-task" type="submit" style={{ ...s.btnPrimary, opacity: creating ? 0.6 : 1 }} disabled={creating}>
                  {creating ? "Creating…" : "Create Task"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

function priorityStyle(p: TaskPriority): React.CSSProperties {
  switch (p) {
    case "URGENT":   return { background: "#fde8e8", color: "#c62828" };
    case "CRITICAL": return { background: "#fde8e8", color: "#c62828" };
    case "HIGH":     return { background: "#fff3e0", color: "#e65100" };
    case "MEDIUM":   return { background: "#e3f2fd", color: "#1565c0" };
    default:         return { background: "#f5f5f5", color: "#616161" };
  }
}

/* ── Styles ─────────────────────────────────────────────────────────────── */
const s: Record<string, React.CSSProperties> = {
  header: { display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 24 },
  title: { fontSize: 22, fontWeight: 700, color: "#161616", marginBottom: 4 },
  sub: { fontSize: 13, color: "#888888" },
  select: { padding: "8px 12px", fontSize: 13, border: "1.5px solid #d0d0d0", borderRadius: 6, fontFamily: "inherit", background: "#fff" },
  btnPrimary: { padding: "10px 18px", background: "#161616", color: "#ffffff", border: "none", borderRadius: 6, fontSize: 13, fontWeight: 600, cursor: "pointer" },
  btnSecondary: { padding: "10px 18px", background: "#ffffff", color: "#161616", border: "1px solid #d0d0d0", borderRadius: 6, fontSize: 13, fontWeight: 600, cursor: "pointer" },
  board: { display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 14, alignItems: "start" },
  col: { background: "#f7f7f7", borderRadius: 8, overflow: "hidden" },
  colHead: { display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 14px", background: "#eeeeee" },
  colLabel: { fontSize: 12, fontWeight: 700, color: "#424242", letterSpacing: "0.3px" },
  colCount: { fontSize: 11, fontWeight: 700, background: "#d0d0d0", color: "#424242", borderRadius: 10, padding: "1px 7px" },
  colBody: { display: "flex", flexDirection: "column", gap: 8, padding: 10, minHeight: 80 },
  taskCard: { background: "#ffffff", border: "1px solid #e8e8e8", borderRadius: 6, padding: 12 },
  taskTitle: { fontSize: 13, fontWeight: 500, color: "#161616", marginBottom: 8, lineHeight: 1.4 },
  taskMeta: { display: "flex", gap: 6, alignItems: "center", marginBottom: 8 },
  priority: { fontSize: 10, fontWeight: 700, letterSpacing: "0.4px", padding: "2px 6px", borderRadius: 3 },
  due: { fontSize: 11, color: "#888888" },
  moveRow: { display: "flex", flexDirection: "column", gap: 3 },
  moveBtn: { background: "none", border: "1px solid #e0e0e0", borderRadius: 4, fontSize: 10, color: "#888", cursor: "pointer", padding: "3px 6px", textAlign: "left" as const },
  empty: { textAlign: "center" as const, color: "#bbb", fontSize: 12, padding: "20px 0" },
  overlay: { position: "fixed" as const, inset: 0, background: "rgba(0,0,0,0.4)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 100 },
  modal: { background: "#ffffff", borderRadius: 10, padding: 28, width: "100%", maxWidth: 440 },
  modalHead: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 },
  modalTitle: { fontSize: 16, fontWeight: 700, color: "#161616" },
  closeBtn: { background: "none", border: "none", fontSize: 22, color: "#888", cursor: "pointer" },
  modalForm: { display: "flex", flexDirection: "column", gap: 14 },
  modalActions: { display: "flex", gap: 10, justifyContent: "flex-end", marginTop: 8 },
  field: { display: "flex", flexDirection: "column", gap: 6 },
  label: { fontSize: 12, fontWeight: 600, color: "#161616" },
  input: { padding: "10px 12px", fontSize: 14, border: "1.5px solid #d0d0d0", borderRadius: 6, fontFamily: "inherit", width: "100%" },
};
