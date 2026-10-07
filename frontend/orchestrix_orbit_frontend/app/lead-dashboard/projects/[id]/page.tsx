"use client";

import React, { useState, useEffect, use, useCallback, useRef } from "react";
import Link from "next/link";

type TaskStatus = "TODO" | "IN_PROGRESS" | "DONE" | "ACCEPTED";

interface TaskItem {
  id: string;
  title: string;
  description: string;
  status: TaskStatus;
  assignee: string;
  assigneeId?: string;
  priority: "LOW" | "MEDIUM" | "HIGH";
  dueDate: string;
  isAiGenerated?: boolean;
}

type ProjectMeta = {
  id: string;
  name: string;
  status: "ACTIVE" | "COMPLETED";
};


import { ProjectsService } from "@/lib/services/projects";
import { TasksService } from "@/lib/services/tasks";
import { TeamsService } from "@/lib/services/teams";
import { useTasksRealtime } from "@/lib/useTasksRealtime";
import { getUserId } from "@/lib/auth";
import LoadingState from "@/components/ui/LoadingState";

const COLUMNS: { id: TaskStatus; title: string }[] = [
  { id: "TODO", title: "To Do" },
  { id: "IN_PROGRESS", title: "In Progress" },
  { id: "DONE", title: "Completed (Pending Review)" },
  { id: "ACCEPTED", title: "Accepted ✓" },
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
    {val: "ACCEPTED", label: "Accepted ✓"},
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
        <span>{options.find(o => o.val === value)?.shortLabel || options.find(o => o.val === value)?.label}</span>
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
  const [showOnlyMyTasks, setShowOnlyMyTasks] = useState(false);
  const [showNewTaskModal, setShowNewTaskModal] = useState(false);
  const [selectedTask, setSelectedTask] = useState<TaskItem | null>(null);
  const [titleInput, setTitleInput] = useState("");
  const [descInput, setDescInput] = useState("");
  const [assigneeInput, setAssigneeInput] = useState("");
  const [assigneeSearchQuery, setAssigneeSearchQuery] = useState("");
  const [availableMembers, setAvailableMembers] = useState<any[]>([]);
  const [priorityInput, setPriorityInput] = useState<"LOW" | "MEDIUM" | "HIGH">("MEDIUM");
  const [columnInput, setColumnInput] = useState<TaskStatus>("TODO");
  const [isCreateAssigneeOpen, setIsCreateAssigneeOpen] = useState(false);
  const [isCreatePriorityOpen, setIsCreatePriorityOpen] = useState(false);

  // Drag and drop state
  const [draggedTaskId, setDraggedTaskId] = useState<string | null>(null);
  const [dragOverCol, setDragOverCol] = useState<TaskStatus | null>(null);

  // Confirmation modal state
  const [pendingMove, setPendingMove] = useState<{ taskId: string; taskTitle: string; from: TaskStatus; to: TaskStatus } | null>(null);
  const [taskToDelete, setTaskToDelete] = useState<{ id: string; title: string } | null>(null);
  const [isAssigneeDropdownOpen, setIsAssigneeDropdownOpen] = useState(false);
  const [modalAssigneeSearch, setModalAssigneeSearch] = useState("");
  const [isPriorityDropdownOpen, setIsPriorityDropdownOpen] = useState(false);

  const STAGE_LABELS: Record<TaskStatus, string> = {
    TODO: "To Do",
    IN_PROGRESS: "In Progress",
    DONE: "Completed (Pending Review)",
    ACCEPTED: "Accepted ✓",
  };

  function requestMove(taskId: string, targetStatus: TaskStatus) {
    if (isCompletedProject) return;
    const task = tasks.find(t => t.id === taskId);
    if (!task || task.status === targetStatus) return;
    setPendingMove({ taskId, taskTitle: task.title, from: task.status, to: targetStatus });
  }

  useEffect(() => {
    async function loadData() {
      try {
        const proj = await ProjectsService.getById(projectId).catch(() => ({ id: projectId, name: `Project ${projectId.substring(0, 8)}`, status: "ACTIVE" as const, teamId: undefined as string | undefined }));
        
        const [taskList, members] = await Promise.all([
          TasksService.getByProject(projectId).catch(() => []),
          proj.teamId ? TeamsService.getTeamMembers(proj.teamId).catch(() => []) : Promise.resolve([]),
        ]);

        setProject(proj);
        setAvailableMembers(members);

        const mappedTasks: TaskItem[] = (taskList as any[]).map((t: any) => {
          let uiStatus: TaskStatus = "TODO";
          if (t.status === "ACCEPTED") uiStatus = "ACCEPTED";
          else if (t.status === "DONE" || t.status === "COMPLETED") uiStatus = "DONE";
          else if (t.status === "IN_PROGRESS") uiStatus = "IN_PROGRESS";
          else if (t.status === "BLOCKED") uiStatus = "TODO"; // fallback to TODO

          return {
            id: t.id,
            title: t.title,
            description: t.description || "",
            status: uiStatus,
            assignee: t.assigneeId
              ? ((members as any[]).find((m: any) => (m.userId || m.id) === t.assigneeId)
                  ? (members as any[]).find((m: any) => (m.userId || m.id) === t.assigneeId).displayName || t.assigneeId
                  : t.assigneeId)
              : "Unassigned",
            assigneeId: t.assigneeId,
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

  // ── Realtime polling every 8s ─────────────────────────────────────────────
  const availableMembersRef = useRef<any[]>([]);
  useEffect(() => { availableMembersRef.current = availableMembers; }, [availableMembers]);

  const handleRemoteUpdate = useCallback((remoteTasks: any[]) => {
    setTasks(prev => {
      const map = new Map(remoteTasks.map(t => [t.id, t]));
      const updated = prev.map(local => {
        const remote = map.get(local.id);
        if (!remote) return local;
        if (remote.status === local.status) return local;
        let uiStatus: TaskStatus = "TODO";
        if (remote.status === "ACCEPTED") uiStatus = "ACCEPTED";
        else if (remote.status === "DONE" || remote.status === "COMPLETED") uiStatus = "DONE";
        else if (remote.status === "IN_PROGRESS") uiStatus = "IN_PROGRESS";
        const match = availableMembersRef.current.find((m: any) => (m.userId || m.id) === remote.assigneeId);
        const assigneeName = match ? (match.displayName || match.email || remote.assigneeId) : (remote.assigneeId || "Unassigned");
        return { ...local, status: uiStatus, assignee: assigneeName, assigneeId: remote.assigneeId };
      });
      const existingIds = new Set(prev.map(t => t.id));
      const newItems: TaskItem[] = remoteTasks
        .filter(t => !existingIds.has(t.id))
        .map((t: any) => {
          let uiStatus: TaskStatus = "TODO";
          if (t.status === "ACCEPTED") uiStatus = "ACCEPTED";
          else if (t.status === "DONE" || t.status === "COMPLETED") uiStatus = "DONE";
          else if (t.status === "IN_PROGRESS") uiStatus = "IN_PROGRESS";
          const match = availableMembersRef.current.find((m: any) => (m.userId || m.id) === t.assigneeId);
          return {
            id: t.id, title: t.title, description: t.description || "",
            status: uiStatus,
            assignee: match ? (match.displayName || match.email) : t.assigneeId || "Unassigned",
            assigneeId: t.assigneeId,
            priority: (t.priority === "URGENT" || t.priority === "CRITICAL") ? "HIGH" : (t.priority || "MEDIUM"),
            dueDate: t.dueDate || "Active",
          };
        });
      return newItems.length > 0 ? [...updated, ...newItems] : updated;
    });
  }, []);

  useTasksRealtime([projectId], handleRemoteUpdate);

  const currentProject = project || { id: projectId, name: `Project ${projectId.substring(0, 8)}`, status: "ACTIVE" };
  const isCompletedProject = currentProject.status === "COMPLETED";

  // Progress
  const totalCount = tasks.length;
  const completedCount = tasks.filter((t) => t.status === "ACCEPTED").length;
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
        assigneeId: assigneeInput || undefined,
      });

      const newTask: TaskItem = {
        id: created.id,
        title: created.title,
        description: created.description || "",
        status: columnInput,
        assignee: assigneeInput
          ? (availableMembers.find((m: any) => (m.userId || m.id) === assigneeInput)
              ? availableMembers.find((m: any) => (m.userId || m.id) === assigneeInput).displayName
              : "Researcher")
          : "Unassigned",
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
    setPendingMove(null);
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

  const confirmDeleteTask = async () => {
    if (isCompletedProject || !taskToDelete) return;
    const taskId = taskToDelete.id;
    try {
      await TasksService.delete(projectId, taskId);
      setTasks((prev) => prev.filter((t) => t.id !== taskId));
      if (selectedTask?.id === taskId) setSelectedTask(null);
      setTaskToDelete(null);
    } catch (err) {
      alert("Failed to delete task: " + (err instanceof Error ? err.message : String(err)));
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

  const handleUpdatePriority = async (taskId: string, priority: "LOW" | "MEDIUM" | "HIGH") => {
    setTasks((prev) => prev.map((t) => (t.id === taskId ? { ...t, priority } : t)));
    if (selectedTask && selectedTask.id === taskId) {
      setSelectedTask((prev) => (prev ? { ...prev, priority } : null));
    }
    try {
      await TasksService.update(projectId, taskId, { priority: priority as any });
    } catch (err) {
      console.warn("Could not update priority:", err);
    }
    setIsPriorityDropdownOpen(false);
  };

  const myUserId = getUserId();
  const filteredTasks = tasks.filter(
    (t) => {
      const matchSearch = t.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          t.description.toLowerCase().includes(searchQuery.toLowerCase());
      if (!matchSearch) return false;
      if (showOnlyMyTasks && t.assigneeId !== myUserId) return false;
      return true;
    }
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
    return <LoadingState variant="kanban" title="Loading Task Board…" subtitle="Fetching project tasks and assigned team members" />;
  }

  return (
    <div suppressHydrationWarning>
      <div style={s.topNavRow}>
        <Link href="/lead-dashboard/projects" style={s.backLink}>
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
        <div style={{ display: "flex", alignItems: "center", gap: 16, flexWrap: "wrap", flexShrink: 0 }}>
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

          <button
            onClick={() => setShowOnlyMyTasks(!showOnlyMyTasks)}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              background: showOnlyMyTasks ? "#111827" : "#ffffff",
              color: showOnlyMyTasks ? "#ffffff" : "#374151",
              border: `1px solid ${showOnlyMyTasks ? "#111827" : "#d1d5db"}`,
              padding: "8px 14px",
              borderRadius: "8px",
              fontSize: "13px",
              fontWeight: 600,
              cursor: "pointer",
              transition: "all 0.2s",
              boxShadow: "0 1px 2px rgba(0,0,0,0.05)",
              whiteSpace: "nowrap",
              flexShrink: 0
            }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
              <circle cx="12" cy="7" r="4"></circle>
            </svg>
            My Tasks
          </button>

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
                if (dragOverCol !== col.id) setDragOverCol(col.id);
              }}
              onDragEnter={(e) => {
                if (isCompletedProject) return;
                e.preventDefault();
                if (dragOverCol !== col.id) setDragOverCol(col.id);
              }}
              onDragLeave={(e) => {
                if (isCompletedProject) return;
                const related = e.relatedTarget as Node;
                if (!e.currentTarget.contains(related)) {
                  setDragOverCol(null);
                }
              }}
              onDrop={(e) => {
                if (isCompletedProject) return;
                e.preventDefault();
                const id = e.dataTransfer.getData("text/plain") || draggedTaskId;
                if (id) requestMove(id, col.id);
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
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <div style={{ width: 8, height: 8, borderRadius: "50%", background: col.id === "TODO" ? "#d1d5db" : col.id === "IN_PROGRESS" ? "#f59e0b" : col.id === "DONE" ? "#8b5cf6" : "#10b981" }} />
                  <span style={s.colTitle}>
                    {isCompletedProject ? "All Completed Tasks" : col.title}
                  </span>
                </div>
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
                    className="card-depth"
                    style={{
                      padding: "16px",
                      cursor: "grab",
                      marginBottom: 12,
                      display: "flex",
                      flexDirection: "column",
                      gap: 12,
                      background: "#ffffff",
                      borderTop: "1px solid #e5e7eb",
                      borderRight: "1px solid #e5e7eb",
                      borderBottom: "1px solid #e5e7eb",
                      borderLeft: task.status === "DONE" && !isCompletedProject ? "4px solid #8b5cf6" : "1px solid #e5e7eb",
                      borderRadius: 10,
                      boxShadow: task.status === "DONE" && !isCompletedProject ? "0 4px 12px -2px rgba(139, 92, 246, 0.15)" : "0 2px 4px -1px rgba(0, 0, 0, 0.04), 0 1px 2px -1px rgba(0, 0, 0, 0.02)",
                    }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <span style={{ fontSize: 12, fontWeight: 600, color: "#6b7280", letterSpacing: "0.2px" }} title={`Full ID: ${task.id}`}>
                          {task.id.substring(0, 5).toUpperCase()}
                        </span>
                        {task.status === "DONE" && !isCompletedProject && (
                          <span style={{ background: "#f3e8ff", color: "#6d28d9", fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 10, border: "1px solid #e9d5ff" }}>
                            Requires Review
                          </span>
                        )}
                        {task.isAiGenerated && (
                          <button
                            type="button"
                            onClick={(e) => { e.stopPropagation(); setSelectedTask(task); }}
                            style={{ ...s.aiBadge, background: "linear-gradient(135deg, #f3e8ff 0%, #e0e7ff 100%)", color: "#4f46e5", border: "1px solid #c7d2fe" }}
                            title="Click to view AI details"
                          >
                            ✦ AI
                          </button>
                        )}
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
                        {isCompletedProject ? (
                          <span style={s.completedBadge}>✓ Completed</span>
                        ) : (
                          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>

                            <CustomStatusSelect
                              value={task.status}
                              onChange={(val) => requestMove(task.id, val)}
                            />
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
                  <div style={s.emptyCol}>
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#d1d5db" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginBottom: 8 }}>
                      <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                      <line x1="12" y1="8" x2="12" y2="16" />
                      <line x1="8" y1="12" x2="16" y2="12" />
                    </svg>
                    Drag tasks here
                  </div>
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
            <div style={{ width: 48, height: 48, borderRadius: "50%", background: pendingMove.to === "ACCEPTED" ? "#ecfdf5" : "#f0f4ff", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 20px" }}>
              <svg 
                style={{ transition: "transform 0.2s", transform: ["TODO", "IN_PROGRESS", "DONE", "ACCEPTED"].indexOf(pendingMove.from) > ["TODO", "IN_PROGRESS", "DONE", "ACCEPTED"].indexOf(pendingMove.to) ? "scaleX(-1)" : "none" }}
                width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={pendingMove.to === "ACCEPTED" ? "#10b981" : "#3b5bdb"} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                {pendingMove.to === "ACCEPTED" ? (
                  <path d="M20 6L9 17l-5-5"/>
                ) : (
                  <path d="M5 12h14M12 5l7 7-7 7"/>
                )}
              </svg>
            </div>
            <h3 style={{ fontSize: 18, fontWeight: 700, color: "#111827", margin: "0 0 8px", letterSpacing: "-0.5px" }}>
              {pendingMove.to === "ACCEPTED" ? "Accept Task?" : "Move Task?"}
            </h3>
            <p style={{ fontSize: 14, color: "#4b5563", margin: "0 0 28px", lineHeight: 1.5 }}>
              You are about to move <strong>&ldquo;{pendingMove.taskTitle}&rdquo;</strong> from{" "}
              <span style={{ fontWeight: 600, color: "#111827" }}>{STAGE_LABELS[pendingMove.from]}</span>{" "}
              to{" "}
              <span style={{ fontWeight: 600, color: pendingMove.to === "ACCEPTED" ? "#059669" : "#3b5bdb" }}>{STAGE_LABELS[pendingMove.to]}</span>.
            </p>
            <div style={{ display: "flex", gap: 12 }}>
              <button
                onClick={() => setPendingMove(null)}
                style={{ flex: 1, padding: "10px 16px", borderRadius: 8, border: "1px solid #e5e7eb", background: "#ffffff", fontSize: 13, fontWeight: 600, color: "#374151", cursor: "pointer", transition: "all 0.2s" }}
              >Cancel</button>
              <button
                onClick={() => handleMoveTask(pendingMove.taskId, pendingMove.to)}
                style={{ flex: 1, padding: "10px 16px", borderRadius: 8, border: "none", background: pendingMove.to === "ACCEPTED" ? "#059669" : "#111827", fontSize: 13, fontWeight: 600, color: "#fff", cursor: "pointer", transition: "all 0.2s", boxShadow: "0 4px 6px -1px rgba(0,0,0,0.1)" }}
              >{pendingMove.to === "ACCEPTED" ? "Accept Task" : "Confirm Move"}</button>
            </div>
          </div>
        </div>
      )}

      {/* ── Delete Confirmation Modal ──────────────────────────────────────────── */}
      {taskToDelete && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0, 0, 0, 0.25)", backdropFilter: "blur(4px)", zIndex: 300, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}
          onClick={() => setTaskToDelete(null)}>
          <div style={{ background: "#ffffff", borderRadius: 16, padding: 32, maxWidth: 400, width: "100%", boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.25)", border: "1px solid rgba(255,255,255,0.1)", textAlign: "center" }}
            onClick={e => e.stopPropagation()}>
            <div style={{ width: 48, height: 48, borderRadius: "50%", background: "#fef2f2", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 20px" }}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#dc2626" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2M10 11v6M14 11v6"/>
              </svg>
            </div>
            <h3 style={{ fontSize: 18, fontWeight: 700, color: "#111827", margin: "0 0 8px", letterSpacing: "-0.5px" }}>
              Delete Task?
            </h3>
            <p style={{ fontSize: 14, color: "#4b5563", margin: "0 0 28px", lineHeight: 1.5 }}>
              Are you sure you want to delete <strong>&ldquo;{taskToDelete.title}&rdquo;</strong>? This action cannot be undone.
            </p>
            <div style={{ display: "flex", gap: 12 }}>
              <button
                onClick={() => setTaskToDelete(null)}
                style={{ flex: 1, padding: "10px 16px", borderRadius: 8, border: "1px solid #e5e7eb", background: "#ffffff", fontSize: 13, fontWeight: 600, color: "#374151", cursor: "pointer", transition: "all 0.2s" }}
              >Cancel</button>
              <button
                onClick={confirmDeleteTask}
                style={{ flex: 1, padding: "10px 16px", borderRadius: 8, border: "none", background: "#dc2626", fontSize: 13, fontWeight: 600, color: "#fff", cursor: "pointer", transition: "all 0.2s", boxShadow: "0 4px 6px -1px rgba(220, 38, 38, 0.2)" }}
              >Delete Task</button>
            </div>
          </div>
        </div>
      )}

      {/* ── Task Details Modal ─────────────────────────────────────────────────── */}
      {selectedTask && (
        <div style={m.overlay} onClick={() => { setSelectedTask(null); setIsAssigneeDropdownOpen(false); setIsPriorityDropdownOpen(false); }}>
          <div style={{ ...m.modal, maxWidth: 560, borderRadius: 10, overflow: "hidden" }} onClick={(e) => { e.stopPropagation(); setIsAssigneeDropdownOpen(false); setIsPriorityDropdownOpen(false); }}>
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
                <div style={{ display: "flex", alignItems: "center", gap: 8, position: "relative" }} onClick={(e) => e.stopPropagation()}>
                  <span style={{ fontSize: 12, color: "#6b7280", fontWeight: 500 }}>Assignee</span>
                  {!isCompletedProject ? (
                    <div className="custom-dropdown-container">
                      <button
                        onClick={() => { setIsAssigneeDropdownOpen(!isAssigneeDropdownOpen); setIsPriorityDropdownOpen(false); }}
                        style={{ fontSize: 13, fontWeight: 500, padding: "4px 8px", borderRadius: 6, border: "1px solid transparent", outline: "none", background: isAssigneeDropdownOpen ? "#f3f4f6" : "transparent", color: "#111827", cursor: "pointer", display: "flex", alignItems: "center", gap: 6, transition: "background 0.2s" }}
                        onMouseEnter={e => e.currentTarget.style.background = "#f9fafb"}
                        onMouseLeave={e => e.currentTarget.style.background = isAssigneeDropdownOpen ? "#f3f4f6" : "transparent"}
                      >
                        {selectedTask.assignee || "Unassigned"}
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#6b7280" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M6 9l6 6 6-6"/></svg>
                      </button>
                      {isAssigneeDropdownOpen && (
                        <div style={{ position: "absolute", top: "100%", left: 0, marginTop: 4, background: "#ffffff", border: "1px solid #e5e7eb", borderRadius: 8, boxShadow: "0 10px 15px -3px rgba(0,0,0,0.1), 0 4px 6px -2px rgba(0,0,0,0.05)", zIndex: 100, minWidth: 200, overflow: "hidden", display: "flex", flexDirection: "column" }}>
                          {/* Search Input */}
                          <div style={{ padding: "8px", borderBottom: "1px solid #f3f4f6" }}>
                            <input
                              type="text"
                              autoFocus
                              placeholder="Search members..."
                              value={modalAssigneeSearch}
                              onChange={(e) => setModalAssigneeSearch(e.target.value)}
                              style={{ width: "100%", padding: "6px 8px", fontSize: 13, border: "1px solid #e5e7eb", borderRadius: 4, outline: "none" }}
                              onClick={(e) => e.stopPropagation()}
                            />
                          </div>
                          {/* Scrollable List */}
                          <div style={{ maxHeight: 200, overflowY: "auto", display: "flex", flexDirection: "column" }}>
                            {[{ id: "unassigned", displayName: "Unassigned" }, ...availableMembers]
                              .filter((mem) => {
                                const name = mem.displayName || mem.userDisplayName || mem.email || "Unassigned";
                                return name.toLowerCase().includes(modalAssigneeSearch.toLowerCase());
                              })
                              .map((mem) => {
                                const name = mem.displayName || mem.userDisplayName || mem.email || "Unassigned";
                                const isSelected = (selectedTask.assignee || "Unassigned") === name;
                                return (
                                  <button
                                    key={mem.id || mem.userId || name}
                                    onClick={() => { handleReassignTask(selectedTask.id, name); setIsAssigneeDropdownOpen(false); setModalAssigneeSearch(""); }}
                                    style={{ padding: "8px 12px", background: isSelected ? "#f9fafb" : "transparent", border: "none", textAlign: "left", fontSize: 13, fontWeight: 500, color: "#111827", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "space-between", transition: "background 0.1s" }}
                                    onMouseEnter={e => e.currentTarget.style.background = "#f3f4f6"}
                                    onMouseLeave={e => e.currentTarget.style.background = isSelected ? "#f9fafb" : "transparent"}
                                  >
                                    {name}
                                    {isSelected && <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#4f46e5" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>}
                                  </button>
                                );
                            })}
                            {[{ id: "unassigned", displayName: "Unassigned" }, ...availableMembers].filter((mem) => {
                                const name = mem.displayName || mem.userDisplayName || mem.email || "Unassigned";
                                return name.toLowerCase().includes(modalAssigneeSearch.toLowerCase());
                              }).length === 0 && (
                              <div style={{ padding: "12px", textAlign: "center", fontSize: 12, color: "#9ca3af" }}>No matches found</div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  ) : (
                    <span style={{ fontSize: 13, fontWeight: 500, color: "#111827", padding: "4px 8px" }}>
                      {selectedTask.assignee || "Unassigned"}
                    </span>
                  )}
                </div>

                {/* Priority */}
                <div style={{ display: "flex", alignItems: "center", gap: 8, position: "relative" }} onClick={(e) => e.stopPropagation()}>
                  <span style={{ fontSize: 12, color: "#6b7280", fontWeight: 500 }}>Priority</span>
                  {!isCompletedProject ? (
                    <div className="custom-dropdown-container">
                      <button
                        onClick={() => { setIsPriorityDropdownOpen(!isPriorityDropdownOpen); setIsAssigneeDropdownOpen(false); }}
                        style={{
                          fontSize: 11, fontWeight: 700, padding: "4px 8px", borderRadius: 6, border: "none", cursor: "pointer", display: "flex", alignItems: "center", gap: 6, transition: "opacity 0.2s",
                          background: selectedTask.priority === "HIGH" ? "#fef2f2" : selectedTask.priority === "MEDIUM" ? "#fffbeb" : "#f3f4f6",
                          color: selectedTask.priority === "HIGH" ? "#dc2626" : selectedTask.priority === "MEDIUM" ? "#d97706" : "#4b5563"
                        }}
                        onMouseEnter={e => e.currentTarget.style.opacity = "0.8"}
                        onMouseLeave={e => e.currentTarget.style.opacity = "1"}
                      >
                        {selectedTask.priority}
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M6 9l6 6 6-6"/></svg>
                      </button>
                      {isPriorityDropdownOpen && (
                        <div style={{ position: "absolute", top: "100%", left: 0, marginTop: 4, background: "#ffffff", border: "1px solid #e5e7eb", borderRadius: 8, boxShadow: "0 10px 15px -3px rgba(0,0,0,0.1), 0 4px 6px -2px rgba(0,0,0,0.05)", zIndex: 100, minWidth: 120, overflow: "hidden", display: "flex", flexDirection: "column" }}>
                          {(["LOW", "MEDIUM", "HIGH"] as const).map((pri) => {
                            const isSelected = selectedTask.priority === pri;
                            return (
                              <button
                                key={pri}
                                onClick={() => handleUpdatePriority(selectedTask.id, pri)}
                                style={{ padding: "8px 12px", background: isSelected ? "#f9fafb" : "transparent", border: "none", textAlign: "left", fontSize: 11, fontWeight: 700, color: pri === "HIGH" ? "#dc2626" : pri === "MEDIUM" ? "#d97706" : "#4b5563", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "space-between" }}
                                onMouseEnter={e => e.currentTarget.style.background = "#f3f4f6"}
                                onMouseLeave={e => e.currentTarget.style.background = isSelected ? "#f9fafb" : "transparent"}
                              >
                                {pri}
                                {isSelected && <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>}
                              </button>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  ) : (
                    <span style={{
                      fontSize: 11, fontWeight: 700, padding: "4px 8px", borderRadius: 4,
                      background: selectedTask.priority === "HIGH" ? "#fef2f2" : selectedTask.priority === "MEDIUM" ? "#fffbeb" : "#f3f4f6",
                      color: selectedTask.priority === "HIGH" ? "#dc2626" : selectedTask.priority === "MEDIUM" ? "#d97706" : "#4b5563"
                    }}>
                      {selectedTask.priority}
                    </span>
                  )}
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

            <div style={{ padding: "0 24px 24px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              {!isCompletedProject ? (
                <button
                  onClick={() => setTaskToDelete({ id: selectedTask.id, title: selectedTask.title })}
                  style={{ background: "transparent", border: "none", color: "#ef4444", fontSize: 13, fontWeight: 500, cursor: "pointer", padding: "8px 0", transition: "opacity 0.2s" }}
                  onMouseEnter={e => e.currentTarget.style.opacity = "0.7"}
                  onMouseLeave={e => e.currentTarget.style.opacity = "1"}
                >
                  Delete task
                </button>
              ) : (
                <div />
              )}
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
                <label style={m.label}>Task title <span style={{color: "#ef4444"}}>*</span></label>
                <input
                  required
                  placeholder="e.g. Implement AES-256 session token exchange"
                  value={titleInput}
                  onChange={(e) => setTitleInput(e.target.value)}
                  style={m.input}
                  className="search-input-premium"
                />
              </div>

              <div style={m.field}>
                <label style={m.label}>Description</label>
                <textarea
                  rows={3}
                  placeholder="Acceptance criteria, technical notes..."
                  value={descInput}
                  onChange={(e) => setDescInput(e.target.value)}
                  style={m.textarea}
                  className="search-input-premium"
                />
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <div style={{ ...m.field, position: "relative" }}>
                  <label style={m.label}>Assignee</label>
                  <div className="custom-dropdown-container" onClick={(e) => e.stopPropagation()}>
                    <button
                      type="button"
                      onClick={() => { setIsCreateAssigneeOpen(!isCreateAssigneeOpen); setIsCreatePriorityOpen(false); }}
                      style={{ ...m.select, width: "100%", display: "flex", justifyContent: "space-between", alignItems: "center", cursor: "pointer", background: "#ffffff", padding: "8px 12px", border: "1px solid #e5e7eb", borderRadius: 6, fontSize: 13 }}
                    >
                      {availableMembers.find(m => (m.userId || m.id) === assigneeInput)?.displayName || availableMembers.find(m => (m.userId || m.id) === assigneeInput)?.userDisplayName || availableMembers.find(m => (m.userId || m.id) === assigneeInput)?.email || "Unassigned"}
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#6b7280" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M6 9l6 6 6-6"/></svg>
                    </button>
                    {isCreateAssigneeOpen && (
                      <div style={{ position: "absolute", top: "100%", left: 0, marginTop: 4, background: "#ffffff", border: "1px solid #e5e7eb", borderRadius: 8, boxShadow: "0 10px 15px -3px rgba(0,0,0,0.1)", zIndex: 100, width: "100%", overflow: "hidden", display: "flex", flexDirection: "column" }}>
                        <div style={{ padding: "8px", borderBottom: "1px solid #f3f4f6" }}>
                          <input type="text" autoFocus placeholder="Search members..." value={assigneeSearchQuery} onChange={(e) => setAssigneeSearchQuery(e.target.value)} style={{ width: "100%", padding: "6px 8px", fontSize: 13, border: "1px solid #e5e7eb", borderRadius: 4, outline: "none" }} onClick={(e) => e.stopPropagation()} />
                        </div>
                        <div style={{ maxHeight: 200, overflowY: "auto", display: "flex", flexDirection: "column" }}>
                          {[{ id: "", displayName: "Unassigned" }, ...availableMembers]
                            .filter(mem => {
                              const name = mem.displayName || mem.userDisplayName || mem.email || "Unassigned";
                              return name.toLowerCase().includes(assigneeSearchQuery.toLowerCase());
                            })
                            .map(mem => {
                              const id = mem.userId || mem.id || "";
                              const name = mem.displayName || mem.userDisplayName || mem.email || "Unassigned";
                              const isSelected = assigneeInput === id;
                              return (
                                <button type="button" key={id || "unassigned"} onClick={() => { setAssigneeInput(id); setIsCreateAssigneeOpen(false); setAssigneeSearchQuery(""); }} style={{ padding: "8px 12px", background: isSelected ? "#f9fafb" : "transparent", border: "none", textAlign: "left", fontSize: 13, fontWeight: 500, color: "#111827", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "space-between" }} onMouseEnter={e => e.currentTarget.style.background = "#f3f4f6"} onMouseLeave={e => e.currentTarget.style.background = isSelected ? "#f9fafb" : "transparent"}>
                                  {name}
                                  {isSelected && <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#4f46e5" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>}
                                </button>
                              );
                            })}
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                <div style={{ ...m.field, position: "relative" }}>
                  <label style={m.label}>Priority</label>
                  <div className="custom-dropdown-container" onClick={(e) => e.stopPropagation()}>
                    <button
                      type="button"
                      onClick={() => { setIsCreatePriorityOpen(!isCreatePriorityOpen); setIsCreateAssigneeOpen(false); }}
                      style={{ ...m.select, width: "100%", display: "flex", justifyContent: "space-between", alignItems: "center", cursor: "pointer", background: "#ffffff", padding: "8px 12px", border: "1px solid #e5e7eb", borderRadius: 6, fontSize: 13, fontWeight: 600, color: priorityInput === "HIGH" ? "#dc2626" : priorityInput === "MEDIUM" ? "#d97706" : "#4b5563" }}
                    >
                      {priorityInput}
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#6b7280" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M6 9l6 6 6-6"/></svg>
                    </button>
                    {isCreatePriorityOpen && (
                      <div style={{ position: "absolute", top: "100%", left: 0, marginTop: 4, background: "#ffffff", border: "1px solid #e5e7eb", borderRadius: 8, boxShadow: "0 10px 15px -3px rgba(0,0,0,0.1)", zIndex: 100, width: "100%", overflow: "hidden", display: "flex", flexDirection: "column" }}>
                        {(["LOW", "MEDIUM", "HIGH"] as const).map(pri => (
                          <button type="button" key={pri} onClick={() => { setPriorityInput(pri); setIsCreatePriorityOpen(false); }} style={{ padding: "8px 12px", background: priorityInput === pri ? "#f9fafb" : "transparent", border: "none", textAlign: "left", fontSize: 13, fontWeight: 600, color: pri === "HIGH" ? "#dc2626" : pri === "MEDIUM" ? "#d97706" : "#4b5563", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "space-between" }} onMouseEnter={e => e.currentTarget.style.background = "#f3f4f6"} onMouseLeave={e => e.currentTarget.style.background = priorityInput === pri ? "#f9fafb" : "transparent"}>
                            {pri}
                            {priorityInput === pri && <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
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
    marginBottom: 20,
  },
  backLink: {
    display: "inline-flex",
    alignItems: "center",
    gap: 6,
    fontSize: 13,
    color: "#4b5563",
    textDecoration: "none",
    fontWeight: 500,
    background: "#f3f4f6",
    padding: "6px 12px",
    borderRadius: 20,
    transition: "background 0.2s",
  },
  projectTag: {
    fontSize: 12,
    color: "#6b7280",
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
    alignItems: "center",
    marginBottom: 32,
    flexWrap: "wrap",
    gap: 16,
  },
  pageTitle: {
    fontSize: 32,
    fontWeight: 700,
    color: "#111827",
    letterSpacing: "-0.8px",
    margin: 0,
    whiteSpace: "nowrap",
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
    border: "2px solid transparent", // Keep space reserved for the border
  },
  columnOver: {
    background: "rgba(59, 130, 246, 0.04)",
    border: "2px dashed rgba(59, 130, 246, 0.4)",
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
    border: "1px solid #f3f4f6",
    borderRadius: 4,
    padding: "14px 16px",
    boxShadow: "0 1px 2px rgba(0,0,0,0.02)",
  },
  taskCardTop: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
  },
  taskId: {
    fontSize: 11,
    fontWeight: 600,
    color: "#9e9e9e",
    fontFamily: "var(--font-mono)",
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
    color: "#111827",
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
    flexWrap: "wrap",
    gap: 8,
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
    color: "#374151",
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
    padding: "40px 12px",
    textAlign: "center" as const,
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
  overlay: {
    position: "fixed" as const,
    inset: 0,
    background: "rgba(0, 0, 0, 0.25)",
    backdropFilter: "blur(4px)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 100,
    padding: 20,
  },
  modal: {
    background: "#ffffff",
    border: "1px solid rgba(255,255,255,0.1)",
    borderRadius: 16,
    width: "100%",
    maxWidth: 520,
    boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.25)",
    overflow: "visible",
  },
  header: {
    padding: "24px 24px 16px",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
  },
  title: {
    fontSize: 20,
    fontWeight: 700,
    color: "#111827",
    letterSpacing: "-0.5px",
  },
  sub: {
    fontSize: 13,
    color: "#6b7280",
    marginTop: 2,
  },
  closeBtn: {
    background: "#f3f4f6",
    border: "none",
    width: 28,
    height: 28,
    borderRadius: "50%",
    fontSize: 14,
    color: "#4b5563",
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    transition: "background 0.2s",
  },
  body: {
    padding: "0 24px 24px",
    display: "flex",
    flexDirection: "column",
    gap: 20,
  },
  section: {
    borderBottom: "1px solid #f3f4f6",
    paddingBottom: 12,
  },
  label: {
    fontSize: 12,
    fontWeight: 600,
    color: "#374151",
    marginBottom: 2,
  },
  mainTitle: {
    fontSize: 15,
    fontWeight: 600,
    color: "#111827",
    marginTop: 4,
  },
  text: {
    fontSize: 13,
    color: "#4b5563",
    lineHeight: 1.5,
    marginTop: 6,
  },
  field: {
    display: "flex",
    flexDirection: "column",
    gap: 6,
  },
  input: {
    padding: "10px 14px",
    fontSize: 14,
    border: "1px solid #e5e7eb",
    borderRadius: 8,
    outline: "none",
    background: "#f9fafb",
    color: "#111827",
    transition: "border 0.2s, box-shadow 0.2s",
  },
  textarea: {
    padding: "10px 14px",
    fontSize: 14,
    border: "1px solid #e5e7eb",
    borderRadius: 8,
    outline: "none",
    background: "#f9fafb",
    color: "#111827",
    resize: "none",
    transition: "border 0.2s, box-shadow 0.2s",
  },
  select: {
    padding: "10px 14px",
    paddingRight: "36px",
    fontSize: 14,
    border: "1px solid #e5e7eb",
    borderRadius: 8,
    background: "#f9fafb url('data:image/svg+xml;utf8,<svg fill=\"none\" viewBox=\"0 0 24 24\" stroke=\"%239ca3af\" xmlns=\"http://www.w3.org/2000/svg\"><path stroke-linecap=\"round\" stroke-linejoin=\"round\" stroke-width=\"2\" d=\"M8 9l4-4 4 4m0 6l-4 4-4-4\"></path></svg>') no-repeat right 12px center",
    backgroundSize: "16px",
    appearance: "none",
    WebkitAppearance: "none",
    outline: "none",
    color: "#111827",
    transition: "border 0.2s, box-shadow 0.2s",
    cursor: "pointer",
  },
  footer: {
    display: "flex",
    justifyContent: "flex-end",
    gap: 12,
    paddingTop: 16,
    borderTop: "1px solid #f3f4f6",
    marginTop: 8,
  },
  btnPrimary: {
    padding: "10px 20px",
    background: "linear-gradient(180deg, #1f2937 0%, #111827 100%)",
    color: "#ffffff",
    border: "1px solid #030712",
    borderRadius: 8,
    fontSize: 14,
    fontWeight: 500,
    cursor: "pointer",
    boxShadow: "0 1px 2px rgba(0, 0, 0, 0.1), inset 0 1px 0 rgba(255,255,255,0.1)",
  },
  btnSecondary: {
    padding: "10px 18px",
    background: "#ffffff",
    color: "#374151",
    border: "1px solid #d1d5db",
    borderRadius: 8,
    fontSize: 14,
    fontWeight: 500,
    cursor: "pointer",
    boxShadow: "0 1px 2px rgba(0, 0, 0, 0.05)",
  },
};
