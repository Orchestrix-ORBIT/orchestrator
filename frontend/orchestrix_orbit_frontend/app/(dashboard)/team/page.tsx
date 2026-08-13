"use client";

import React, { useState, useEffect } from "react";
import { api } from "@/lib/api";
import { useTenant } from "@/context/TenantContext";

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
  card: {
    background: "var(--white)",
    borderRadius: "var(--radius)",
    border: "1px solid var(--border)",
    padding: "0",
    overflow: "hidden",
  },
  table: {
    width: "100%",
    borderCollapse: "collapse" as const,
    textAlign: "left" as const,
  },
  th: {
    padding: "16px 24px",
    background: "var(--navy-100)",
    color: "var(--navy-900)",
    fontWeight: 600,
    fontSize: "13px",
    borderBottom: "1px solid var(--border)",
  },
  td: {
    padding: "16px 24px",
    borderBottom: "1px solid var(--border)",
    fontSize: "14px",
    color: "var(--text-main)",
  },
  roleBadge: (role: string) => ({
    background: role === "Institute Admin" ? "var(--navy-900)" : 
                role === "Team Lead" ? "#0369a1" : "var(--navy-100)",
    color: (role === "Institute Admin" || role === "Team Lead") ? "var(--white)" : "var(--navy-900)",
    padding: "4px 8px",
    borderRadius: "4px",
    fontSize: "11px",
    fontWeight: 600,
  }),
  actionBtn: {
    background: "transparent",
    border: "none",
    color: "var(--text-muted)",
    cursor: "pointer",
    padding: "4px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    borderRadius: "4px",
  }
};

interface TeamMember {
  id: string;
  userId: string;
  role: "Institute Admin" | "Team Lead" | "Researcher" | "Resource Manager";
  joinedAt: string;
}

const MOCK_TEAM: TeamMember[] = [
  { id: "tm1", userId: "admin@testteam.com", role: "Institute Admin", joinedAt: "2026-08-01T10:00:00Z" },
  { id: "tm2", userId: "lead@testteam.com", role: "Team Lead", joinedAt: "2026-08-05T14:30:00Z" },
  { id: "tm3", userId: "researcher1@testteam.com", role: "Researcher", joinedAt: "2026-08-10T09:15:00Z" },
];

export default function TeamPage() {
  const { tenantSlug } = useTenant();
  const [members, setMembers] = useState<TeamMember[]>(MOCK_TEAM);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    setIsLoading(true);
    api.get<TeamMember[]>("/api/team")
      .then(data => setMembers(data))
      .catch(err => {
        console.log("Using mock team data");
        setMembers(MOCK_TEAM);
      })
      .finally(() => setIsLoading(false));
  }, [tenantSlug]);

  return (
    <div style={S.container} className="animate-fade-up">
      <header style={S.header}>
        <div style={S.titleGroup}>
          <h2 style={S.title}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
              <circle cx="9" cy="7" r="4"></circle>
              <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
              <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
            </svg>
            Team Members
          </h2>
          <span style={S.subtitle}>Manage researchers and collaborators in your workspace.</span>
        </div>

        <button style={S.btnPrimary}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
            <circle cx="8.5" cy="7" r="4"></circle>
            <line x1="20" y1="8" x2="20" y2="14"></line>
            <line x1="23" y1="11" x2="17" y2="11"></line>
          </svg>
          Add Member
        </button>
      </header>

      <div style={S.card}>
        {isLoading ? (
          <div style={{ padding: "48px", textAlign: "center", color: "var(--text-muted)" }}>Loading team members...</div>
        ) : (
          <table style={S.table}>
            <thead>
              <tr>
                <th style={S.th}>User Email</th>
                <th style={S.th}>Role</th>
                <th style={S.th}>Joined Date</th>
                <th style={{ ...S.th, textAlign: "right" }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {members.map(member => (
                <tr key={member.id} className="hover:bg-slate-50 transition-colors">
                  <td style={S.td}>
                    <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                      <div style={{ width: "32px", height: "32px", borderRadius: "50%", background: "var(--navy-100)", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--navy-900)", fontWeight: 600 }}>
                        {member.userId.charAt(0).toUpperCase()}
                      </div>
                      <span style={{ fontWeight: 500 }}>{member.userId}</span>
                    </div>
                  </td>
                  <td style={S.td}>
                    <span style={S.roleBadge(member.role)}>{member.role}</span>
                  </td>
                  <td style={{ ...S.td, color: "var(--text-muted)", fontSize: "13px" }}>
                    {new Date(member.joinedAt).toLocaleDateString()}
                  </td>
                  <td style={{ ...S.td, textAlign: "right" }}>
                    <div style={{ display: "flex", justifyContent: "flex-end", gap: "8px" }}>
                      <button style={S.actionBtn} title="Edit Role">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <circle cx="12" cy="12" r="3"></circle>
                          <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path>
                        </svg>
                      </button>
                      <button style={{ ...S.actionBtn, color: "#ef4444" }} title="Remove Member">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <polyline points="3 6 5 6 21 6"></polyline>
                          <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                        </svg>
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
