"use client";

import { useEffect, useState } from "react";
import { TeamsService, type TeamMember, type TeamRole } from "@/lib/services/teams";
import { ProjectsService } from "@/lib/services/projects";
import LoadingState from "@/components/ui/LoadingState";

export default function LeadTeamPage() {
  const [members, setMembers]                       = useState<any[]>([]);
  const [loading, setLoading]                       = useState(true);
  const [error, setError]                           = useState<string | null>(null);
  const [selectedMemberForRemoval, setSelectedMemberForRemoval] = useState<any | null>(null);
  const [searchQuery, setSearchQuery]               = useState("");
  const [allProjects, setAllProjects]               = useState<any[]>([]);
  const [allOrgMembers, setAllOrgMembers]           = useState<any[]>([]);
  const [orgSearchQuery, setOrgSearchQuery]         = useState("");
  const [selectedMemberForAdd, setSelectedMemberForAdd] = useState<any | null>(null);
  const [projectSearchQuery, setProjectSearchQuery] = useState("");
  const [confirmUnassignProject, setConfirmUnassignProject] = useState<string | null>(null);
  const [confirmAddProject, setConfirmAddProject]   = useState<any | null>(null);
  const [confirmRevokeAll, setConfirmRevokeAll]     = useState<any | null>(null);

  useEffect(() => {
    async function loadTeamData() {
      try {
        const [projects, allMembers] = await Promise.all([
          ProjectsService.getAll().catch(() => []),
          TeamsService.getAllMembers().catch(() => [])
        ]);

        if (!projects || projects.length === 0) {
          setMembers([]);
          return;
        }
        setAllProjects(projects);

        // Read assigned members mapping from localStorage
        let assignmentsMap: Record<string, string[]> = {};
        try {
          assignmentsMap = JSON.parse(localStorage.getItem("project_assigned_members") || "{}");
        } catch (e) {}

        const researchers = (allMembers as any[]).filter(m => {
          const role = String(m.role || "").toUpperCase();
          const name = String(m.displayName || m.userDisplayName || "").toLowerCase();
          const email = String(m.email || m.userEmail || "").toLowerCase();
          return role === "RESEARCHER" || name.includes("researcher") || email.includes("researcher");
        });
        setAllOrgMembers(researchers);

        let updatedStorage = false;
        (projects as any[]).forEach(p => {
          if (!assignmentsMap[p.id] || !Array.isArray(assignmentsMap[p.id]) || assignmentsMap[p.id].length === 0) {
            if (researchers.length > 0) {
              assignmentsMap[p.id] = researchers.slice(0, 2).map(r => r.id || r.userId);
              updatedStorage = true;
            }
          }
        });

        if (updatedStorage) {
          try {
            localStorage.setItem("project_assigned_members", JSON.stringify(assignmentsMap));
          } catch (e) {}
        }

        const activeProjectIds = new Set((projects as any[]).map(p => p.id));
        const assignedUserIds = new Set<string>();

        Object.entries(assignmentsMap).forEach(([projId, memberIds]) => {
          if (activeProjectIds.has(projId) && Array.isArray(memberIds)) {
            memberIds.forEach((id: string) => assignedUserIds.add(id));
          }
        });

        // Filter workspace members and DEDUPLICATE their assigned projects
        const assignedMembers = (allMembers as any[])
          .filter(m => assignedUserIds.has(m.id || m.userId))
          .map(m => {
            const rawUserProjects = (projects as any[]).filter(p =>
              (assignmentsMap[p.id] || []).includes(m.id || m.userId)
            );

            // Deduplicate by project ID
            const uniqueProjects: any[] = [];
            const seenIds = new Set();
            rawUserProjects.forEach(p => {
              if (!seenIds.has(p.id)) {
                seenIds.add(p.id);
                uniqueProjects.push(p);
              }
            });

            return { ...m, assignedProjects: uniqueProjects };
          });

        setMembers(assignedMembers);
      } catch (e: any) {
        setError(e.message);
      } finally {
        setLoading(false);
      }
    }

    loadTeamData();
  }, []);

  function handleRemoveFromProject(projectId: string) {
    setConfirmUnassignProject(projectId);
  }

  function executeRemoveFromProject() {
    if (!selectedMemberForRemoval || !confirmUnassignProject) return;
    const projectId = confirmUnassignProject;
    const memberId = selectedMemberForRemoval.id || selectedMemberForRemoval.userId;

    try {
      const assignmentsMap = JSON.parse(localStorage.getItem("project_assigned_members") || "{}");
      if (Array.isArray(assignmentsMap[projectId])) {
        assignmentsMap[projectId] = assignmentsMap[projectId].filter((id: string) => id !== memberId);
      }
      localStorage.setItem("project_assigned_members", JSON.stringify(assignmentsMap));
    } catch (e) {}

    const updatedProjects = (selectedMemberForRemoval.assignedProjects || []).filter(
      (p: any) => p.id !== projectId
    );

    setSelectedMemberForRemoval({
      ...selectedMemberForRemoval,
      assignedProjects: updatedProjects,
    });

    setMembers((prev) =>
      prev
        .map((m: any) => {
          if ((m.id || m.userId) === memberId) {
            return { ...m, assignedProjects: updatedProjects };
          }
          return m;
        })
        .filter((m: any) => (m.assignedProjects || []).length > 0)
    );
    
    setConfirmUnassignProject(null);
  }

  function handleRemoveFromAll() {
    if (!selectedMemberForRemoval) return;
    setConfirmRevokeAll(selectedMemberForRemoval);
  }

  async function executeRemoveFromAll() {
    if (!confirmRevokeAll) return;
    const memberId = confirmRevokeAll.id || confirmRevokeAll.userId;

    try {
      await TeamsService.removeMemberRecord(memberId).catch(() => {});
      const assignmentsMap = JSON.parse(localStorage.getItem("project_assigned_members") || "{}");
      Object.keys(assignmentsMap).forEach((pId) => {
        if (Array.isArray(assignmentsMap[pId])) {
          assignmentsMap[pId] = assignmentsMap[pId].filter((id: string) => id !== memberId);
        }
      });
      localStorage.setItem("project_assigned_members", JSON.stringify(assignmentsMap));
    } catch (e) {}

    setMembers((prev) => prev.filter((m: any) => (m.id || m.userId) !== memberId));
    setConfirmRevokeAll(null);
    setSelectedMemberForRemoval(null);
  }

  function handleAddMemberToProject(projectId: string) {
    if (!selectedMemberForAdd) return;
    const memberId = selectedMemberForAdd.id || selectedMemberForAdd.userId;
    
    try {
      const assignmentsMap = JSON.parse(localStorage.getItem("project_assigned_members") || "{}");
      if (!Array.isArray(assignmentsMap[projectId])) assignmentsMap[projectId] = [];
      if (!assignmentsMap[projectId].includes(memberId)) {
        assignmentsMap[projectId].push(memberId);
      }
      localStorage.setItem("project_assigned_members", JSON.stringify(assignmentsMap));
    } catch (e) {}

    setMembers((prev) => {
      const project = allProjects.find(p => p.id === projectId);
      if (!project) return prev;
      
      const exists = prev.find(m => (m.id || m.userId) === memberId);
      if (exists) {
        return prev.map(m => {
          if ((m.id || m.userId) === memberId) {
            const currentProjects = m.assignedProjects || [];
            if (!currentProjects.find((p:any) => p.id === projectId)) {
              return { ...m, assignedProjects: [...currentProjects, project] };
            }
          }
          return m;
        });
      } else {
        return [...prev, { ...selectedMemberForAdd, assignedProjects: [project] }];
      }
    });

    setSelectedMemberForAdd(null);
    setConfirmAddProject(null);
  }

  const filteredMembers = members.filter((m: any) => {
    const q = searchQuery.toLowerCase();
    const name = (m.displayName || m.userDisplayName || "").toLowerCase();
    const email = (m.email || m.userEmail || "").toLowerCase();
    return name.includes(q) || email.includes(q);
  });

  const filteredOrgMembers = allOrgMembers.filter((m: any) => {
    const q = orgSearchQuery.toLowerCase();
    const name = (m.displayName || m.userDisplayName || "").toLowerCase();
    const email = (m.email || m.userEmail || "").toLowerCase();
    return name.includes(q) || email.includes(q);
  });

  if (loading) return <LoadingState variant="roster" title="Loading Team & Roster…" subtitle="Fetching researchers, project assignments, and team permissions" />;
  if (error)   return <p style={{ padding: 24, color: "#c62828", fontSize: 14 }}>Error: {error}</p>;

  return (
    <div>
      <style>{`
        .premium-search-input:focus {
          border-color: #111827 !important;
          outline: none !important;
          box-shadow: 0 0 0 3px rgba(17, 24, 39, 0.1) !important;
        }
        .btn-hover-danger:hover {
          background-color: #fee2e2 !important;
          border-color: #fca5a5 !important;
        }
        .btn-hover-dark:hover {
          background-color: #374151 !important;
        }
        .btn-hover-indigo:hover {
          background-color: #4338ca !important;
          border-color: #4338ca !important;
        }
        .btn-hover-outline:hover {
          background-color: #f3f4f6 !important;
          border-color: #9ca3af !important;
        }
        .btn-hover-red-solid:hover {
          background-color: #b91c1c !important;
        }
        .btn-hover-red-text:hover {
          color: #991b1b !important;
          text-decoration: underline;
        }
        .hover-badge:hover {
          background-color: #e5e7eb !important;
        }
      `}</style>
      <div style={s.header}>
        <div>
          <h1 style={s.title}>Team Management</h1>
          <p style={s.sub}>{members.length} assigned researcher{members.length !== 1 ? "s" : ""} across active workspace projects</p>
        </div>
        <div style={{ position: "relative", width: 280 }}>
          <svg style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "#9ca3af", width: 16, height: 16 }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path>
          </svg>
          <input
            type="text"
            className="premium-search-input"
            placeholder="Filter team members..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{ ...s.searchInput, width: "100%", paddingLeft: 36, background: "#f9fafb", transition: "all 0.2s" }}
          />
        </div>
      </div>

      <div style={s.card}>
        <div style={s.cardHead}>
          <span style={s.cardTitle}>Project Team Members</span>
          <span style={s.cardBadge}>{filteredMembers.length} Active</span>
        </div>
        <div style={s.tableWrapper}>
          <table style={s.table}>
          <thead>
            <tr>
              <th style={{ ...s.th, width: "26%" }}>MEMBER</th>
              <th style={{ ...s.th, width: "30%" }}>EMAIL</th>
              <th style={{ ...s.th, width: "30%" }}>ASSIGNED PROJECTS</th>
              <th style={{ ...s.th, width: "8%" }}>JOINED</th>
              <th style={{ ...s.th, width: "6%", textAlign: "right" }}>ACTIONS</th>
            </tr>
          </thead>
          <tbody>
            {filteredMembers.length === 0 ? (
              <tr><td colSpan={5} style={{ ...s.td, textAlign: "center", color: "#6b7280", padding: "36px 0" }}>
                No team members match your search filter.
              </td></tr>
            ) : filteredMembers.map((m: any, idx) => {
              const memberId = m.id || m.userId;
              const email = m.email || m.userEmail || "user@myorg.com";
              const name = m.displayName || m.userDisplayName || email.split("@")[0];
              const dateStr = m.createdAt || m.joinedAt ? new Date(m.createdAt || m.joinedAt).toLocaleDateString() : "Active";
              const assignedProjects: any[] = m.assignedProjects || m.projects || [];
              const visibleProjects = assignedProjects.slice(0, 2);
              const extraCount = assignedProjects.length - visibleProjects.length;

              return (
                <tr key={memberId || `member-${idx}`} style={s.tr}>
                  <td style={s.td}>
                    <div style={s.memberCell}>
                      <div style={s.avatar}>{name.charAt(0).toUpperCase()}</div>
                      <span style={s.memberName}>{name}</span>
                    </div>
                  </td>
                  <td style={s.td}>
                    <span style={s.memberEmail}>{email}</span>
                  </td>
                  <td style={s.td}>
                    <div 
                      style={{ display: "flex", flexWrap: "wrap", gap: 6, alignItems: "center", cursor: "pointer", padding: "4px 0" }}
                      onClick={() => setSelectedMemberForRemoval(m)}
                      title="Click to manage project assignments"
                    >
                      {visibleProjects.length > 0 ? (
                        visibleProjects.map((p: any) => (
                          <span key={p.id || p.name} style={s.badge}>
                            {p.name}
                          </span>
                        ))
                      ) : (
                        <span style={{ color: "#aaa", fontSize: 12 }}>None</span>
                      )}
                      {extraCount > 0 && (
                        <span style={s.moreBadge}>
                          +{extraCount} more
                        </span>
                      )}
                    </div>
                  </td>
                  <td style={s.td}>
                    <span style={{ fontSize: 12, color: "#757575" }}>{dateStr}</span>
                  </td>
                  <td style={{ ...s.td, textAlign: "right" }}>
                    <button
                      id={`btn-remove-${memberId}`}
                      className="btn-hover-danger"
                      style={s.removeBtn}
                      onClick={() => setSelectedMemberForRemoval(m)}
                    >
                      Remove
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
          </table>
        </div>
      </div>

      <div style={{ ...s.header, marginTop: 40 }}>
        <div>
          <h2 style={s.title}>Organization Directory</h2>
          <p style={s.sub}>All {allOrgMembers.length} registered researchers available to assign</p>
        </div>
        <div style={{ position: "relative", width: 280 }}>
          <svg style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "#9ca3af", width: 16, height: 16 }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path>
          </svg>
          <input
            type="text"
            className="premium-search-input"
            placeholder="Search all researchers..."
            value={orgSearchQuery}
            onChange={(e) => setOrgSearchQuery(e.target.value)}
            style={{ ...s.searchInput, width: "100%", paddingLeft: 36, background: "#f9fafb", transition: "all 0.2s" }}
          />
        </div>
      </div>

      <div style={s.card}>
        <div style={s.tableWrapper}>
          <table style={s.table}>
          <thead>
            <tr>
              <th style={{ ...s.th, width: "35%" }}>MEMBER</th>
              <th style={{ ...s.th, width: "35%" }}>EMAIL</th>
              <th style={{ ...s.th, width: "15%" }}>JOINED</th>
              <th style={{ ...s.th, width: "15%", textAlign: "right" }}>ACTIONS</th>
            </tr>
          </thead>
          <tbody>
            {filteredOrgMembers.length === 0 ? (
              <tr><td colSpan={4} style={{ ...s.td, textAlign: "center", color: "#6b7280", padding: "36px 0" }}>
                No researchers match your search.
              </td></tr>
            ) : filteredOrgMembers.map((m: any, idx) => {
              const memberId = m.id || m.userId;
              const email = m.email || m.userEmail || "user@myorg.com";
              const name = m.displayName || m.userDisplayName || email.split("@")[0];
              const dateStr = m.createdAt || m.joinedAt ? new Date(m.createdAt || m.joinedAt).toLocaleDateString("en-GB") : "Active";

              return (
                <tr key={`org-${memberId || idx}`} style={s.tr}>
                  <td style={s.td}>
                    <div style={s.memberCell}>
                      <div style={s.avatar}>{name.charAt(0).toUpperCase()}</div>
                      <span style={s.memberName}>{name}</span>
                    </div>
                  </td>
                  <td style={s.td}>
                    <span style={s.memberEmail}>{email}</span>
                  </td>
                  <td style={s.td}>
                    <span style={{ fontSize: 12, color: "#757575" }}>{dateStr}</span>
                  </td>
                  <td style={{ ...s.td, textAlign: "right" }}>
                    <button
                      className="btn-hover-dark"
                      style={{
                        padding: "6px 14px",
                        fontSize: 12,
                        fontWeight: 600,
                        color: "#ffffff",
                        background: "#111827",
                        border: "none",
                        borderRadius: 6,
                        cursor: "pointer",
                        transition: "all 0.2s"
                      }}
                      onClick={() => {
                        setSelectedMemberForAdd(m);
                        setProjectSearchQuery("");
                        setConfirmAddProject(null);
                      }}
                    >
                      + Add to Project
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
          </table>
        </div>
      </div>

      {/* ── Remove / Unassign Projects Modal ────────────────────────────────────── */}
      {selectedMemberForRemoval && (
        <div style={mStyles.overlay} onClick={() => setSelectedMemberForRemoval(null)}>
          <div style={mStyles.modal} onClick={(e) => e.stopPropagation()}>
            <div style={mStyles.header}>
              <div>
                <h3 style={mStyles.title}>Manage Project Assignments</h3>
                <p style={mStyles.sub}>
                  Unassign {selectedMemberForRemoval.displayName || selectedMemberForRemoval.userDisplayName || selectedMemberForRemoval.email} from specific projects or revoke all access.
                </p>
              </div>
              <button onClick={() => setSelectedMemberForRemoval(null)} style={mStyles.closeBtn}>✕</button>
            </div>

            <div style={mStyles.body}>
              <span style={{ fontSize: 12, fontWeight: 600, color: "#9ca3af", letterSpacing: "0.05em", textTransform: "uppercase", display: "block", marginBottom: 12 }}>
                Assigned Projects ({ (selectedMemberForRemoval.assignedProjects || []).length })
              </span>

              <div style={{ display: "flex", flexDirection: "column" }}>
                {(selectedMemberForRemoval.assignedProjects || []).length === 0 ? (
                  <p style={{ fontSize: 13, color: "#6b7280", padding: "12px 0" }}>No active projects assigned.</p>
                ) : (
                  (selectedMemberForRemoval.assignedProjects || []).map((p: any, idx: number, arr: any[]) => (
                    <div
                      key={p.id}
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        padding: "12px 0",
                        borderBottom: idx !== arr.length - 1 ? "1px solid #f3f4f6" : "none",
                      }}
                    >
                      <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                        <span style={{ fontSize: 14, fontWeight: 500, color: "#111827" }}>{p.name}</span>
                        <span style={{ fontFamily: "monospace", fontSize: 11, color: "#9ca3af", background: "#f3f4f6", padding: "2px 6px", borderRadius: 4, width: "fit-content" }}>
                          ID: {p.id.length > 8 ? p.id.substring(0, 8) : p.id}
                        </span>
                      </div>
                      <button
                        className="btn-hover-danger"
                        onClick={() => handleRemoveFromProject(p.id)}
                        style={{
                          padding: "6px 12px",
                          fontSize: 12,
                          fontWeight: 600,
                          color: "#ef4444",
                          background: "#fef2f2",
                          border: "1px solid #fee2e2",
                          borderRadius: 20,
                          cursor: "pointer",
                          transition: "all 0.2s"
                        }}
                      >
                        Unassign
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>

            <div style={{ ...mStyles.footer, display: "flex", justifyContent: "space-between", alignItems: "center", paddingTop: 16 }}>
              <button
                className="btn-hover-red-text"
                onClick={handleRemoveFromAll}
                style={{
                  padding: "8px 0",
                  fontSize: 13,
                  fontWeight: 600,
                  color: "#ef4444",
                  background: "transparent",
                  border: "none",
                  cursor: "pointer",
                  transition: "all 0.2s"
                }}
              >
                Revoke all access
              </button>
              <button
                className="btn-hover-dark"
                onClick={() => setSelectedMemberForRemoval(null)}
                style={{
                  padding: "8px 20px",
                  fontSize: 13,
                  fontWeight: 600,
                  color: "#ffffff",
                  background: "#111827",
                  border: "none",
                  borderRadius: 6,
                  cursor: "pointer",
                  boxShadow: "0 1px 2px rgba(0,0,0,0.05)",
                  transition: "all 0.2s"
                }}
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Revoke All Access Confirmation Modal ───────────────────────── */}
      {confirmRevokeAll && (
        <div style={{ ...mStyles.overlay, zIndex: 10001 }} onClick={() => setConfirmRevokeAll(null)}>
          <div style={{ ...mStyles.modal, maxWidth: 400, padding: 0, overflow: "hidden" }} onClick={(e) => e.stopPropagation()}>
            <div style={{ padding: "24px 24px 16px" }}>
              <div style={{ display: "flex", gap: 16 }}>
                <div style={{ background: "#fee2e2", color: "#dc2626", width: 40, height: 40, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                  <svg width="24" height="24" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path>
                  </svg>
                </div>
                <div>
                  <h3 style={{ fontSize: 18, fontWeight: 600, color: "#111827", margin: "0 0 8px 0" }}>Revoke all access</h3>
                  <p style={{ fontSize: 14, color: "#4b5563", margin: 0, lineHeight: 1.5 }}>
                    Are you sure you want to completely remove <strong>{confirmRevokeAll.displayName || confirmRevokeAll.userDisplayName || confirmRevokeAll.email}</strong> from all active projects? This action cannot be undone.
                  </p>
                </div>
              </div>
            </div>
            <div style={{ background: "#f9fafb", padding: "16px 24px", display: "flex", justifyContent: "flex-end", gap: 12, borderTop: "1px solid #f3f4f6" }}>
              <button
                className="btn-hover-outline"
                onClick={() => setConfirmRevokeAll(null)}
                style={{ padding: "8px 16px", fontSize: 13, fontWeight: 600, color: "#374151", background: "#ffffff", border: "1px solid #d1d5db", borderRadius: 6, cursor: "pointer", boxShadow: "0 1px 2px rgba(0,0,0,0.05)", transition: "all 0.2s" }}
              >
                Cancel
              </button>
              <button
                className="btn-hover-red-solid"
                onClick={executeRemoveFromAll}
                style={{ padding: "8px 16px", fontSize: 13, fontWeight: 600, color: "#ffffff", background: "#dc2626", border: "none", borderRadius: 6, cursor: "pointer", boxShadow: "0 1px 2px rgba(0,0,0,0.05)", transition: "all 0.2s" }}
              >
                Revoke Access
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Unassign Single Project Confirmation Modal ───────────────────────── */}
      {confirmUnassignProject && (
        <div style={{ ...mStyles.overlay, zIndex: 10002 }} onClick={() => setConfirmUnassignProject(null)}>
          <div style={{ ...mStyles.modal, maxWidth: 400, padding: 0, overflow: "hidden" }} onClick={(e) => e.stopPropagation()}>
            <div style={{ padding: "24px 24px 16px" }}>
              <div style={{ display: "flex", gap: 16 }}>
                <div style={{ background: "#fef2f2", color: "#ef4444", width: 40, height: 40, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                  <svg width="24" height="24" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                  </svg>
                </div>
                <div>
                  <h3 style={{ fontSize: 18, fontWeight: 600, color: "#111827", margin: "0 0 8px 0" }}>Unassign Project</h3>
                  <p style={{ fontSize: 14, color: "#4b5563", margin: 0, lineHeight: 1.5 }}>
                    Are you sure you want to remove this project assignment? The researcher will lose access to its resources immediately.
                  </p>
                </div>
              </div>
            </div>
            <div style={{ background: "#f9fafb", padding: "16px 24px", display: "flex", justifyContent: "flex-end", gap: 12, borderTop: "1px solid #f3f4f6" }}>
              <button
                className="btn-hover-outline"
                onClick={() => setConfirmUnassignProject(null)}
                style={{ padding: "8px 16px", fontSize: 13, fontWeight: 600, color: "#374151", background: "#ffffff", border: "1px solid #d1d5db", borderRadius: 6, cursor: "pointer", boxShadow: "0 1px 2px rgba(0,0,0,0.05)", transition: "all 0.2s" }}
              >
                Cancel
              </button>
              <button
                className="btn-hover-red-solid"
                onClick={executeRemoveFromProject}
                style={{ padding: "8px 16px", fontSize: 13, fontWeight: 600, color: "#ffffff", background: "#ef4444", border: "none", borderRadius: 6, cursor: "pointer", boxShadow: "0 1px 2px rgba(0,0,0,0.05)", transition: "all 0.2s" }}
              >
                Unassign
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Add to Project Modal ────────────────────────────────────── */}
      {selectedMemberForAdd && (
        <div style={mStyles.overlay} onClick={() => setSelectedMemberForAdd(null)}>
          <div style={mStyles.modal} onClick={(e) => e.stopPropagation()}>
            <div style={mStyles.header}>
              <div>
                <h3 style={mStyles.title}>{confirmAddProject ? "Confirm Assignment" : "Assign to Project"}</h3>
                <p style={mStyles.sub}>
                  {confirmAddProject 
                    ? "Please confirm this action." 
                    : `Select a workspace project to add ${selectedMemberForAdd.displayName || selectedMemberForAdd.userDisplayName || selectedMemberForAdd.email}.`}
                </p>
              </div>
              <button onClick={() => setSelectedMemberForAdd(null)} style={mStyles.closeBtn}>✕</button>
            </div>

            <div style={mStyles.body}>
              {confirmAddProject ? (
                <div style={{ textAlign: "center", padding: "10px 0 20px" }}>
                  <p style={{ fontSize: 14, color: "#374151", marginBottom: 24, lineHeight: 1.5 }}>
                    Are you sure you want to add <strong>{selectedMemberForAdd.displayName || selectedMemberForAdd.userDisplayName || selectedMemberForAdd.email}</strong> to the project <strong>{confirmAddProject.name}</strong>?
                  </p>
                  <div style={{ display: "flex", gap: 12, justifyContent: "center" }}>
                    <button className="btn-hover-outline" onClick={() => setConfirmAddProject(null)} style={{ padding: "8px 18px", borderRadius: 6, border: "1px solid #d1d5db", background: "#ffffff", color: "#374151", cursor: "pointer", fontSize: 13, fontWeight: 600, transition: "all 0.2s" }}>Cancel</button>
                    <button className="btn-hover-indigo" onClick={() => handleAddMemberToProject(confirmAddProject.id)} style={{ padding: "8px 18px", borderRadius: 6, border: "1px solid #4f46e5", background: "#4f46e5", color: "#ffffff", cursor: "pointer", fontSize: 13, fontWeight: 600, boxShadow: "0 1px 2px rgba(0,0,0,0.05)", transition: "all 0.2s" }}>Confirm & Assign</button>
                  </div>
                </div>
              ) : (
                <>
                  <div style={{ marginBottom: 16, position: "relative" }}>
                    <svg style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "#9ca3af", width: 16, height: 16 }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path>
                    </svg>
                    <input 
                      type="text"
                      className="premium-search-input"
                      placeholder="Search projects by name or ID..." 
                      value={projectSearchQuery}
                      onChange={e => setProjectSearchQuery(e.target.value)}
                      style={{
                        width: "100%", padding: "10px 14px 10px 36px", border: "1px solid #d1d5db", 
                        borderRadius: 6, fontSize: 13, outline: "none", background: "#f9fafb", transition: "all 0.2s"
                      }}
                    />
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                    {allProjects.filter(p => p.name.toLowerCase().includes(projectSearchQuery.toLowerCase()) || p.id.toLowerCase().includes(projectSearchQuery.toLowerCase())).map((p: any) => {
                      const alreadyAssigned = members.find(m => (m.id || m.userId) === (selectedMemberForAdd.id || selectedMemberForAdd.userId))?.assignedProjects?.some((ap: any) => ap.id === p.id);
                      return (
                        <div
                          key={p.id}
                          style={{
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "center",
                            padding: "10px 14px",
                            background: "#f9fafb",
                            border: "1px solid #f3f4f6",
                            borderRadius: 6,
                          }}
                        >
                          <div>
                            <span style={{ fontSize: 13, fontWeight: 600, color: "#111827" }}>{p.name}</span>
                            <span style={{ display: "block", fontSize: 11, color: "#6b7280", marginTop: 2 }}>
                              ID: {p.id.length > 8 ? p.id.substring(0, 8) : p.id}
                            </span>
                          </div>
                          {alreadyAssigned ? (
                            <span style={{ fontSize: 12, fontWeight: 600, color: "#9ca3af" }}>Added ✓</span>
                          ) : (
                            <button
                              className="btn-hover-indigo"
                              onClick={() => setConfirmAddProject(p)}
                              style={{
                                padding: "6px 14px",
                                fontSize: 12,
                                fontWeight: 600,
                                color: "#ffffff",
                                background: "#4f46e5",
                                border: "none",
                                borderRadius: 6,
                                cursor: "pointer",
                                transition: "all 0.2s"
                              }}
                            >
                              Add
                            </button>
                          )}
                        </div>
                      );
                    })}
                    {allProjects.filter(p => p.name.toLowerCase().includes(projectSearchQuery.toLowerCase()) || p.id.toLowerCase().includes(projectSearchQuery.toLowerCase())).length === 0 && (
                      <p style={{ fontSize: 13, color: "#6b7280", textAlign: "center", padding: "16px 0" }}>No projects match your search.</p>
                    )}
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const s: Record<string, React.CSSProperties> = {
  header: { display: "flex", flexWrap: "wrap", justifyContent: "space-between", alignItems: "center", marginBottom: 32, gap: 16 },
  title: { fontSize: "clamp(24px, 4vw, 32px)", fontWeight: 700, color: "#111827", marginBottom: 6, letterSpacing: "-0.02em" },
  sub: { fontSize: "clamp(13px, 2vw, 15px)", color: "#6b7280" },
  searchInput: {
    padding: "10px 16px",
    fontSize: "clamp(13px, 1.5vw, 14px)",
    border: "1px solid rgba(0,0,0,0.06)",
    borderRadius: 8,
    width: "100%",
    maxWidth: 320,
    outline: "none",
    background: "#ffffff",
    boxShadow: "0 1px 2px rgba(0,0,0,0.02)",
  },
  card: { 
    background: "#ffffff", 
    border: "1px solid rgba(0,0,0,0.06)", 
    borderRadius: 16, 
    boxShadow: "0 1px 3px rgba(0,0,0,0.02)",
    overflow: "hidden",
  },
  cardHead: { display: "flex", justifyContent: "space-between", alignItems: "center", padding: "24px 24px 20px" },
  cardTitle: { fontSize: "clamp(16px, 2.5vw, 18px)", fontWeight: 600, color: "#111827", margin: 0, letterSpacing: "-0.01em" },
  cardBadge: { fontSize: 11, fontWeight: 600, color: "#4f46e5", background: "#e0e7ff", padding: "4px 12px", borderRadius: 12 },
  tableWrapper: { width: "100%", overflowX: "auto" },
  table: { width: "100%", borderCollapse: "collapse", minWidth: 800 },
  th: { textAlign: "left" as const, fontSize: 11, fontWeight: 600, color: "#6b7280", letterSpacing: "0.05em", textTransform: "uppercase", padding: "12px 24px", borderBottom: "1px solid #e5e7eb", borderTop: "1px solid #f3f4f6", background: "#fafafa" },
  tr: { borderBottom: "1px solid #f3f4f6", transition: "background 0.2s" },
  td: { fontSize: "clamp(13px, 1.5vw, 14px)", color: "#374151", padding: "16px 24px", verticalAlign: "middle" as const },
  memberCell: { display: "flex", alignItems: "center", gap: 12 },
  avatar: { display: "inline-flex", alignItems: "center", justifyContent: "center", width: 36, height: 36, borderRadius: "50%", background: "#111827", color: "#fff", fontSize: 13, fontWeight: 600, flexShrink: 0 },
  memberName: { fontSize: "clamp(13px, 1.5vw, 14px)", fontWeight: 600, color: "#111827" },
  memberEmail: { fontSize: "clamp(13px, 1.5vw, 14px)", color: "#6b7280" },
  roleBadge: { display: "inline-block", padding: "4px 10px", borderRadius: 6, background: "#f3f4f6", border: "1px solid #e5e7eb", fontSize: 12, fontWeight: 500, color: "#374151" },
  removeBtn: { padding: "6px 14px", fontSize: 12, fontWeight: 600, color: "#ef4444", background: "transparent", border: "1px solid #fee2e2", borderRadius: 6, cursor: "pointer", transition: "all 0.2s" },
  badge: { display: "inline-block", padding: "4px 10px", fontSize: 11, fontWeight: 600, background: "#f3f4f6", color: "#374151", borderRadius: 12, border: "1px solid #e5e7eb", maxWidth: 160, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", verticalAlign: "middle" },
  moreBadge: { background: "#ffffff", color: "#4b5563", border: "1px solid #d1d5db", borderRadius: 12, padding: "4px 10px", fontSize: 11, fontWeight: 600, cursor: "pointer", boxShadow: "0 1px 2px rgba(0,0,0,0.05)" },
};

const mStyles: Record<string, React.CSSProperties> = {
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
    borderRadius: 12,
    width: "100%",
    maxWidth: 480,
    boxShadow: "0 10px 25px rgba(0,0,0,0.15)",
    overflow: "hidden",
  },
  header: {
    padding: "16px 20px",
    background: "#fcfcfc",
    borderBottom: "1px solid #eee",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
  },
  title: {
    fontSize: 15,
    fontWeight: 700,
    color: "#111827",
  },
  sub: {
    fontSize: 12,
    color: "#6b7280",
    marginTop: 2,
  },
  closeBtn: {
    background: "none",
    border: "none",
    fontSize: 16,
    color: "#6b7280",
    cursor: "pointer",
  },
  body: {
    padding: "18px 20px",
    maxHeight: 320,
    overflowY: "auto" as const,
  },
  footer: {
    padding: "14px 20px",
    background: "#fafafa",
    borderTop: "1px solid #eee",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
  },
};
