"use client";

import { useEffect, useState } from "react";
import { TeamsService, type TeamMember, type TeamRole } from "@/lib/services/teams";

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
    TeamsService.getAllMembers()
      .then(setMembers)
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  async function handleUpdateRole(memberId: string, role: TeamRole) {
    try {
      const updated = await TeamsService.updateMemberRole(memberId, role);
      setMembers(prev => prev.map(m => m.userId === memberId ? { ...m, role: updated.role } : m));
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Failed to update role");
    }
  }

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
          <p style={s.sub}>{members.length} member{members.length !== 1 ? "s" : ""} in this workspace</p>
        </div>
      </div>

      <div style={s.card}>
        <div style={s.cardHead}>
          <span style={s.cardTitle}>All Members</span>
        </div>
        <table style={s.table}>
          <thead>
            <tr>
              {["Member", "Email", "Role", "Joined", "Actions"].map(h => (
                <th key={h} style={s.th}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {members.length === 0 ? (
              <tr><td colSpan={5} style={{ ...s.td, textAlign: "center", color: "#888", padding: "32px 0" }}>
                No team members yet.
              </td></tr>
            ) : members.map((m, idx) => (
              <tr key={m.userId || m.userEmail || `member-${idx}`}>
                <td style={s.td}>
                  <div style={s.avatar}>{(m.userDisplayName ?? m.userEmail ?? "?").charAt(0).toUpperCase()}</div>
                  <span style={{ marginLeft: 10 }}>{m.userDisplayName ?? "—"}</span>
                </td>
                <td style={s.td}>{m.userEmail ?? m.userId}</td>
                <td style={s.td}>
                  <select
                    id={`select-role-${m.userId}`}
                    style={s.roleSelect}
                    value={m.role}
                    onChange={e => handleUpdateRole(m.userId, e.target.value as TeamRole)}
                  >
                    <option value="LEAD">Lead</option>
                    <option value="MEMBER">Member</option>
                    <option value="OBSERVER">Observer</option>
                  </select>
                </td>
                <td style={s.td}>{new Date(m.joinedAt).toLocaleDateString()}</td>
                <td style={s.td}>
                  <button
                    id={`btn-remove-${m.userId}`}
                    style={s.removeBtn}
                    onClick={() => handleRemove(m.userId)}
                  >
                    Remove
                  </button>
                </td>
              </tr>
            ))}
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
};
