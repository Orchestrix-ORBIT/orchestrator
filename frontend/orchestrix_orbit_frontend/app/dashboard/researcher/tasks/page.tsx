"use client";

import { useState } from "react";

/* ── Types ───────────────────────────────────────────────────────────────── */
type TaskPriority = "HIGH" | "MED" | "CRIT" | "LOW";
type KanbanColumn = "To Do" | "In Progress" | "Under Review" | "Completed";

interface Task {
  id: string;
  title: string;
  description?: string;
  assignee?: string; /* single initial */
  dueDate?: string;
  priority?: TaskPriority;
  completed?: boolean;
}

/* ── Static data ─────────────────────────────────────────────────────────── */
const COLUMNS: { id: KanbanColumn; label: string }[] = [
  { id: "To Do",        label: "To Do"        },
  { id: "In Progress",  label: "In Progress"  },
  { id: "Under Review", label: "Under Review" },
  { id: "Completed",    label: "Completed"    },
];

const INITIAL_TASKS: Record<KanbanColumn, Task[]> = {
  "To Do": [
    {
      id: "task-todo-1",
      title: "Review Literature on Quantum Encryption",
      description:
        "Analyze recent papers focusing on QKD protocols and their vulnerabilitie...",
      assignee: "A",
      dueDate: "Oct 12",
      priority: "HIGH",
    },
  ],
  "In Progress": [
    {
      id: "task-inprog-1",
      title: "Draft Architecture Diagram",
      description:
        "Map out the initial microservices architecture prioritizing data isolation.",
      assignee: "B",
      dueDate: "Oct 14",
      priority: "MED",
    },
  ],
  "Under Review": [
    {
      id: "task-review-1",
      title: "Security Audit Prep",
      description:
        "Compile necessary logs and access reports for Q3 compliance audit.",
      assignee: "C",
      dueDate: "Oct 10",
      priority: "CRIT",
    },
  ],
  Completed: [
    {
      id: "task-done-1",
      title: "Setup Dev Environment",
      description: "Provision AWS instances and...",
      completed: true,
      dueDate: "Oc...",
    },
  ],
};

const PRIORITY_STYLES: Record<TaskPriority, React.CSSProperties> = {
  HIGH: { background: "#ffe4b5", color: "#7c5300", border: "none" },
  MED:  { background: "#e3f0ff", color: "#1a4d8f", border: "none" },
  CRIT: { background: "#161616", color: "#ffffff", border: "none" },
  LOW:  { background: "#f0f0f0", color: "#616161", border: "none" },
};

/* ════════════════════════════════════════════════════════════════════════════
   My Tasks Page
═══════════════════════════════════════════════════════════════════════════ */
export default function MyTasksPage() {
  const [tasks] = useState(INITIAL_TASKS);
  const [projectFilter] = useState("All Projects");

  /* column count badges */
  const count = (col: KanbanColumn) => tasks[col].length;

  return (
    <div style={s.root}>
      {/* ── Page header ──────────────────────────────────────────────────── */}
      <div style={s.pageHeader}>
        <h1 style={s.pageTitle}>My Tasks</h1>
        {/* Project filter dropdown */}
        <button id="btn-project-filter" style={s.dropdownBtn}>
          {projectFilter}
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
            <path d="M3 4.5l3 3 3-3" />
          </svg>
        </button>
      </div>

      {/* ── Kanban board ─────────────────────────────────────────────────── */}
      <div style={s.board}>
        {COLUMNS.map((col) => (
          <KanbanColumn
            key={col.id}
            column={col}
            tasks={tasks[col.id]}
            count={count(col.id)}
          />
        ))}
      </div>
    </div>
  );
}

/* ── Kanban Column ───────────────────────────────────────────────────────── */
function KanbanColumn({
  column,
  tasks,
  count,
}: {
  column: { id: KanbanColumn; label: string };
  tasks: Task[];
  count: number;
}) {
  return (
    <div id={`col-${column.id.toLowerCase().replace(/\s/g, "-")}`} style={s.column}>
      {/* Column header */}
      <div style={s.colHeader}>
        <span style={s.colLabel}>{column.label}</span>
        {count > 0 && <span style={s.colCount}>{count}</span>}
      </div>

      {/* Add Task button — only for "To Do" */}
      {column.id === "To Do" && (
        <button id="btn-add-task" style={s.addTaskBtn}>
          <span style={{ marginRight: 4, fontSize: 14 }}>+</span>
          Add Task
        </button>
      )}

      {/* Task cards */}
      <div style={s.cardList}>
        {tasks.map((task) => (
          <TaskCard key={task.id} task={task} />
        ))}
      </div>
    </div>
  );
}

/* ── Task Card ───────────────────────────────────────────────────────────── */
function TaskCard({ task }: { task: Task }) {
  return (
    <div
      id={task.id}
      style={{
        ...s.taskCard,
        ...(task.completed ? s.taskCardCompleted : {}),
      }}
    >
      {/* Title */}
      <p style={task.completed ? s.taskTitleDone : s.taskTitle}>{task.title}</p>

      {/* Description */}
      {task.description && (
        <p style={s.taskDesc}>{task.description}</p>
      )}

      {/* Bottom row: assignee + due + priority */}
      <div style={s.taskMeta}>
        <div style={s.metaLeft}>
          {task.assignee && (
            <div style={s.assigneeAvatar}>{task.assignee}</div>
          )}
        </div>
        <div style={s.metaRight}>
          {task.dueDate && (
            <span style={s.dueDate}>
              <svg
                width="11"
                height="11"
                viewBox="0 0 11 11"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.2"
                style={{ marginRight: 3 }}
              >
                <rect x="1" y="1.5" width="9" height="8.5" rx="1.2" />
                <line x1="3.5" y1="1" x2="3.5" y2="2.5" strokeLinecap="round" />
                <line x1="7.5" y1="1" x2="7.5" y2="2.5" strokeLinecap="round" />
                <line x1="1" y1="4" x2="10" y2="4" />
              </svg>
              {task.dueDate}
            </span>
          )}
          {task.priority && (
            <span style={{ ...s.priorityBadge, ...PRIORITY_STYLES[task.priority] }}>
              {task.priority}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

/* ── Styles ─────────────────────────────────────────────────────────────── */
const s: Record<string, React.CSSProperties> = {
  root: {
    display: "flex",
    flexDirection: "column" as const,
    height: "100%",
  },

  /* Header */
  pageHeader: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 24,
  },
  pageTitle: {
    fontSize: 28,
    fontWeight: 700,
    color: "#161616",
    letterSpacing: "-0.5px",
  },
  dropdownBtn: {
    display: "flex",
    alignItems: "center",
    gap: 6,
    padding: "7px 14px",
    fontSize: 13,
    fontWeight: 500,
    color: "#161616",
    background: "#ffffff",
    border: "1px solid #d0d0d0",
    borderRadius: 6,
    cursor: "pointer",
  },

  /* Board */
  board: {
    display: "grid",
    gridTemplateColumns: "repeat(4, 1fr)",
    gap: 16,
    alignItems: "flex-start",
    flex: 1,
  },

  /* Column */
  column: {
    background: "#f5f5f5",
    border: "1px solid #e0e0e0",
    borderRadius: 8,
    padding: "14px 12px",
    minHeight: 500,
    display: "flex",
    flexDirection: "column" as const,
    gap: 10,
  },
  colHeader: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 2,
  },
  colLabel: {
    fontSize: 13,
    fontWeight: 600,
    color: "#161616",
  },
  colCount: {
    fontSize: 11,
    fontWeight: 600,
    color: "#9e9e9e",
    background: "#e8e8e8",
    borderRadius: 10,
    padding: "1px 7px",
  },

  /* Add task button */
  addTaskBtn: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    width: "100%",
    padding: "7px 0",
    fontSize: 12,
    fontWeight: 500,
    color: "#9e9e9e",
    background: "transparent",
    border: "1px dashed #d0d0d0",
    borderRadius: 6,
    cursor: "pointer",
  },
  cardList: {
    display: "flex",
    flexDirection: "column" as const,
    gap: 8,
  },

  /* Task card */
  taskCard: {
    background: "#ffffff",
    border: "1px solid #e8e8e8",
    borderRadius: 6,
    padding: "12px 12px 10px",
    display: "flex",
    flexDirection: "column" as const,
    gap: 8,
  },
  taskCardCompleted: {
    opacity: 0.65,
  },
  taskTitle: {
    fontSize: 13,
    fontWeight: 600,
    color: "#161616",
    lineHeight: 1.4,
  },
  taskTitleDone: {
    fontSize: 13,
    fontWeight: 500,
    color: "#9e9e9e",
    lineHeight: 1.4,
    textDecoration: "line-through",
  },
  taskDesc: {
    fontSize: 12,
    color: "#9e9e9e",
    lineHeight: 1.5,
  },

  /* Meta row */
  taskMeta: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 2,
  },
  metaLeft: {
    display: "flex",
    alignItems: "center",
    gap: 4,
  },
  metaRight: {
    display: "flex",
    alignItems: "center",
    gap: 6,
  },
  assigneeAvatar: {
    width: 22,
    height: 22,
    borderRadius: "50%",
    background: "#d0d0d0",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: 9,
    fontWeight: 700,
    color: "#616161",
  },
  dueDate: {
    display: "flex",
    alignItems: "center",
    fontSize: 11,
    color: "#9e9e9e",
    fontVariantNumeric: "tabular-nums" as const,
    whiteSpace: "nowrap" as const,
  },
  priorityBadge: {
    fontSize: 10,
    fontWeight: 700,
    letterSpacing: "0.5px",
    padding: "2px 6px",
    borderRadius: 3,
    whiteSpace: "nowrap" as const,
  },
};
