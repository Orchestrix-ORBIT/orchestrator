"use client";

import React, { useState, use } from "react";
import Link from "next/link";

type TaskStatus = "TODO" | "IN_PROGRESS" | "DONE" | "ACCEPTED" | "BLOCKED";

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

import { useEffect } from "react";
import { ProjectsService } from "@/lib/services/projects";
import { TasksService } from "@/lib/services/tasks";
import { TeamsService } from "@/lib/services/teams";

const COLUMNS: { id: TaskStatus; title: string }[] = [
  { id: "TODO", title: "To Do" },
  { id: "IN_PROGRESS", title: "In Progress" },
  { id: "DONE", title: "Completed (Pending Review)" },
  { id: "ACCEPTED", title: "Accepted ✓" },
  { id: "BLOCKED", title: "Blocked" },
];

function getInitials(name: string) {
  if (!name || name === "Unassigned") return "UA";
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export default function ProjectWorkspacePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const resolvedParams = use(params);
  const projectId = resolvedParams.id;

  const [project, setProject] = useState<any>(null);
  const [tasks, setTasks] = useState<TaskItem[]>([]);
  const [loading, setLoading] = useState(true);

  const [searchQuery, setSearchQuery] = useState("");
  const [showNewTaskModal, setShowNewTaskModal] = useState(false);
  const [selectedTask, setSelectedTask] = useState<TaskItem | null>(null);
  const [titleInput, setTitleInput] = useState("");
  const [descInput, setDescInput] = useState("");
  const [assigneeInput, setAssigneeInput] = useState("");
  const [assigneeSearchQuery, setAssigneeSearchQuery] = useState("");
  const [availableMembers, setAvailableMembers] = useState<any[]>([]);
  const [priorityInput, setPriorityInput] = useState<"LOW" | "MEDIUM" | "HIGH">("MEDIUM");
  const [columnInput, setColumnInput] = useState<TaskStatus>("TODO");

  // Drag and drop state
  const [draggedTaskId, setDraggedTaskId] = useState<string | null>(null);
  const [dragOverCol, setDragOverCol] = useState<TaskStatus | null>(null);

  useEffect(() => {
    async function loadData() {
      try {
        const [proj, taskList, members] = await Promise.all([
          ProjectsService.getById(projectId).catch(() => ({ id: projectId, name: `Project ${projectId.substring(0, 8)}`, status: "ACTIVE" })),
          TasksService.getByProject(projectId).catch(() => []),
          TeamsService.getAllMembers().catch(() => []),
        ]);
        setProject(proj);

        const storedMap = JSON.parse(localStorage.getItem("project_assigned_members") || "{}");
        const assignedIds = storedMap[projectId] || [];

        let projectMembers = members.filter((m: any) => assignedIds.includes(m.id || m.userId));
        
        // Fallback for default projects without assigned members in localStorage
        if (projectMembers.length === 0) {
          projectMembers = members.filter((m: any) => {
            const role = String(m.role || "").toUpperCase();
            const name = String(m.displayName || m.userDisplayName || "").toLowerCase();
            const email = String(m.email || m.userEmail || "").toLowerCase();
            return role === "RESEARCHER" || name.includes("researcher") || email.includes("researcher");
          });
        }
        
        setAvailableMembers(projectMembers);

        const mappedTasks: TaskItem[] = (taskList as any[]).map((t: any) => {
          let uiStatus: TaskStatus = "TODO";
          if (t.status === "ACCEPTED") uiStatus = "ACCEPTED";
          else if (t.status === "DONE" || t.status === "COMPLETED") uiStatus = "DONE";
          else if (t.status === "IN_PROGRESS") uiStatus = "IN_PROGRESS";
          else if (t.status === "BLOCKED") uiStatus = "BLOCKED";

          return {
            id: t.id,
            title: t.title,
            description: t.description || "",
            status: uiStatus,
            assignee: t.assigneeId ? "Researcher" : "Unassigned",
            priority: (t.priority === "URGENT" || t.priority === "CRITICAL") ? "HIGH" : (t.priority || "MEDIUM"),
            dueDate: t.dueDate || (t.createdAt ? new Date(t.createdAt).toLocaleDateString() : "Active"),
          };
        });
        setTasks(mappedTasks);
      } catch (err) {
        console.error("Failed to load project details:", err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [projectId]);

  const currentProject = project || { id: projectId, name: `Project ${projectId.substring(0, 8)}`, status: "ACTIVE" };
  const isCompletedProject = currentProject.status === "COMPLETED";

  // Progress
  const totalCount = tasks.length;
  const completedCount = tasks.filter((t) => t.status === "ACCEPTED" || t.status === "DONE").length;
  const progressPercent = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isCompletedProject || !titleInput.trim()) return;

    try {
      const backendStatus = columnInput;
      const created = await TasksService.create(projectId, {
        title: titleInput.trim(),
        description: descInput.trim() || undefined,
        priority: (priorityInput === "HIGH" ? "HIGH" : priorityInput === "MEDIUM" ? "MEDIUM" : "LOW") as any,
      });

      const newTask: TaskItem = {
        id: created.id,
        title: created.title,
        description: created.description || "",
        status: columnInput,
        assignee: assigneeInput || "Researcher",
        priority: priorityInput,
        dueDate: "Just now",
      };

      setTasks((prev) => [newTask, ...prev]);
      setTitleInput("");
      setDescInput("");
      setAssigneeSearchQuery("");
      setAssigneeInput("");
      setShowNewTaskModal(false);
    } catch (err: unknown) {
      alert("Error creating task: " + (err instanceof Error ? err.message : String(err)));
    }
  };

  const handleMoveTask = async (taskId: string, targetStatus: TaskStatus) => {
    if (isCompletedProject) return;
    setTasks((prev) =>
      prev.map((t) => (t.id === taskId ? { ...t, status: targetStatus } : t))
    );
    try {
      const backendStatus = targetStatus;
      await TasksService.update(projectId, taskId, { status: backendStatus as any });
    } catch (err) {
      console.warn("Could not update task status on backend:", err);
    }
  };

  const handleReassignTask = async (taskId: string, newAssigneeName: string) => {
    setTasks((prev) =>
      prev.map((t) => (t.id === taskId ? { ...t, assignee: newAssigneeName } : t))
    );
    if (selectedTask && selectedTask.id === taskId) {
      setSelectedTask((prev) => (prev ? { ...prev, assignee: newAssigneeName } : null));
    }

    try {
      const matchingMember = availableMembers.find(
        (m) => (m.displayName || m.userDisplayName || m.email) === newAssigneeName
      );
      const assigneeId = matchingMember
        ? matchingMember.id || matchingMember.userId
        : newAssigneeName === "Unassigned"
        ? null
        : newAssigneeName;

      await TasksService.update(projectId, taskId, { assigneeId: assigneeId as any });
    } catch (err) {
      console.warn("Could not update task assignee on backend:", err);
    }
  };

  const filteredTasks = tasks.filter(
    (t) =>
      t.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.description.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const visibleColumns = isCompletedProject
    ? COLUMNS.filter((c) => c.id === "ACCEPTED" || c.id === "DONE")
    : COLUMNS;

  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return null;
  }

  if (loading) {
    return (
      <div style={{ padding: "100px 20px", textAlign: "center", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
        <div style={{
          width: 36,
          height: 36,
          border: "3px solid #e5e7eb",
          borderTop: "3px solid #161616",
          borderRadius: "50%",
          animation: "spin 0.8s linear infinite",
          marginBottom: 16,
        }} />
        <style>{`@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }`}</style>
        <p style={{ fontSize: 14, color: "#161616", fontWeight: 600, margin: 0 }}>
          Loading Task Board…
        </p>
        <p style={{ fontSize: 12, color: "#888888", margin: 0, marginTop: 4 }}>
          Fetching project tasks and assigned team members
        </p>
      </div>
    );
  }

  return (
    <div suppressHydrationWarning>
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
                    onClick={() => setSelectedTask(task)}
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
                      cursor: "pointer",
                    }}
                  >
                    <div style={s.taskCardTop}>
                      <span style={s.taskId} title={`Full ID: ${task.id}`}>
                        #{task.id.length > 8 ? task.id.substring(0, 8) : task.id}
                      </span>
                      <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                        {task.isAiGenerated && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedTask(task);
                            }}
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
                    {task.description && <p style={s.taskDesc}>{task.description}</p>}

                    <div style={s.taskCardBottom}>
                      <span style={s.taskDue}>{task.dueDate}</span>

                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        {isCompletedProject ? (
                          <span style={s.completedBadge}>✓ Completed</span>
                        ) : (
                          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                            {task.status === "DONE" && (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleMoveTask(task.id, "ACCEPTED");
                                }}
                                style={{
                                  padding: "4px 10px",
                                  fontSize: 11,
                                  fontWeight: 700,
                                  color: "#ffffff",
                                  background: "#2e7d32",
                                  border: "none",
                                  borderRadius: 4,
                                  cursor: "pointer",
                                }}
                                title="Accept this task"
                              >
                                Accept Task ✓
                              </button>
                            )}
                            <select
                              value={task.status}
                              onClick={(e) => e.stopPropagation()}
                              onChange={(e) => {
                                e.stopPropagation();
                                handleMoveTask(task.id, e.target.value as TaskStatus);
                              }}
                              style={s.statusSelect}
                            >
                              <option value="TODO">To Do</option>
                              <option value="IN_PROGRESS">In Progress</option>
                              <option value="DONE">Completed (Pending Review)</option>
                              <option value="ACCEPTED">Accepted ✓</option>
                              <option value="BLOCKED">Blocked</option>
                            </select>
                          </div>
                        )}

                        <span
                          style={{
                            ...s.assigneeAvatar,
                            background: (!task.assignee || task.assignee === "Unassigned") ? "#f0f0f0" : "#161616",
                            color: (!task.assignee || task.assignee === "Unassigned") ? "#757575" : "#ffffff",
                            border: (!task.assignee || task.assignee === "Unassigned") ? "1px solid #d0d0d0" : "none",
                            cursor: "pointer",
                          }}
                          title={`Assignee: ${task.assignee || "Unassigned"} (Click to reassign)`}
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedTask(task);
                          }}
                        >
                          {getInitials(task.assignee)}
                        </span>
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

      {/* ── Task Details Modal ─────────────────────────────────────────────────── */}
      {selectedTask && (
        <div style={m.overlay} onClick={() => setSelectedTask(null)}>
          <div style={{ ...m.modal, maxWidth: 560, borderRadius: 10, overflow: "hidden" }} onClick={(e) => e.stopPropagation()}>
            <div style={{ ...m.header, background: "#fcfcfc", borderBottom: "1px solid #eee", padding: "18px 24px" }}>
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <h3 style={{ ...m.title, fontSize: 17, fontWeight: 700 }}>
                    {selectedTask.isAiGenerated ? "⚡ AI Task Review" : "📋 Task Card Details"}
                  </h3>
                  <span style={{ fontSize: 11, fontFamily: "monospace", color: "#666", background: "#f0f0f0", padding: "2px 8px", borderRadius: 4, fontWeight: 600 }}>
                    #{selectedTask.id.length > 8 ? selectedTask.id.substring(0, 8) : selectedTask.id}
                  </span>
                </div>
                <p style={{ ...m.sub, fontSize: 11, color: "#9e9e9e", marginTop: 4, wordBreak: "break-all" }}>
                  Full ID: <code style={{ background: "#f5f5f5", padding: "1px 5px", borderRadius: 3, fontSize: 11 }}>{selectedTask.id}</code>
                </p>
              </div>
              <button onClick={() => setSelectedTask(null)} style={m.closeBtn}>✕</button>
            </div>

            <div style={{ ...m.body, padding: "20px 24px", display: "flex", flexDirection: "column", gap: 16 }}>
              {/* Task Title */}
              <div>
                <span style={{ ...m.label, fontSize: 10, letterSpacing: "0.8px", color: "#9e9e9e", fontWeight: 700 }}>TASK TITLE</span>
                <p style={{ fontSize: 15, fontWeight: 700, color: "#161616", marginTop: 4, lineHeight: 1.4 }}>{selectedTask.title}</p>
              </div>

              {/* Description */}
              <div style={{ background: "#f9fafb", border: "1px solid #f0f0f0", borderRadius: 6, padding: "12px 14px" }}>
                <span style={{ ...m.label, fontSize: 10, letterSpacing: "0.8px", color: "#9e9e9e", fontWeight: 700 }}>DESCRIPTION</span>
                <p style={{ fontSize: 13, color: "#424242", lineHeight: 1.5, marginTop: 4 }}>
                  {selectedTask.description || "No description provided for this task card."}
                </p>
              </div>

              {/* Metadata Grid */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12, background: "#ffffff", border: "1px solid #e8e8e8", borderRadius: 8, padding: "12px 14px" }}>
                {/* Status */}
                <div>
                  <span style={{ ...m.label, fontSize: 10, letterSpacing: "0.8px", color: "#9e9e9e", fontWeight: 700 }}>STATUS</span>
                  <div style={{ marginTop: 4 }}>
                    <span style={{
                      fontSize: 11,
                      fontWeight: 700,
                      padding: "3px 8px",
                      borderRadius: 12,
                      background: selectedTask.status === "ACCEPTED" ? "#e8f5e9" : selectedTask.status === "DONE" ? "#f3e8ff" : selectedTask.status === "IN_PROGRESS" ? "#e3f2fd" : selectedTask.status === "BLOCKED" ? "#fee2e2" : "#f5f5f5",
                      color: selectedTask.status === "ACCEPTED" ? "#2e7d32" : selectedTask.status === "DONE" ? "#6b21a8" : selectedTask.status === "IN_PROGRESS" ? "#1565c0" : selectedTask.status === "BLOCKED" ? "#dc2626" : "#616161",
                      display: "inline-block"
                    }}>
                      {selectedTask.status === "ACCEPTED" ? "Accepted ✓" : selectedTask.status === "DONE" ? "Completed (Pending Review)" : selectedTask.status === "IN_PROGRESS" ? "In Progress" : selectedTask.status === "BLOCKED" ? "Blocked" : "To Do"}
                    </span>
                  </div>
                </div>

                {/* Assignee */}
                <div>
                  <span style={{ ...m.label, fontSize: 10, letterSpacing: "0.8px", color: "#9e9e9e", fontWeight: 700 }}>ASSIGNEE</span>
                  <div style={{ marginTop: 4 }}>
                    {!isCompletedProject ? (
                      <select
                        value={selectedTask.assignee || "Unassigned"}
                        onChange={(e) => handleReassignTask(selectedTask.id, e.target.value)}
                        style={{
                          fontSize: 12,
                          fontWeight: 600,
                          padding: "4px 8px",
                          borderRadius: 6,
                          border: "1px solid #d0d0d0",
                          outline: "none",
                          background: "#ffffff",
                          color: "#161616",
                          width: "100%",
                          cursor: "pointer",
                        }}
                      >
                        <option value="Unassigned">Unassigned (UA)</option>
                        {availableMembers.map((mem) => {
                          const name = mem.displayName || mem.userDisplayName || mem.email;
                          return (
                            <option key={mem.id || mem.userId || name} value={name}>
                              {name}
                            </option>
                          );
                        })}
                      </select>
                    ) : (
                      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                        <span style={{
                          width: 20,
                          height: 20,
                          borderRadius: 10,
                          background: (!selectedTask.assignee || selectedTask.assignee === "Unassigned") ? "#e0e0e0" : "#161616",
                          color: (!selectedTask.assignee || selectedTask.assignee === "Unassigned") ? "#616161" : "#ffffff",
                          fontSize: 9,
                          fontWeight: 700,
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center"
                        }}>
                          {getInitials(selectedTask.assignee)}
                        </span>
                        <span style={{ fontSize: 12, fontWeight: 600, color: "#161616" }}>
                          {selectedTask.assignee || "Unassigned"}
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Priority */}
                <div>
                  <span style={{ ...m.label, fontSize: 10, letterSpacing: "0.8px", color: "#9e9e9e", fontWeight: 700 }}>PRIORITY</span>
                  <div style={{ marginTop: 4 }}>
                    <span style={{
                      fontSize: 10,
                      fontWeight: 700,
                      padding: "3px 8px",
                      borderRadius: 3,
                      background: selectedTask.priority === "HIGH" ? "#fde8e8" : selectedTask.priority === "MEDIUM" ? "#fff8e1" : "#f5f5f5",
                      color: selectedTask.priority === "HIGH" ? "#c62828" : selectedTask.priority === "MEDIUM" ? "#f57f17" : "#616161",
                      display: "inline-block"
                    }}>
                      {selectedTask.priority}
                    </span>
                  </div>
                </div>
              </div>

              {/* Activity / AI Context */}
              <div style={{
                background: selectedTask.isAiGenerated ? "#f5f3ff" : "#fafafa",
                border: selectedTask.isAiGenerated ? "1px solid #ddd6fe" : "1px solid #eee",
                borderRadius: 6,
                padding: "12px 14px"
              }}>
                <span style={{ ...m.label, fontSize: 10, letterSpacing: "0.8px", color: selectedTask.isAiGenerated ? "#6d28d9" : "#9e9e9e", fontWeight: 700 }}>
                  {selectedTask.isAiGenerated ? "🤖 AI CONTEXT & RECOMMENDATION" : "🕒 ACTIVITY LOG"}
                </span>
                <p style={{ fontSize: 12, color: selectedTask.isAiGenerated ? "#5b21b6" : "#616161", lineHeight: 1.5, marginTop: 4 }}>
                  {selectedTask.isAiGenerated
                    ? "This task was automatically drafted by the localized context engine. Validate requirements before transitioning stages."
                    : `Task active since ${selectedTask.dueDate || "recent sprint"}. All updates are synchronized in real-time across team workspaces.`}
                </p>
              </div>
            </div>

            <div style={{ ...m.footer, padding: "14px 24px 18px", borderTop: "1px solid #eee" }}>
              <button
                onClick={() => setSelectedTask(null)}
                style={m.btnPrimary}
              >
                Close Details
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
                    <option value="">Select Assignee...</option>
                    {availableMembers.map((mem: any) => {
                      const id = mem.id || mem.userId;
                      const name = mem.displayName || mem.userDisplayName || mem.email;
                      return (
                        <option key={id} value={name}>
                          {name}
                        </option>
                      );
                    })}
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
