"use client";

import React, { useState, useEffect } from "react";
import { api } from "@/lib/api";

const S = {
  container: {
    display: "flex",
    flexDirection: "column" as const,
    gap: "24px",
    height: "100%",
  },
  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
  },
  projectSelect: {
    padding: "10px 16px",
    borderRadius: "var(--radius-sm)",
    border: "1px solid var(--border)",
    background: "var(--white)",
    fontSize: "15px",
    color: "var(--text-main)",
    outline: "none",
    minWidth: "250px",
  },
  addBtn: {
    background: "var(--navy-900)",
    color: "var(--white)",
    border: "none",
    padding: "10px 20px",
    borderRadius: "var(--radius-sm)",
    fontWeight: 500,
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    gap: "8px",
    transition: "background 0.2s ease",
  },
  board: {
    display: "grid",
    gridTemplateColumns: "repeat(3, 1fr)",
    gap: "24px",
    flex: 1,
    minHeight: "500px",
  },
  column: {
    background: "var(--white)",
    borderRadius: "var(--radius)",
    display: "flex",
    flexDirection: "column" as const,
    border: "1px solid var(--border)",
    overflow: "hidden",
  },
  columnHeader: {
    padding: "16px",
    background: "var(--navy-100)",
    color: "var(--navy-900)",
    fontWeight: 600,
    fontSize: "15px",
    borderBottom: "1px solid var(--border)",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
  },
  taskCount: {
    background: "rgba(255,255,255,0.6)",
    padding: "2px 8px",
    borderRadius: "12px",
    fontSize: "12px",
  },
  columnBody: {
    padding: "16px",
    display: "flex",
    flexDirection: "column" as const,
    gap: "12px",
    flex: 1,
    overflowY: "auto" as const,
  },
  card: {
    background: "var(--white)",
    border: "1px solid var(--border)",
    borderRadius: "var(--radius-sm)",
    padding: "16px",
    boxShadow: "var(--shadow-sm)",
    display: "flex",
    flexDirection: "column" as const,
    gap: "12px",
    position: "relative" as const,
  },
  cardHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: "12px",
  },
  cardTitle: {
    fontWeight: 500,
    fontSize: "15px",
    color: "var(--navy-900)",
    margin: 0,
  },
  deleteBtn: {
    background: "transparent",
    border: "none",
    color: "var(--text-muted)",
    cursor: "pointer",
    padding: "4px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    borderRadius: "4px",
  },
  badge: (priority: string) => {
    let bg = "var(--navy-100)";
    let color = "var(--navy-900)";
    if (priority === "CRITICAL") { bg = "#fde8e8"; color = "#b91c1c"; }
    else if (priority === "HIGH") { bg = "var(--navy-900)"; color = "var(--white)"; }
    else if (priority === "MEDIUM") { bg = "var(--navy-700)"; color = "var(--white)"; }
    else if (priority === "LOW") { bg = "#f0f0f0"; color = "var(--text-muted)"; }

    return {
      background: bg,
      color: color,
      padding: "4px 8px",
      borderRadius: "4px",
      fontSize: "11px",
      fontWeight: 600,
      letterSpacing: "0.02em",
    };
  },
  cardFooter: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    borderTop: "1px solid var(--border)",
    paddingTop: "12px",
    marginTop: "4px",
  },
  date: {
    fontSize: "12px",
    color: "var(--text-muted)",
    display: "flex",
    alignItems: "center",
    gap: "4px",
  },
  statusSelect: {
    fontSize: "12px",
    padding: "4px 8px",
    borderRadius: "4px",
    border: "1px solid var(--border)",
    background: "var(--off-white)",
    color: "var(--navy-900)",
    outline: "none",
    cursor: "pointer",
  }
};

interface Task {
  id: string;
  title: string;
  description?: string;
  status: "TODO" | "IN_PROGRESS" | "DONE" | "CANCELLED";
  priority: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  projectId: string;
  dueDate?: string;
}

const MOCK_TASKS: Task[] = [
  { id: "1", title: "Setup Database Schema", status: "DONE", priority: "HIGH", projectId: "1", dueDate: "2026-08-15" },
  { id: "2", title: "Write API Documentation", status: "IN_PROGRESS", priority: "MEDIUM", projectId: "1", dueDate: "2026-08-20" },
  { id: "3", title: "Implement Auth Middleware", status: "TODO", priority: "CRITICAL", projectId: "1", dueDate: "2026-08-14" },
];

export default function TasksPage() {
  const [projects, setProjects] = useState<any[]>([{ id: "1", name: "Alpha Project" }]);
  const [selectedProjectId, setSelectedProjectId] = useState<string>("1");
  const [tasks, setTasks] = useState<Task[]>(MOCK_TASKS);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    // Fetch projects
    api.get<any[]>("/api/projects")
      .then(data => {
        if (data && data.length > 0) {
          setProjects(data);
          setSelectedProjectId(data[0].id);
        }
      })
      .catch(err => console.log("Using mock projects (backend offline)"));
  }, []);

  useEffect(() => {
    if (!selectedProjectId) return;
    setIsLoading(true);
    api.get<Task[]>(`/api/projects/${selectedProjectId}/tasks`)
      .then(data => setTasks(data))
      .catch(err => {
        console.log("Using mock tasks (backend offline)");
        setTasks(MOCK_TASKS);
      })
      .finally(() => setIsLoading(false));
  }, [selectedProjectId]);

  const handleStatusChange = (taskId: string, newStatus: Task["status"]) => {
    // Optimistic update
    setTasks(prev => prev.map(t => t.id === taskId ? { ...t, status: newStatus } : t));
    
    api.put(`/api/projects/${selectedProjectId}/tasks/${taskId}`, { status: newStatus })
      .catch(err => {
        console.error("Failed to update status", err);
        // Fallback would go here
      });
  };

  const handleDelete = (taskId: string) => {
    setTasks(prev => prev.filter(t => t.id !== taskId));
    api.del(`/api/projects/${selectedProjectId}/tasks/${taskId}`)
      .catch(err => console.error("Failed to delete", err));
  };

  const columns = [
    { id: "TODO", label: "To Do" },
    { id: "IN_PROGRESS", label: "In Progress" },
    { id: "DONE", label: "Done" }
  ];

  return (
    <div style={S.container}>
      <header style={S.header}>
        <select 
          style={S.projectSelect} 
          value={selectedProjectId} 
          onChange={(e) => setSelectedProjectId(e.target.value)}
        >
          {projects.map(p => (
            <option key={p.id} value={p.id}>{p.name}</option>
          ))}
        </select>

        <button style={S.addBtn}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="12" y1="5" x2="12" y2="19"></line>
            <line x1="5" y1="12" x2="19" y2="12"></line>
          </svg>
          Add Task
        </button>
      </header>

      <div style={S.board}>
        {columns.map(col => {
          const colTasks = tasks.filter(t => t.status === col.id);
          
          return (
            <div key={col.id} style={S.column} className="animate-fade-up">
              <div style={S.columnHeader}>
                {col.label}
                <span style={S.taskCount}>{colTasks.length}</span>
              </div>
              
              <div style={S.columnBody}>
                {colTasks.map(task => (
                  <div key={task.id} style={S.card}>
                    <div style={S.cardHeader}>
                      <h3 style={S.cardTitle}>{task.title}</h3>
                      <button style={S.deleteBtn} onClick={() => handleDelete(task.id)} title="Delete Task">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <polyline points="3 6 5 6 21 6"></polyline>
                          <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                        </svg>
                      </button>
                    </div>
                    
                    <div>
                      <span style={S.badge(task.priority)}>{task.priority}</span>
                    </div>

                    <div style={S.cardFooter}>
                      <div style={S.date}>
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
                          <line x1="16" y1="2" x2="16" y2="6"></line>
                          <line x1="8" y1="2" x2="8" y2="6"></line>
                          <line x1="3" y1="10" x2="21" y2="10"></line>
                        </svg>
                        {task.dueDate || "No date"}
                      </div>
                      
                      <select 
                        style={S.statusSelect}
                        value={task.status}
                        onChange={(e) => handleStatusChange(task.id, e.target.value as Task["status"])}
                      >
                        <option value="TODO">To Do</option>
                        <option value="IN_PROGRESS">In Progress</option>
                        <option value="DONE">Done</option>
                      </select>
                    </div>
                  </div>
                ))}
                
                {colTasks.length === 0 && (
                  <div style={{ textAlign: "center", padding: "32px 0", color: "var(--text-muted)", fontSize: "13px", border: "2px dashed var(--border)", borderRadius: "var(--radius-sm)" }}>
                    No tasks yet
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
