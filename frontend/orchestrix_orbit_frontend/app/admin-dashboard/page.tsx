"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { getTenantSlug } from "@/lib/auth";
import { TeamsService, TeamMember } from "@/lib/services/teams";

interface TenantItem {
  id: string;
  slug: string;
  name: string;
  schemaName: string;
  createdAt: string;
}

export default function AdminDashboardPage() {
  const [tenants, setTenants] = useState<TenantItem[]>([]);
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);

  // New tenant form state
  const [newSlug, setNewSlug] = useState("");
  const [newName, setNewName] = useState("");
  const [provisioning, setProvisioning] = useState(false);
  const [provisionMsg, setProvisionMsg] = useState<string | null>(null);
  const [provisionErr, setProvisionErr] = useState<string | null>(null);

  // Role update state
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  useEffect(() => {
    fetchTenants();
    fetchTeamMembers();
  }, []);

  const fetchTenants = () => {
    fetch("http://localhost:8080/api/admin/tenants")
      .then((res) => (res.ok ? res.json() : []))
      .then((data) => setTenants(data))
      .catch((err) => console.warn("Could not fetch tenants:", err));
  };

  const fetchTeamMembers = () => {
    TeamsService.getAllMembers()
      .then((data) => setTeamMembers(data))
      .catch((err) => console.warn("Could not fetch team members:", err));
  };

  const handleProvisionTenant = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSlug.trim() || !newName.trim()) return;

    setProvisioning(true);
    setProvisionMsg(null);
    setProvisionErr(null);

    try {
      const res = await fetch("http://localhost:8080/api/admin/tenants", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          slug: newSlug.trim().toLowerCase().replace(/\s+/g, "-"),
          name: newName.trim(),
        }),
      });

      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || "Failed to provision tenant");
      }

      const created: TenantItem = await res.json();
      setProvisionMsg(`Successfully created tenant: ${created.name} (${created.schemaName})`);
      setNewSlug("");
      setNewName("");
      fetchTenants();
    } catch (err: any) {
      setProvisionErr(err.message || "Error provisioning tenant");
    } finally {
      setProvisioning(false);
    }
  };

  const handleRoleChange = async (memberId: string, newRole: string) => {
    setUpdatingId(memberId);
    try {
      const updated = await TeamsService.updateMemberRole(memberId, newRole as any);
      setTeamMembers((prev) =>
        prev.map((m) => ((m.id || m.userId) === memberId ? { ...m, role: updated.role } : m))
      );
    } catch (err: any) {
      alert("Failed to update role: " + (err.message || err));
    } finally {
      setUpdatingId(null);
    }
  };

  const researchLeadsCount = teamMembers.filter(
    (m) => String(m.role).toUpperCase().includes("LEAD") || String(m.role).toUpperCase().includes("ADMIN")
  ).length;

  return (
    <div>
      {/* ── Page Header ────────────────────────────────────────────────────── */}
      <div style={s.headerRow}>
        <div>
          <h1 style={s.pageTitle}>System Administration</h1>
          <p style={s.pageSub}>
            Provision organization tenants, manage research leads, and oversee system schemas.
          </p>
        </div>
        <Link href="/lead-dashboard" style={s.leadViewBtn}>
          Switch to Research Lead View →
        </Link>
      </div>

      {/* ── Stat Metric Cards ───────────────────────────────────────────────── */}
      <div style={s.statGrid}>
        <div style={s.statCard}>
          <span style={s.statLabel}>PROVISIONED TENANTS</span>
          <span style={s.statValue}>{tenants.length}</span>
          <span style={s.statSub}>Isolated PostgreSQL Schemas</span>
        </div>
        <div style={s.statCard}>
          <span style={s.statLabel}>RESEARCH LEADS</span>
          <span style={s.statValue}>{researchLeadsCount}</span>
          <span style={s.statSub}>Lead & Supervisor Roles</span>
        </div>
        <div style={s.statCard}>
          <span style={s.statLabel}>TOTAL USERS</span>
          <span style={s.statValue}>{teamMembers.length}</span>
          <span style={s.statSub}>Active Roster Members</span>
        </div>
        <div style={s.statCard}>
          <span style={s.statLabel}>SYSTEM HEALTH</span>
          <span style={s.statValue}>ONLINE</span>
          <span style={s.statSub}>Spring Boot Multi-Tenant Core</span>
        </div>
      </div>

      {/* ── Tenant Provisioning & Registry Section ─────────────────────────── */}
      <div style={s.gridSplit}>
        {/* Left: Provision Tenant Card */}
        <div style={s.card}>
          <div style={s.cardHeader}>
            <h3 style={s.cardTitle}>🏢 Provision New Tenant (Organization)</h3>
            <p style={s.cardSub}>
              Creates a dedicated PostgreSQL database schema (`org_{"<slug>"}`) and tenant registry record.
            </p>
          </div>

          {provisionMsg && <div style={s.successAlert}>✅ {provisionMsg}</div>}
          {provisionErr && <div style={s.errorAlert}>⚠️ {provisionErr}</div>}

          <form onSubmit={handleProvisionTenant} style={s.form}>
            <div style={s.field}>
              <label style={s.label}>Organization Name</label>
              <input
                type="text"
                placeholder="e.g. Acme Research Lab"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                style={s.input}
                required
              />
            </div>
            <div style={s.field}>
              <label style={s.label}>Tenant Identifier Slug (URL Identifier)</label>
              <input
                type="text"
                placeholder="e.g. acme-lab"
                value={newSlug}
                onChange={(e) => setNewSlug(e.target.value)}
                style={s.input}
                required
              />
              <span style={s.hint}>Schema will be named: <code>org_{(newSlug || "slug").toLowerCase().replace("-", "_")}</code></span>
            </div>

            <button type="submit" style={s.submitBtn} disabled={provisioning}>
              {provisioning ? "Provisioning Schema..." : "➕ Create Tenant Schema"}
            </button>
          </form>
        </div>

        {/* Right: Tenant Registry List */}
        <div style={s.card}>
          <div style={s.cardHeader}>
            <h3 style={s.cardTitle}>📋 Tenant Registry ({tenants.length})</h3>
            <p style={s.cardSub}>Active tenant schemas in database</p>
          </div>

          <div style={s.tenantList}>
            {tenants.length === 0 ? (
              <div style={s.emptyState}>No tenants provisioned yet.</div>
            ) : (
              tenants.map((t) => (
                <div key={t.id} style={s.tenantItem}>
                  <div>
                    <div style={s.tenantName}>{t.name}</div>
                    <div style={s.tenantMeta}>
                      Slug: <code>{t.slug}</code> · Schema: <code>{t.schemaName}</code>
                    </div>
                  </div>
                  <span style={s.tenantBadge}>Active Schema</span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* ── Research Lead & Roster Management Section ──────────────────────── */}
      <div style={{ ...s.card, marginTop: 24 }}>
        <div style={s.cardHeader}>
          <h3 style={s.cardTitle}>👥 Team Member Roles & Research Lead Assignment</h3>
          <p style={s.cardSub}>Promote team members to Research Lead (`LEAD`) or System Admin (`ADMIN`).</p>
        </div>

        <table style={s.table}>
          <thead>
            <tr>
              <th style={s.th}>User</th>
              <th style={s.th}>Email</th>
              <th style={s.th}>Current Role</th>
              <th style={s.th}>Assign Role</th>
            </tr>
          </thead>
          <tbody>
            {teamMembers.length === 0 ? (
              <tr>
                <td colSpan={4} style={s.emptyStateCell}>
                  No roster members found in this tenant context.
                </td>
              </tr>
            ) : (
              teamMembers.map((m, idx) => {
                const memberKey = m.id || m.userId || `member-${idx}`;
                return (
                  <tr key={memberKey}>
                    <td style={s.td}>
                      <strong>{m.displayName || m.userDisplayName || "Unnamed Member"}</strong>
                    </td>
                    <td style={s.td}>{m.email || m.userEmail || "—"}</td>
                    <td style={s.td}>
                      <span
                        style={{
                          ...s.roleBadge,
                          ...(String(m.role).toUpperCase().includes("ADMIN")
                            ? s.badgeAdmin
                            : String(m.role).toUpperCase().includes("LEAD")
                            ? s.badgeLead
                            : s.badgeMember),
                        }}
                      >
                        {m.role}
                      </span>
                    </td>
                    <td style={s.td}>
                      {String(m.role).toUpperCase().includes("ADMIN") || String(m.role).toUpperCase().includes("OWNER") ? (
                        <span style={s.protectedBadge}>🔒 Protected Admin</span>
                      ) : (
                        <select
                          value={String(m.role).replace("ROLE_", "")}
                          disabled={updatingId === memberKey}
                          onChange={(e) => handleRoleChange(memberKey, e.target.value)}
                          style={s.roleSelect}
                        >
                          <option value="LEAD">Research Lead (Supervisor)</option>
                          <option value="MEMBER">Researcher (Member)</option>
                          <option value="RESOURCE_MANAGER">Resource Manager</option>
                        </select>
                      )}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

const s: Record<string, React.CSSProperties> = {
  headerRow: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-end",
    marginBottom: 24,
  },
  pageTitle: {
    fontSize: 28,
    fontWeight: 700,
    color: "#161616",
    letterSpacing: "-0.5px",
    marginBottom: 4,
  },
  pageSub: {
    fontSize: 13,
    color: "#9e9e9e",
  },
  leadViewBtn: {
    padding: "8px 16px",
    background: "#ffffff",
    border: "1px solid #d0d0d0",
    borderRadius: 6,
    fontSize: 13,
    fontWeight: 600,
    color: "#161616",
    textDecoration: "none",
  },
  statGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(4, 1fr)",
    gap: 16,
    marginBottom: 24,
  },
  statCard: {
    background: "#ffffff",
    border: "1px solid #e8e8e8",
    borderRadius: 8,
    padding: "16px 20px",
    display: "flex",
    flexDirection: "column",
    gap: 4,
  },
  statLabel: {
    fontSize: 11,
    fontWeight: 600,
    color: "#9e9e9e",
    letterSpacing: "0.5px",
  },
  statValue: {
    fontSize: 24,
    fontWeight: 700,
    color: "#161616",
  },
  statSub: {
    fontSize: 11,
    color: "#757575",
  },
  gridSplit: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: 20,
  },
  card: {
    background: "#ffffff",
    border: "1px solid #e8e8e8",
    borderRadius: 12,
    padding: 24,
  },
  cardHeader: {
    marginBottom: 16,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: 700,
    color: "#161616",
    marginBottom: 4,
  },
  cardSub: {
    fontSize: 12,
    color: "#757575",
  },
  form: {
    display: "flex",
    flexDirection: "column",
    gap: 14,
  },
  field: {
    display: "flex",
    flexDirection: "column",
    gap: 6,
  },
  label: {
    fontSize: 12,
    fontWeight: 600,
    color: "#424242",
  },
  input: {
    padding: "9px 12px",
    fontSize: 13,
    borderRadius: 6,
    border: "1px solid #d0d0d0",
    outline: "none",
  },
  hint: {
    fontSize: 11,
    color: "#9e9e9e",
  },
  submitBtn: {
    padding: "10px 16px",
    fontSize: 13,
    fontWeight: 600,
    color: "#ffffff",
    background: "#161616",
    border: "none",
    borderRadius: 6,
    cursor: "pointer",
    marginTop: 6,
  },
  successAlert: {
    padding: "10px 14px",
    background: "#e8f5e9",
    border: "1px solid #a5d6a7",
    color: "#2e7d32",
    fontSize: 12,
    borderRadius: 6,
    marginBottom: 14,
  },
  errorAlert: {
    padding: "10px 14px",
    background: "#ffebee",
    border: "1px solid #ef9a9a",
    color: "#c62828",
    fontSize: 12,
    borderRadius: 6,
    marginBottom: 14,
  },
  tenantList: {
    display: "flex",
    flexDirection: "column",
    gap: 10,
    maxHeight: 280,
    overflowY: "auto",
  },
  tenantItem: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: "12px 14px",
    background: "#f9f9f9",
    border: "1px solid #eee",
    borderRadius: 8,
  },
  tenantName: {
    fontSize: 13,
    fontWeight: 600,
    color: "#161616",
  },
  tenantMeta: {
    fontSize: 11,
    color: "#757575",
    marginTop: 2,
  },
  tenantBadge: {
    fontSize: 10,
    fontWeight: 600,
    color: "#2e7d32",
    background: "#e8f5e9",
    padding: "2px 8px",
    borderRadius: 12,
  },
  emptyState: {
    textAlign: "center",
    padding: 30,
    fontSize: 12,
    color: "#9e9e9e",
  },
  table: {
    width: "100%",
    borderCollapse: "collapse",
  },
  th: {
    textAlign: "left",
    fontSize: 12,
    fontWeight: 600,
    color: "#757575",
    padding: "10px 14px",
    borderBottom: "1px solid #e8e8e8",
  },
  td: {
    fontSize: 13,
    color: "#424242",
    padding: "12px 14px",
    borderBottom: "1px solid #f0f0f0",
  },
  emptyStateCell: {
    textAlign: "center",
    padding: 24,
    color: "#9e9e9e",
    fontSize: 12,
  },
  roleBadge: {
    fontSize: 11,
    fontWeight: 600,
    padding: "2px 8px",
    borderRadius: 12,
  },
  badgeAdmin: {
    background: "#e8eaf6",
    color: "#283593",
  },
  badgeLead: {
    background: "#e0f2fe",
    color: "#0369a1",
  },
  badgeMember: {
    background: "#f5f5f5",
    color: "#616161",
  },
  roleSelect: {
    padding: "6px 10px",
    fontSize: 12,
    borderRadius: 6,
    border: "1px solid #d0d0d0",
    background: "#ffffff",
  },
  protectedBadge: {
    fontSize: 11,
    fontWeight: 600,
    color: "#757575",
    background: "#eeeeee",
    padding: "4px 10px",
    borderRadius: 12,
    display: "inline-block",
  },
};
