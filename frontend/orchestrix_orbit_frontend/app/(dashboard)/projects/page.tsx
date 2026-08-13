"use client";

import React, { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import { useTenant } from '@/context/TenantContext';

export interface ProjectItem {
  id: string;
  name: string;
  description: string;
  status: 'ACTIVE' | 'ARCHIVED' | 'COMPLETED';
  ownerId: string;
  createdAt: string;
}

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
  titleGroup: {
    display: "flex",
    flexDirection: "column" as const,
  },
  title: {
    fontSize: "24px",
    fontWeight: 600,
    color: "var(--navy-900)",
    margin: 0,
    display: "flex",
    alignItems: "center",
    gap: "8px",
  },
  subtitle: {
    fontSize: "13px",
    color: "var(--text-muted)",
    marginTop: "4px",
  },
  btnPrimary: {
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
  filters: {
    display: "flex",
    gap: "8px",
  },
  filterBtn: (isActive: boolean) => ({
    padding: "6px 12px",
    borderRadius: "var(--radius-sm)",
    border: "1px solid var(--border)",
    background: isActive ? "var(--navy-900)" : "var(--white)",
    color: isActive ? "var(--white)" : "var(--text-muted)",
    fontSize: "13px",
    fontWeight: 500,
    cursor: "pointer",
    transition: "all 0.2s ease",
  }),
  grid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))",
    gap: "24px",
  },
  card: {
    background: "var(--white)",
    borderRadius: "var(--radius)",
    border: "1px solid var(--border)",
    padding: "24px",
    display: "flex",
    flexDirection: "column" as const,
    gap: "16px",
    boxShadow: "var(--shadow-sm)",
    transition: "transform 0.2s, box-shadow 0.2s",
    cursor: "pointer",
  },
  cardHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  cardTitle: {
    fontSize: "16px",
    fontWeight: 600,
    color: "var(--navy-900)",
    margin: "0 0 8px 0",
  },
  cardDesc: {
    fontSize: "13px",
    color: "var(--text-muted)",
    lineHeight: 1.5,
    margin: 0,
    flex: 1,
  },
  badge: (status: string) => {
    let bg = "var(--navy-100)";
    let color = "var(--navy-900)";
    if (status === 'ACTIVE') { bg = "#e0f2fe"; color = "#0369a1"; }
    if (status === 'COMPLETED') { bg = "#dcfce7"; color = "#15803d"; }
    
    return {
      background: bg,
      color: color,
      padding: "4px 8px",
      borderRadius: "4px",
      fontSize: "11px",
      fontWeight: 600,
      border: `1px solid ${color}30`,
    };
  },
  cardFooter: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    paddingTop: "16px",
    borderTop: "1px solid var(--border)",
    fontSize: "12px",
    color: "var(--text-muted)",
  },
  modalOverlay: {
    position: "fixed" as const,
    inset: 0,
    background: "rgba(10, 34, 64, 0.5)",
    backdropFilter: "blur(4px)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 50,
  },
  modal: {
    background: "var(--white)",
    padding: "32px",
    borderRadius: "var(--radius)",
    width: "100%",
    maxWidth: "480px",
    boxShadow: "var(--shadow-md)",
  },
  inputGroup: {
    display: "flex",
    flexDirection: "column" as const,
    gap: "8px",
    marginBottom: "20px",
  },
  label: {
    fontSize: "14px",
    fontWeight: 500,
    color: "var(--navy-900)",
  },
  input: {
    padding: "12px",
    borderRadius: "var(--radius-sm)",
    border: "1px solid var(--border)",
    fontSize: "14px",
    outline: "none",
  },
  textarea: {
    padding: "12px",
    borderRadius: "var(--radius-sm)",
    border: "1px solid var(--border)",
    fontSize: "14px",
    outline: "none",
    minHeight: "100px",
    fontFamily: "inherit",
  },
  modalActions: {
    display: "flex",
    justifyContent: "flex-end",
    gap: "12px",
    marginTop: "32px",
  }
};

export default function ProjectsPage() {
  const { tenantSlug } = useTenant();
  const [projects, setProjects] = useState<ProjectItem[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [filterStatus, setFilterStatus] = useState<string>('ALL');

  // Modal State
  const [showModal, setShowModal] = useState<boolean>(false);
  const [nameInput, setNameInput] = useState<string>('');
  const [descInput, setDescInput] = useState<string>('');

  useEffect(() => {
    fetchProjects();
  }, [tenantSlug]);

  const fetchProjects = async () => {
    setIsLoading(true);
    try {
      const data = await api.get<ProjectItem[]>('/projects');
      if (Array.isArray(data)) {
        setProjects(data);
      }
    } catch (err) {
      console.warn('Backend offline, displaying starter mock projects.');
      setProjects([
        {
          id: 'p1',
          name: 'Quantum Privacy Orchestration',
          description: 'Researching zero-knowledge proofs for multi-tenant data isolation.',
          status: 'ACTIVE',
          ownerId: 'u1',
          createdAt: new Date().toISOString(),
        },
        {
          id: 'p2',
          name: 'GPU Resource Scheduler',
          description: 'Optimizing VRAM allocation algorithms across concurrent research labs.',
          status: 'ACTIVE',
          ownerId: 'u2',
          createdAt: new Date().toISOString(),
        },
        {
          id: 'p3',
          name: 'Federated Model Training Pipeline',
          description: 'Collaborative privacy-preserving model tuning on decentralized data nodes.',
          status: 'COMPLETED',
          ownerId: 'u1',
          createdAt: new Date().toISOString(),
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateProject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nameInput.trim()) return;

    try {
      const newProj = await api.post<ProjectItem>('/projects', {
        name: nameInput,
        description: descInput,
      });
      setProjects((prev) => [newProj, ...prev]);
    } catch (err) {
      const mockProj: ProjectItem = {
        id: `p-${Date.now()}`,
        name: nameInput,
        description: descInput,
        status: 'ACTIVE',
        ownerId: 'u1',
        createdAt: new Date().toISOString(),
      };
      setProjects((prev) => [mockProj, ...prev]);
    }

    setNameInput('');
    setDescInput('');
    setShowModal(false);
  };

  const filteredProjects = filterStatus === 'ALL' 
    ? projects 
    : projects.filter((p) => p.status === filterStatus);

  return (
    <div style={S.container}>
      <header style={S.header}>
        <div style={S.titleGroup}>
          <h2 style={S.title}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path>
            </svg>
            Project Management
          </h2>
          <span style={S.subtitle}>Manage your organization's research initiatives.</span>
        </div>

        <button style={S.btnPrimary} onClick={() => setShowModal(true)}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="12" y1="5" x2="12" y2="19"></line>
            <line x1="5" y1="12" x2="19" y2="12"></line>
          </svg>
          New Project
        </button>
      </header>

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div style={S.filters}>
          {['ALL', 'ACTIVE', 'COMPLETED', 'ARCHIVED'].map((st) => (
            <button
              key={st}
              onClick={() => setFilterStatus(st)}
              style={S.filterBtn(filterStatus === st)}
            >
              {st}
            </button>
          ))}
        </div>
        <span style={{ fontSize: "13px", color: "var(--text-muted)" }}>Showing {filteredProjects.length} projects</span>
      </div>

      {isLoading ? (
        <div style={{ textAlign: "center", padding: "48px", color: "var(--text-muted)" }}>Loading projects...</div>
      ) : (
        <div style={S.grid}>
          {filteredProjects.map((project) => (
            <div 
              key={project.id} 
              style={S.card} 
              className="animate-fade-up"
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = "translateY(-4px)";
                e.currentTarget.style.boxShadow = "var(--shadow-md)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = "translateY(0)";
                e.currentTarget.style.boxShadow = "var(--shadow-sm)";
              }}
            >
              <div>
                <div style={S.cardHeader}>
                  <h3 style={S.cardTitle}>{project.name}</h3>
                  <span style={S.badge(project.status)}>{project.status}</span>
                </div>
                <p style={S.cardDesc}>{project.description}</p>
              </div>

              <div style={S.cardFooter}>
                <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                    <circle cx="12" cy="7" r="4"></circle>
                  </svg>
                  Owner: {project.ownerId.slice(0, 6)}
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
                    <line x1="16" y1="2" x2="16" y2="6"></line>
                    <line x1="8" y1="2" x2="8" y2="6"></line>
                    <line x1="3" y1="10" x2="21" y2="10"></line>
                  </svg>
                  {new Date(project.createdAt).toLocaleDateString()}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {showModal && (
        <div style={S.modalOverlay}>
          <div style={S.modal} className="animate-fade-up">
            <h3 style={{ fontSize: "20px", fontWeight: 600, color: "var(--navy-900)", marginBottom: "24px" }}>Create New Project</h3>
            <form onSubmit={handleCreateProject}>
              <div style={S.inputGroup}>
                <label style={S.label}>Project Name *</label>
                <input
                  type="text"
                  required
                  value={nameInput}
                  onChange={(e) => setNameInput(e.target.value)}
                  placeholder="e.g. Neural Architecture Search"
                  style={S.input}
                />
              </div>

              <div style={S.inputGroup}>
                <label style={S.label}>Description</label>
                <textarea
                  rows={3}
                  value={descInput}
                  onChange={(e) => setDescInput(e.target.value)}
                  placeholder="Summarize project objectives..."
                  style={S.textarea}
                />
              </div>

              <div style={S.modalActions}>
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  style={{ ...S.filterBtn(false), padding: "10px 20px", border: "none" }}
                >
                  Cancel
                </button>
                <button type="submit" style={S.btnPrimary}>
                  Create Project
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
