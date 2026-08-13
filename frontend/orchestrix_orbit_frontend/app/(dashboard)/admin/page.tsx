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
  title: {
    fontSize: "24px",
    fontWeight: 600,
    color: "var(--navy-900)",
    margin: 0,
  },
  btn: {
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
    padding: "24px",
  },
  subtitle: {
    fontSize: "18px",
    fontWeight: 600,
    color: "var(--navy-900)",
    marginBottom: "16px",
  },
  list: {
    display: "flex",
    flexDirection: "column" as const,
    gap: "12px",
  },
  listItem: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: "16px",
    border: "1px solid var(--border)",
    borderRadius: "var(--radius-sm)",
  },
  roleBadge: {
    background: "var(--navy-100)",
    color: "var(--navy-900)",
    padding: "4px 8px",
    borderRadius: "4px",
    fontSize: "12px",
    fontWeight: 600,
  }
};

interface User {
  id: string;
  email: string;
  role: string;
}

const MOCK_USERS: User[] = [
  { id: "1", email: "admin@testteam.com", role: "Institute Admin" },
  { id: "2", email: "lead@testteam.com", role: "Team Lead" },
  { id: "3", email: "researcher1@testteam.com", role: "Researcher" },
];

export default function AdminPage() {
  const [users, setUsers] = useState<User[]>(MOCK_USERS);
  const [userRole, setUserRole] = useState<string>("Institute Admin");

  useEffect(() => {
    const role = localStorage.getItem("userRole");
    if (role) setUserRole(role);
    // Attempt to fetch from API
    api.get<User[]>("/api/admin/users")
      .then(data => {
        if (data && data.length > 0) setUsers(data);
      })
      .catch(() => {
        console.log("Using mock users (backend offline)");
      });
  }, []);

  return (
    <div style={S.container} className="animate-fade-up">
      <header style={S.header}>
        <h2 style={S.title}>Workspace Settings</h2>
        <button style={S.btn}>+ Invite User</button>
      </header>

      <div style={S.card}>
        <h3 style={S.subtitle}>Tenant Users</h3>
        <p style={{ color: "var(--text-muted)", marginBottom: "24px" }}>
          Manage access for members of your organization. Only users with the <strong>ADMIN</strong> role can view this page.
        </p>

        <div style={S.list}>
          {users.map(u => (
            <div key={u.id} style={S.listItem}>
              <div>
                <div style={{ fontWeight: 500, color: "var(--navy-900)" }}>{u.email}</div>
                <div style={{ fontSize: "13px", color: "var(--text-muted)" }}>ID: {u.id}</div>
              </div>
              <div style={{ display: "flex", gap: "12px", alignItems: "center" }}>
                <span style={S.roleBadge}>{u.role}</span>
                <select 
                  style={{ padding: "6px", borderRadius: "4px", border: "1px solid var(--border)" }}
                  value={u.role}
                  onChange={(e) => {
                    setUsers(users.map(user => user.id === u.id ? { ...user, role: e.target.value } : user));
                  }}
                >
                  <option value="Institute Admin">Institute Admin</option>
                  <option value="Team Lead">Team Lead</option>
                  <option value="Researcher">Researcher</option>
                  <option value="Resource Manager">Resource Manager</option>
                </select>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
