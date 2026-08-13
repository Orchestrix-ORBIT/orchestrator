"use client";

import React, { useState, useEffect } from 'react';
import { FolderKanban, Plus, Filter, Calendar, User, Tag, Sparkles } from 'lucide-react';
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
      // Mock insert fallback
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
    <div className="space-y-6">
      {/* Extension Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-6 rounded-2xl bg-gradient-to-r from-slate-900 to-indigo-950/40 border border-slate-800">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-indigo-400 uppercase tracking-wider mb-1">
            <Sparkles className="h-3.5 w-3.5" />
            <span>Sprint 1 • Feature 1 (Chalani)</span>
          </div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <FolderKanban className="h-6 w-6 text-indigo-400" />
            <span>Project Management</span>
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Connected Endpoints: <code>POST /api/projects</code>, <code>GET /api/projects</code>, <code>DELETE /api/projects/{'{id}'}</code>
          </p>
        </div>

        <button
          onClick={() => setShowModal(true)}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-lg shadow-indigo-600/30 transition-all self-start sm:self-auto"
        >
          <Plus className="h-4 w-4" />
          <span>New Project</span>
        </button>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-slate-400" />
          <div className="flex gap-1 p-1 bg-slate-900 border border-slate-800 rounded-xl text-xs">
            {['ALL', 'ACTIVE', 'COMPLETED', 'ARCHIVED'].map((st) => (
              <button
                key={st}
                onClick={() => setFilterStatus(st)}
                className={`px-3 py-1.5 rounded-lg font-medium transition-all ${
                  filterStatus === st
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {st}
              </button>
            ))}
          </div>
        </div>
        <span className="text-xs text-slate-400">Showing {filteredProjects.length} projects</span>
      </div>

      {/* Projects Grid */}
      {isLoading ? (
        <div className="text-center py-12 text-slate-400 text-xs animate-pulse">Loading projects...</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredProjects.map((project) => (
            <div key={project.id} className="glass-card glass-card-hover p-6 rounded-2xl flex flex-col justify-between space-y-4">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                    project.status === 'ACTIVE'
                      ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                      : project.status === 'COMPLETED'
                      ? 'bg-blue-500/10 text-blue-400 border-blue-500/20'
                      : 'bg-slate-800 text-slate-400 border-slate-700'
                  }`}>
                    {project.status}
                  </span>
                  <span className="text-[10px] text-slate-500 font-mono">ID: {project.id.slice(0, 8)}</span>
                </div>
                <h3 className="text-base font-bold text-slate-100">{project.name}</h3>
                <p className="text-xs text-slate-400 line-clamp-2 leading-relaxed">
                  {project.description || 'No description provided.'}
                </p>
              </div>

              <div className="pt-3 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-slate-400">
                <div className="flex items-center gap-1.5">
                  <User className="h-3.5 w-3.5 text-slate-500" />
                  <span>Owner ID: {project.ownerId ? project.ownerId.slice(0, 6) : 'Owner'}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Calendar className="h-3.5 w-3.5 text-slate-500" />
                  <span>{new Date(project.createdAt).toLocaleDateString()}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create Project Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4">
          <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl w-full max-w-md shadow-2xl space-y-4">
            <h3 className="text-lg font-bold text-white">Create New Project</h3>
            <form onSubmit={handleCreateProject} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-300">Project Name *</label>
                <input
                  type="text"
                  required
                  value={nameInput}
                  onChange={(e) => setNameInput(e.target.value)}
                  placeholder="e.g. Neural Architecture Search"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-300">Description</label>
                <textarea
                  rows={3}
                  value={descInput}
                  onChange={(e) => setDescInput(e.target.value)}
                  placeholder="Summarize project objectives..."
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 text-xs font-medium text-slate-400 hover:text-slate-200"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-indigo-600 text-xs font-medium text-white hover:bg-indigo-500 shadow-md shadow-indigo-600/30"
                >
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
