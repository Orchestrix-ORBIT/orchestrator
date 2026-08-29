"use client";

import { useEffect, useState } from "react";
import { TeamsService, type TeamMember, type TeamRole } from "@/lib/services/teams";

import { ProjectsService } from "@/lib/services/projects";

export default function LeadTeamPage() {
  const [members, setMembers]       = useState<TeamMember[]>([]);
  const [loading, setLoading]       = useState(true);
  const [error, setError]           = useState<string | null>(null);
  const [showModal, setShowModal]   = useState(false);
  const [newEmail, setNewEmail]     = useState("");
  const [newUserId, setNewUserId]   = useState("");
  const [newRole, setNewRole]       = useState<TeamRole>("MEMBER");
  const [adding, setAdding]         = useState(false);
  const [addError, setAddError]     = useState<string | null>(null);

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

        // Filter workspace members to only those assigned to active projects
        const assignedMembers = (allMembers as any[])
          .filter(m => assignedUserIds.has(m.id || m.userId))
          .map(m => {
            const userProjects = (projects as any[]).filter(p =>
              (assignmentsMap[p.id] || []).includes(m.id || m.userId)
            );
            return { ...m, assignedProjects: userProjects };
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

  async function handleRemove(memberId: string) {
    if (!confirm("Remove this member from the team?")) return;
    try {
      await TeamsService.removeMemberRecord(memberId);
      setMembers(prev => prev.filter(m => m.userId !== memberId));
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Failed to remove member");
    }
  }

  if (loading) return <p style={{ padding: 40, color: "#888", fontSize: 14 }}>Loading team…</p>;
  if (error)   return <p style={{ padding: 24, color: "#c62828", fontSize: 14 }}>Error: {error}</p>;

  return (
    <div>
      <div style={s.header}>
        <div>
          <h1 style={s.title}>Team Management</h1>
          <p style={s.sub}>{members.length} assigned member{members.length !== 1 ? "s" : ""} across active projects</p>
        </div>
      </div>

      <div style={s.card}>
        <div style={s.cardHead}>
          <span style={s.cardTitle}>Project Team Members</span>
        </div>
        <table style={s.table}>
          <thead>
            <tr>
              {["Member", "Email", "Role", "Assigned Projects", "Joined", "Actions"].map(h => (
                <th key={h} style={s.th}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {members.length === 0 ? (
              <tr><td colSpan={6} style={{ ...s.td, textAlign: "center", color: "#888", padding: "32px 0" }}>
                No team members assigned to any projects yet. Create a project to assign team members.
              </td></tr>
            ) : members.map((m: any, idx) => {
              const memberId = m.id || m.userId;
              const email = m.email || m.userEmail || "user@myorg.com";
              const name = m.displayName || m.userDisplayName || email.split("@")[0];
              const dateStr = m.createdAt || m.joinedAt ? new Date(m.createdAt || m.joinedAt).toLocaleDateString() : "Active";
              const assignedProjects = m.assignedProjects || m.projects || [];

              return (
                <tr key={memberId || `member-${idx}`}>
                  <td style={s.td}>
                    <div style={s.avatar}>{name.charAt(0).toUpperCase()}</div>
                    <span style={{ marginLeft: 10 }}>{name}</span>
                  </td>
                  <td style={s.td}>{email}</td>
                  <td style={s.td}>
                    <span style={{ display: "inline-block", padding: "4px 10px", borderRadius: 4, background: "#f5f5f5", border: "1px solid #e0e0e0", fontSize: 12, fontWeight: 500, color: "#333" }}>
                      Member
                    </span>
                  </td>
                  <td style={s.td}>
                    {assignedProjects.length > 0 ? (
                      assignedProjects.map((p: any) => (
                        <span key={p.id || p.name} style={s.badge}>
                          {p.name}
                        </span>
                      ))
                    ) : (
                      <span style={{ color: "#aaa", fontSize: 12 }}>None</span>
                    )}
                  </td>
                  <td style={s.td}>{dateStr}</td>
                  <td style={s.td}>
                    <button
                      id={`btn-remove-${memberId}`}
                      style={s.removeBtn}
                      onClick={() => handleRemove(memberId)}
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
  );
}

const s: Record<string, React.CSSProperties> = {
  header: { display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 24 },
  title: { fontSize: 22, fontWeight: 700, color: "#161616", marginBottom: 4 },
  sub: { fontSize: 13, color: "#888888" },
  card: { background: "#fff", border: "1px solid #e8e8e8", borderRadius: 8, padding: 24 },
  cardHead: { marginBottom: 16 },
  cardTitle: { fontSize: 14, fontWeight: 600, color: "#161616" },
  table: { width: "100%", borderCollapse: "collapse" },
  th: { textAlign: "left" as const, fontSize: 10, fontWeight: 700, color: "#888", letterSpacing: "0.6px", textTransform: "uppercase" as const, paddingBottom: 10, borderBottom: "1px solid #f0f0f0" },
  td: { fontSize: 13, color: "#424242", padding: "12px 0", borderBottom: "1px solid #f8f8f8", verticalAlign: "middle" as const, display: "table-cell" },
  avatar: { display: "inline-flex", alignItems: "center", justifyContent: "center", width: 30, height: 30, borderRadius: "50%", background: "#161616", color: "#fff", fontSize: 12, fontWeight: 700 },
  roleSelect: { padding: "5px 8px", fontSize: 12, border: "1.5px solid #d0d0d0", borderRadius: 5, fontFamily: "inherit", background: "#fff" },
  removeBtn: { padding: "5px 12px", fontSize: 12, fontWeight: 600, color: "#c62828", background: "#fff0f0", border: "1px solid #f5c6cb", borderRadius: 5, cursor: "pointer" },
  badge: { display: "inline-block", padding: "2px 8px", fontSize: 11, fontWeight: 600, background: "#f0f4ff", color: "#2563eb", borderRadius: 4, marginRight: 4 },
};
