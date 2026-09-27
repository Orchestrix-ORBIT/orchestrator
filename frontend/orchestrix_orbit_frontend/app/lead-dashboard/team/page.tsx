"use client";

import { useEffect, useState } from "react";
import { TeamsService, type TeamMember, type TeamRole } from "@/lib/services/teams";
import { ProjectsService } from "@/lib/services/projects";
import LoadingState from "@/components/ui/LoadingState";

export default function LeadTeamPage() {
  const [members, setMembers]                       = useState<TeamMember[]>([]);
  const [loading, setLoading]                       = useState(true);
  const [error, setError]                           = useState<string | null>(null);
  const [selectedMemberForRemoval, setSelectedMemberForRemoval] = useState<any | null>(null);
  const [searchQuery, setSearchQuery]               = useState("");

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
    if (!selectedMemberForRemoval) return;
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
  }

  async function handleRemoveFromAll() {
    if (!selectedMemberForRemoval) return;
    const memberId = selectedMemberForRemoval.id || selectedMemberForRemoval.userId;
    const name = selectedMemberForRemoval.displayName || selectedMemberForRemoval.userDisplayName || selectedMemberForRemoval.email;

    if (!confirm(`Revoke all project access for ${name}?`)) return;

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
    setSelectedMemberForRemoval(null);
  }

  const filteredMembers = members.filter((m: any) => {
    const q = searchQuery.toLowerCase();
    const name = (m.displayName || m.userDisplayName || "").toLowerCase();
    const email = (m.email || m.userEmail || "").toLowerCase();
    return name.includes(q) || email.includes(q);
  });

  if (loading) return <LoadingState title="Loading Team & Roster…" subtitle="Fetching researchers, project assignments, and team permissions" />;
  if (error)   return <p style={{ padding: 24, color: "#c62828", fontSize: 14 }}>Error: {error}</p>;

  return (
    <div>
      <div style={s.header}>
        <div>
          <h1 style={s.title}>Team Management</h1>
          <p style={s.sub}>{members.length} assigned researcher{members.length !== 1 ? "s" : ""} across active workspace projects</p>
        </div>
        <input
          type="text"
          placeholder="Filter team members..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          style={s.searchInput}
        />
      </div>

      <div style={s.card}>
        <div style={s.cardHead}>
          <span style={s.cardTitle}>Project Team Members</span>
          <span style={s.cardBadge}>{filteredMembers.length} Active</span>
        </div>
        <table style={s.table}>
          <thead>
            <tr>
              <th style={{ ...s.th, width: "22%" }}>MEMBER</th>
              <th style={{ ...s.th, width: "24%" }}>EMAIL</th>
              <th style={{ ...s.th, width: "12%" }}>ROLE</th>
              <th style={{ ...s.th, width: "28%" }}>ASSIGNED PROJECTS</th>
              <th style={{ ...s.th, width: "8%" }}>JOINED</th>
              <th style={{ ...s.th, width: "6%", textAlign: "right" }}>ACTIONS</th>
            </tr>
          </thead>
          <tbody>
            {filteredMembers.length === 0 ? (
              <tr><td colSpan={6} style={{ ...s.td, textAlign: "center", color: "#888", padding: "36px 0" }}>
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
                    <span style={s.roleBadge}>
                      {m.role || "Researcher"}
                    </span>
                  </td>
                  <td style={s.td}>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 6, alignItems: "center" }}>
                      {visibleProjects.length > 0 ? (
                        visibleProjects.map((p: any) => (
                          <span key={p.id || p.name} style={s.badge} title={p.name}>
                            {p.name.length > 20 ? p.name.substring(0, 20) + "…" : p.name}
                          </span>
                        ))
                      ) : (
                        <span style={{ color: "#aaa", fontSize: 12 }}>None</span>
                      )}
                      {extraCount > 0 && (
                        <button
                          onClick={() => setSelectedMemberForRemoval(m)}
                          style={s.moreBadge}
                          title="Click to view & manage all assigned projects"
                        >
                          +{extraCount} more
                        </button>
                      )}
                    </div>
                  </td>
                  <td style={s.td}>
                    <span style={{ fontSize: 12, color: "#757575" }}>{dateStr}</span>
                  </td>
                  <td style={{ ...s.td, textAlign: "right" }}>
                    <button
                      id={`btn-remove-${memberId}`}
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
              <span style={{ fontSize: 11, fontWeight: 700, color: "#888", letterSpacing: "0.5px" }}>
                ASSIGNED PROJECTS ({ (selectedMemberForRemoval.assignedProjects || []).length })
              </span>

              <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 10 }}>
                {(selectedMemberForRemoval.assignedProjects || []).length === 0 ? (
                  <p style={{ fontSize: 13, color: "#888", padding: "12px 0" }}>No active projects assigned.</p>
                ) : (
                  (selectedMemberForRemoval.assignedProjects || []).map((p: any) => (
                    <div
                      key={p.id}
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        padding: "10px 14px",
                        background: "#f9fafb",
                        border: "1px solid #e8e8e8",
                        borderRadius: 6,
                      }}
                    >
                      <div>
                        <span style={{ fontSize: 13, fontWeight: 600, color: "#161616" }}>{p.name}</span>
                        <span style={{ display: "block", fontSize: 11, color: "#888", marginTop: 2 }}>
                          ID: {p.id.length > 8 ? p.id.substring(0, 8) : p.id}
                        </span>
                      </div>
                      <button
                        onClick={() => handleRemoveFromProject(p.id)}
                        style={{
                          padding: "4px 10px",
                          fontSize: 12,
                          fontWeight: 600,
                          color: "#c62828",
                          background: "#fff0f0",
                          border: "1px solid #f5c6cb",
                          borderRadius: 4,
                          cursor: "pointer",
                        }}
                      >
                        Unassign
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>

            <div style={mStyles.footer}>
              <button
                onClick={handleRemoveFromAll}
                style={{
                  padding: "8px 14px",
                  fontSize: 12,
                  fontWeight: 600,
                  color: "#ffffff",
                  background: "#c62828",
                  border: "none",
                  borderRadius: 4,
                  cursor: "pointer",
                }}
              >
                Revoke All Access
              </button>
              <button
                onClick={() => setSelectedMemberForRemoval(null)}
                style={{
                  padding: "8px 14px",
                  fontSize: 12,
                  fontWeight: 600,
                  color: "#424242",
                  background: "#ffffff",
                  border: "1px solid #d0d0d0",
                  borderRadius: 4,
                  cursor: "pointer",
                }}
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const s: Record<string, React.CSSProperties> = {
  header: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 },
  title: { fontSize: 22, fontWeight: 700, color: "#161616", marginBottom: 4 },
  sub: { fontSize: 13, color: "#888888" },
  searchInput: {
    padding: "8px 14px",
    fontSize: 13,
    border: "1px solid #d0d0d0",
    borderRadius: 6,
    width: 220,
    outline: "none",
    background: "#ffffff",
  },
  card: { background: "#fff", border: "1px solid #e8e8e8", borderRadius: 8, padding: 24, boxShadow: "0 1px 3px rgba(0,0,0,0.03)" },
  cardHead: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 },
  cardTitle: { fontSize: 15, fontWeight: 700, color: "#161616" },
  cardBadge: { fontSize: 11, fontWeight: 600, color: "#2563eb", background: "#eff6ff", padding: "3px 10px", borderRadius: 12 },
  table: { width: "100%", borderCollapse: "collapse" },
  th: { textAlign: "left" as const, fontSize: 11, fontWeight: 700, color: "#888888", letterSpacing: "0.5px", paddingBottom: 14, borderBottom: "1px solid #e0e0e0" },
  tr: { borderBottom: "1px solid #f0f0f0" },
  td: { fontSize: 13, color: "#424242", padding: "16px 0", verticalAlign: "middle" as const },
  memberCell: { display: "flex", alignItems: "center", gap: 10 },
  avatar: { display: "inline-flex", alignItems: "center", justifyContent: "center", width: 32, height: 32, borderRadius: "50%", background: "#161616", color: "#fff", fontSize: 12, fontWeight: 700, flexShrink: 0 },
  memberName: { fontSize: 13, fontWeight: 600, color: "#161616" },
  memberEmail: { fontSize: 13, color: "#616161" },
  roleBadge: { display: "inline-block", padding: "3px 8px", borderRadius: 4, background: "#f5f5f5", border: "1px solid #e0e0e0", fontSize: 11, fontWeight: 600, color: "#424242" },
  removeBtn: { padding: "5px 12px", fontSize: 12, fontWeight: 600, color: "#c62828", background: "#fff0f0", border: "1px solid #f5c6cb", borderRadius: 5, cursor: "pointer" },
  badge: { display: "inline-block", padding: "3px 8px", fontSize: 11, fontWeight: 600, background: "#eff6ff", color: "#1d4ed8", border: "1px solid #bfdbfe", borderRadius: 4 },
  moreBadge: { background: "#f3f4f6", color: "#4b5563", border: "1px solid #e5e7eb", borderRadius: 4, padding: "3px 8px", fontSize: 11, fontWeight: 600, cursor: "pointer" },
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
    borderRadius: 8,
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
    color: "#161616",
  },
  sub: {
    fontSize: 12,
    color: "#888888",
    marginTop: 2,
  },
  closeBtn: {
    background: "none",
    border: "none",
    fontSize: 16,
    color: "#888",
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
