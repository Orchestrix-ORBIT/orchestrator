"use client";

import React, { useState, use } from "react";
import Link from "next/link";

type TaskStatus = "TODO" | "IN_PROGRESS" | "REVIEW" | "COMPLETED";

interface TaskItem {
  id: string;
  title: string;
  description: string;
  status: TaskStatus;
  assignee: string;
  priority: "LOW" | "MEDIUM" | "HIGH";
  dueDate: string;
  isAiGenerated?: boolean;
}

type ProjectMeta = {
  id: string;
  name: string;
  status: "ACTIVE" | "COMPLETED";
};

const PROJECTS_MAP: Record<string, ProjectMeta> = {
  "1": { id: "1", name: "Project Alpha Core", status: "ACTIVE" },
  "2": { id: "2", name: "Nexus Protocol", status: "ACTIVE" },
  "3": { id: "3", name: "Beta Synthesis", status: "COMPLETED" },
};

const INITIAL_TASKS: TaskItem[] = [
  {
    id: "TASK-101",
    title: "Quantum decoherence noise measurement",
    description: "Run statistical signal-to-noise ratio tests on quantum channel simulation datasets.",
    status: "TODO",
    assignee: "DK",
    priority: "HIGH",
    dueDate: "Aug 20, 2026",
    isAiGenerated: true,
  },
  {
    id: "TASK-102",
    title: "Draft localized key distribution protocol",
    description: "Write preliminary mathematical proof for AES-256 session token key exchange.",
    status: "TODO",
    assignee: "SK",
    priority: "MEDIUM",
    dueDate: "Aug 22, 2026",
  },
  {
    id: "TASK-103",
    title: "Benchmark containerized DB isolation",
    description: "Perform load and latency tests for single-tenant PostgreSQL instance queries.",
    status: "IN_PROGRESS",
    assignee: "CK",
    priority: "HIGH",
    dueDate: "Aug 19, 2026",
  },
  {
    id: "TASK-104",
    title: "LangChain context chunking optimization",
    description: "Improve prompt pipeline to prevent token truncation during chat batch summarization.",
    status: "IN_PROGRESS",
    assignee: "DK",
    priority: "MEDIUM",
    dueDate: "Aug 21, 2026",
  },
  {
    id: "TASK-105",
    title: "Peer review on cryptographic proof",
    description: "Review security assertions with university cryptography advisor before pre-print.",
    status: "REVIEW",
    assignee: "AP",
    priority: "HIGH",
    dueDate: "Aug 18, 2026",
  },
  {
    id: "TASK-106",
    title: "Initial workspace schema setup",
    description: "Provisioned PostgreSQL schema and tables with strict multi-tenant boundary checks.",
    status: "COMPLETED",
    assignee: "MN",
    priority: "LOW",
    dueDate: "Aug 14, 2026",
  },
];

const COMPLETED_PROJECT_TASKS: TaskItem[] = [
  {
    id: "TASK-301",
    title: "Historical data ingestion & indexing",
    description: "Archived all historical telemetry data into cold storage with encrypted SHA-256 checksums.",
    status: "COMPLETED",
    assignee: "AP",
    priority: "HIGH",
    dueDate: "Oct 10, 2023",
  },
  {
    id: "TASK-302",
    title: "Final security audit & pre-print publication",
    description: "Completed peer review validation and published technical pre-print report.",
    status: "COMPLETED",
    assignee: "MN",
    priority: "MEDIUM",
    dueDate: "Oct 12, 2023",
  },
  {
    id: "TASK-303",
    title: "Legacy pipeline deprecation",
    description: "Decommissioned v1 data pipelines and transferred active workers to main cluster.",
    status: "COMPLETED",
    assignee: "DK",
    priority: "LOW",
    dueDate: "Oct 08, 2023",
  },
];

const COLUMNS: { id: TaskStatus; title: string }[] = [
  { id: "TODO", title: "To Do" },
  { id: "IN_PROGRESS", title: "In Progress" },
  { id: "REVIEW", title: "Under Review" },
  { id: "COMPLETED", title: "Completed" },
];

export default function ProjectWorkspacePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const resolvedParams = use(params);
  const projectId = resolvedParams.id;

  const currentProject = PROJECTS_MAP[projectId] || {
    id: projectId,
    name: `Project ${projectId}`,
    status: projectId === "3" ? "COMPLETED" : "ACTIVE",
  };

  const isCompletedProject = currentProject.status === "COMPLETED";

  const [tasks, setTasks] = useState<TaskItem[]>(
    isCompletedProject ? COMPLETED_PROJECT_TASKS : INITIAL_TASKS
  );
  const [searchQuery, setSearchQuery] = useState("");
  const [showNewTaskModal, setShowNewTaskModal] = useState(false);
  const [selectedAiTask, setSelectedAiTask] = useState<TaskItem | null>(null);
  const [titleInput, setTitleInput] = useState("");
  const [descInput, setDescInput] = useState("");
  const [assigneeInput, setAssigneeInput] = useState("DK");
  const [priorityInput, setPriorityInput] = useState<"LOW" | "MEDIUM" | "HIGH">("MEDIUM");
  const [columnInput, setColumnInput] = useState<TaskStatus>("TODO");

  // Drag and drop state
  const [draggedTaskId, setDraggedTaskId] = useState<string | null>(null);
  const [dragOverCol, setDragOverCol] = useState<TaskStatus | null>(null);

  // Progress
  const totalCount = tasks.length;
  const completedCount = isCompletedProject
    ? tasks.length
    : tasks.filter((t) => t.status === "COMPLETED").length;
  const progressPercent = isCompletedProject
    ? 100
    : totalCount > 0
    ? Math.round((completedCount / totalCount) * 100)
    : 0;

  const handleCreateTask = (e: React.FormEvent) => {
    e.preventDefault();
    if (isCompletedProject || !titleInput.trim()) return;

    const newTask: TaskItem = {
      id: `TASK-${Date.now().toString().slice(-3)}`,
      title: titleInput,
      description: descInput,
      status: columnInput,
      assignee: assigneeInput,
      priority: priorityInput,
      dueDate: "Aug 25, 2026",
    };

    setTasks((prev) => [newTask, ...prev]);
    setTitleInput("");
    setDescInput("");
    setShowNewTaskModal(false);
  };

  const handleMoveTask = (taskId: string, targetStatus: TaskStatus) => {
    if (isCompletedProject) return;
    setTasks((prev) =>
      prev.map((t) => (t.id === taskId ? { ...t, status: targetStatus } : t))
    );
  };

  const filteredTasks = tasks.filter(
    (t) =>
      t.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.description.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const visibleColumns = isCompletedProject
    ? COLUMNS.filter((c) => c.id === "COMPLETED")
    : COLUMNS;

  return (
    <div>
      {/* ── Breadcrumb & Title Row ─────────────────────────────────────────── */}
      <div style={s.topNavRow}>
        <Link href="/lead-dashboard/projects" style={s.backLink}>
          ← Back to Projects
        </Link>
        <span style={s.projectTag}>
          {currentProject.name} (ID: {projectId})
        </span>
      </div>

      <div style={s.headerRow}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 4 }}>
            <h1 style={s.pageTitle}>Task Board</h1>
            {isCompletedProject && (
              <span style={s.readOnlyBadge}>✓ Read-Only Mode (Completed)</span>
            )}
          </div>
          <p style={s.pageSub}>
            {isCompletedProject
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
                  width: `${progressPercent}%`,
                  background: progressPercent === 100 ? "#2e7d32" : "#161616",
                }}
              />
            </div>
            <span style={s.progressVal}>{progressPercent}%</span>
            <span style={s.progressSub}>({completedCount}/{totalCount})</span>
          </div>

          <input
            type="text"
            placeholder="Filter cards..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={s.searchInput}
          />

          {!isCompletedProject && (
            <button
              onClick={() => setShowNewTaskModal(true)}
              style={s.btnPrimary}
            >
              + New Task
            </button>
          )}
        </div>
      </div>

      {/* ── Kanban Columns Grid ─────────────────────────────────────────────── */}
      <div style={isCompletedProject ? s.completedGrid : s.kanbanGrid}>
        {visibleColumns.map((col) => {
          const colTasks = isCompletedProject
            ? filteredTasks
            : filteredTasks.filter((t) => t.status === col.id);
          const isOver = dragOverCol === col.id;

          return (
            <div
              key={col.id}
              onDragOver={(e) => {
                if (isCompletedProject) return;
                e.preventDefault();
              }}
              onDragEnter={() => {
                if (isCompletedProject) return;
                setDragOverCol(col.id);
              }}
              onDragLeave={() => {
                if (isCompletedProject) return;
                setDragOverCol(null);
              }}
              onDrop={(e) => {
                if (isCompletedProject) return;
                e.preventDefault();
                const id = e.dataTransfer.getData("text/plain") || draggedTaskId;
                if (id) handleMoveTask(id, col.id);
                setDragOverCol(null);
                setDraggedTaskId(null);
              }}
              style={{
                ...s.column,
                ...(isOver ? s.columnOver : {}),
                ...(isCompletedProject ? s.completedColumn : {}),
              }}
            >
              {/* Column Header */}
              <div style={s.colHeader}>
                <span style={s.colTitle}>
                  {isCompletedProject ? "All Completed Tasks" : col.title}
                </span>
                <span style={s.colCount}>{colTasks.length}</span>
              </div>

              {/* Tasks List */}
              <div style={isCompletedProject ? s.completedTasksGrid : s.taskList}>
                {colTasks.map((task) => (
                  <div
                    key={task.id}
                    draggable={!isCompletedProject}
                    onDragStart={(e) => {
                      if (isCompletedProject) return;
                      setDraggedTaskId(task.id);
                      e.dataTransfer.setData("text/plain", task.id);
                    }}
                    onDragEnd={() => {
                      setDraggedTaskId(null);
                      setDragOverCol(null);
                    }}
                    style={{
                      ...s.taskCard,
                      cursor: isCompletedProject ? "default" : "grab",
                    }}
                  >
                    <div style={s.taskCardTop}>
                      <span style={s.taskId}>{task.id}</span>
                      <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                        {task.isAiGenerated && (
                          <button
                            type="button"
                            onClick={() => setSelectedAiTask(task)}
                            style={s.aiBadge}
                            title="Click to view AI details"
                          >
                            AI
                          </button>
                        )}
                        <span
                          style={{
                            ...s.priorityBadge,
                            ...(task.priority === "HIGH"
                              ? s.priHigh
                              : task.priority === "MEDIUM"
                              ? s.priMed
                              : s.priLow),
                          }}
                        >
                          {task.priority}
                        </span>
                      </div>
                    </div>

                    <h4 style={s.taskTitle}>{task.title}</h4>
                    <p style={s.taskDesc}>{task.description}</p>

                    <div style={s.taskCardBottom}>
                      <span style={s.taskDue}>{task.dueDate}</span>

                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        {isCompletedProject ? (
                          <span style={s.completedBadge}>✓ Completed</span>
                        ) : (
                          <select
                            value={task.status}
                            onChange={(e) =>
                              handleMoveTask(task.id, e.target.value as TaskStatus)
                            }
                            style={s.statusSelect}
                          >
                            <option value="TODO">To Do</option>
                            <option value="IN_PROGRESS">In Progress</option>
                            <option value="REVIEW">Review</option>
                            <option value="COMPLETED">Completed</option>
                          </select>
                        )}

                        <span style={s.assigneeAvatar}>{task.assignee}</span>
                      </div>
                    </div>
                  </div>
                ))}

                {colTasks.length === 0 && (
                  <div style={s.emptyCol}>No tasks in this column</div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* ── AI Review Modal ─────────────────────────────────────────────────── */}
      {selectedAiTask && (
        <div style={m.overlay}>
          <div style={m.modal}>
            <div style={m.header}>
              <div>
                <h3 style={m.title}>AI Task Review</h3>
                <p style={m.sub}>Automated synthesis details for {selectedAiTask.id}</p>
              </div>
              <button onClick={() => setSelectedAiTask(null)} style={m.closeBtn}>✕</button>
            </div>

            <div style={m.body}>
              <div style={m.section}>
                <span style={m.label}>TASK TITLE</span>
                <p style={m.mainTitle}>{selectedAiTask.title}</p>
              </div>

              <div style={m.section}>
                <span style={m.label}>DESCRIPTION</span>
                <p style={m.text}>{selectedAiTask.description}</p>
              </div>

              <div style={{ display: "flex", gap: 20 }}>
                <div style={{ flex: 1 }}>
                  <span style={m.label}>ASSIGNEE</span>
                  <p style={{ fontSize: 13, fontWeight: 600, color: "#161616", marginTop: 4 }}>
                    {selectedAiTask.assignee} (Research Team)
                  </p>
                </div>
                <div style={{ flex: 1 }}>
                  <span style={m.label}>PRIORITY</span>
                  <p style={{ fontSize: 13, fontWeight: 600, color: "#161616", marginTop: 4 }}>
                    {selectedAiTask.priority} PRIORITY
                  </p>
                </div>
              </div>

              <div style={{ ...m.section, borderBottom: "none", paddingBottom: 0 }}>
                <span style={m.label}>AI CONTEXT & RECOMMENDATION</span>
                <p style={{ fontSize: 13, color: "#616161", lineHeight: 1.5, marginTop: 4 }}>
                  This task was drafted based on statistical signal-to-noise ratio logs. Validate requirements before transitioning to In Progress.
                </p>
              </div>
            </div>

            <div style={m.footer}>
              <button
                onClick={() => setSelectedAiTask(null)}
                style={m.btnPrimary}
              >
                Close Review
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── New Task Modal ──────────────────────────────────────────────────── */}
      {showNewTaskModal && !isCompletedProject && (
        <div style={m.overlay}>
          <div style={m.modal}>
            <div style={m.header}>
              <h3 style={m.title}>Create Task Card</h3>
              <button onClick={() => setShowNewTaskModal(false)} style={m.closeBtn}>✕</button>
            </div>

            <form onSubmit={handleCreateTask} style={m.body}>
              <div style={m.field}>
                <label style={m.label}>TASK TITLE *</label>
                <input
                  required
                  placeholder="e.g. Implement AES-256 session token exchange"
                  value={titleInput}
                  onChange={(e) => setTitleInput(e.target.value)}
                  style={m.input}
                />
              </div>

              <div style={m.field}>
                <label style={m.label}>DESCRIPTION</label>
                <textarea
                  rows={3}
                  placeholder="Acceptance criteria, technical notes..."
                  value={descInput}
                  onChange={(e) => setDescInput(e.target.value)}
                  style={m.textarea}
                />
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <div style={m.field}>
                  <label style={m.label}>ASSIGNEE</label>
                  <select
                    value={assigneeInput}
                    onChange={(e) => setAssigneeInput(e.target.value)}
                    style={m.select}
                  >
                    <option value="DK">DK (Lead)</option>
                    <option value="SK">SK (Researcher)</option>
                    <option value="CK">CK (Researcher)</option>
                    <option value="AP">AP (Researcher)</option>
                    <option value="MN">MN (Researcher)</option>
                  </select>
                </div>

                <div style={m.field}>
                  <label style={m.label}>PRIORITY</label>
                  <select
                    value={priorityInput}
                    onChange={(e) => setPriorityInput(e.target.value as "LOW" | "MEDIUM" | "HIGH")}
                    style={m.select}
                  >
                    <option value="LOW">Low</option>
                    <option value="MEDIUM">Medium</option>
                    <option value="HIGH">High</option>
                  </select>
                </div>
              </div>

              <div style={m.footer}>
                <button
                  type="button"
                  onClick={() => setShowNewTaskModal(false)}
                  style={m.btnSecondary}
                >
                  Cancel
                </button>
                <button type="submit" style={m.btnPrimary}>
                  Create Card
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

const s: Record<string, React.CSSProperties> = {
  topNavRow: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  backLink: {
    fontSize: 13,
    color: "#616161",
    textDecoration: "none",
    fontWeight: 500,
  },
  projectTag: {
    fontSize: 12,
    color: "#9e9e9e",
    fontWeight: 600,
  },
  headerRow: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-end",
    marginBottom: 24,
    borderBottom: "1px solid #e0e0e0",
    paddingBottom: 16,
  },
  pageTitle: {
    fontSize: 28,
    fontWeight: 700,
    color: "#161616",
    letterSpacing: "-0.5px",
  },
  pageSub: {
    fontSize: 13,
    color: "#9e9e9e",
    marginTop: 4,
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
    border: "1px solid #e0e0e0",
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
    color: "#161616",
  },
  progressSub: {
    fontSize: 11,
    color: "#9e9e9e",
  },
  searchInput: {
    padding: "7px 12px",
    fontSize: 13,
    border: "1px solid #d0d0d0",
    borderRadius: 4,
    outline: "none",
    width: 180,
    background: "#ffffff",
  },
  btnPrimary: {
    padding: "8px 16px",
    background: "#161616",
    color: "#ffffff",
    border: "none",
    borderRadius: 4,
    fontSize: 13,
    fontWeight: 600,
    cursor: "pointer",
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
    background: "#ffffff",
    border: "1px solid #e0e0e0",
    borderRadius: 6,
    padding: "16px",
    minHeight: 450,
    display: "flex",
    flexDirection: "column",
  },
  columnOver: {
    background: "#f9f9f9",
    borderColor: "#9e9e9e",
  },
  completedColumn: {
    background: "#ffffff",
  },
  colHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 14,
    paddingBottom: 10,
    borderBottom: "1px solid #eeeeee",
  },
  colTitle: {
    fontSize: 11,
    fontWeight: 600,
    color: "#9e9e9e",
    letterSpacing: "0.5px",
    textTransform: "uppercase" as const,
  },
  colCount: {
    fontSize: 11,
    fontWeight: 700,
    color: "#161616",
    background: "#f0f0f0",
    padding: "2px 6px",
    borderRadius: 10,
  },
  taskList: {
    display: "flex",
    flexDirection: "column",
    gap: 10,
    flex: 1,
  },
  completedTasksGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(3, 1fr)",
    gap: 16,
  },
  taskCard: {
    background: "#ffffff",
    border: "1px solid #e0e0e0",
    borderRadius: 4,
    padding: "14px 16px",
    boxShadow: "0 1px 2px rgba(0,0,0,0.02)",
  },
  taskCardTop: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  taskId: {
    fontSize: 11,
    fontWeight: 600,
    color: "#9e9e9e",
    fontFamily: "monospace",
  },
  aiBadge: {
    fontSize: 10,
    fontWeight: 700,
    background: "#161616",
    color: "#ffffff",
    border: "none",
    borderRadius: 3,
    padding: "2px 5px",
    cursor: "pointer",
  },
  priorityBadge: {
    fontSize: 10,
    fontWeight: 600,
    padding: "2px 5px",
    borderRadius: 3,
  },
  priHigh: {
    background: "#fde8e8",
    color: "#c62828",
  },
  priMed: {
    background: "#fff8e1",
    color: "#f57f17",
  },
  priLow: {
    background: "#f5f5f5",
    color: "#616161",
  },
  taskTitle: {
    fontSize: 13,
    fontWeight: 600,
    color: "#161616",
    lineHeight: 1.3,
    marginBottom: 6,
  },
  taskDesc: {
    fontSize: 12,
    color: "#616161",
    lineHeight: 1.4,
    marginBottom: 12,
  },
  taskCardBottom: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    paddingTop: 10,
    borderTop: "1px solid #f5f5f5",
  },
  taskDue: {
    fontSize: 11,
    color: "#9e9e9e",
  },
  completedBadge: {
    fontSize: 11,
    fontWeight: 600,
    color: "#2e7d32",
  },
  statusSelect: {
    fontSize: 11,
    padding: "3px 6px",
    border: "1px solid #d0d0d0",
    borderRadius: 3,
    background: "#ffffff",
    color: "#424242",
    cursor: "pointer",
  },
  assigneeAvatar: {
    width: 22,
    height: 22,
    borderRadius: 11,
    background: "#161616",
    color: "#ffffff",
    fontSize: 10,
    fontWeight: 700,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
  emptyCol: {
    padding: "24px 12px",
    textAlign: "center" as const,
    fontSize: 12,
    color: "#9e9e9e",
    border: "1px dashed #d0d0d0",
    borderRadius: 4,
  },
};

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
    maxWidth: 520,
    boxShadow: "0 10px 25px rgba(0, 0, 0, 0.1)",
  },
  header: {
    padding: "18px 24px",
    borderBottom: "1px solid #eeeeee",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
  },
  title: {
    fontSize: 16,
    fontWeight: 700,
    color: "#161616",
  },
  sub: {
    fontSize: 12,
    color: "#9e9e9e",
    marginTop: 2,
  },
  closeBtn: {
    background: "none",
    border: "none",
    fontSize: 15,
    color: "#9e9e9e",
    cursor: "pointer",
  },
  body: {
    padding: "20px 24px",
    display: "flex",
    flexDirection: "column",
    gap: 14,
  },
  section: {
    borderBottom: "1px solid #f0f0f0",
    paddingBottom: 10,
  },
  label: {
    fontSize: 11,
    fontWeight: 600,
    color: "#9e9e9e",
    letterSpacing: "0.5px",
    display: "block",
  },
  mainTitle: {
    fontSize: 14,
    fontWeight: 600,
    color: "#161616",
    marginTop: 4,
  },
  text: {
    fontSize: 13,
    color: "#424242",
    lineHeight: 1.4,
    marginTop: 4,
  },
  field: {
    display: "flex",
    flexDirection: "column",
    gap: 6,
  },
  input: {
    padding: "8px 12px",
    fontSize: 13,
    border: "1px solid #d0d0d0",
    borderRadius: 4,
    outline: "none",
  },
  textarea: {
    padding: "8px 12px",
    fontSize: 13,
    border: "1px solid #d0d0d0",
    borderRadius: 4,
    outline: "none",
    resize: "none",
  },
  select: {
    padding: "8px 12px",
    fontSize: 13,
    border: "1px solid #d0d0d0",
    borderRadius: 4,
    background: "#ffffff",
    outline: "none",
  },
  footer: {
    display: "flex",
    justifyContent: "flex-end",
    gap: 8,
    paddingTop: 10,
  },
  btnPrimary: {
    padding: "8px 16px",
    background: "#161616",
    color: "#ffffff",
    border: "none",
    borderRadius: 4,
    fontSize: 13,
    fontWeight: 600,
    cursor: "pointer",
  },
  btnSecondary: {
    padding: "8px 14px",
    background: "#ffffff",
    color: "#424242",
    border: "1px solid #d0d0d0",
    borderRadius: 4,
    fontSize: 13,
    fontWeight: 500,
    cursor: "pointer",
  },
};
