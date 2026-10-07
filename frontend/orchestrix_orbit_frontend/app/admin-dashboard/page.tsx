"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { getTenantSlug } from "@/lib/auth";
import { api } from "@/lib/api";
import { TeamsService, TeamMember } from "@/lib/services/teams";
import LoadingState from "@/components/ui/LoadingState";

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
  const [openDropdownId, setOpenDropdownId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([fetchTenants(), fetchTeamMembers()]).finally(() => setLoading(false));

    const handleClickOutside = (e: MouseEvent) => {
      if (!(e.target as Element).closest('.role-dropdown-container')) {
        setOpenDropdownId(null);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const fetchTenants = () => {
    return api.get<TenantItem[]>("/api/admin/tenants")
      .then((data) => setTenants(data))
      .catch((err) => console.warn("Could not fetch tenants:", err));
  };

  const fetchTeamMembers = () => {
    return TeamsService.getAllMembers()
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
      const created = await api.post<TenantItem>("/api/admin/tenants", {
          slug: newSlug.trim().toLowerCase().replace(/\s+/g, "-"),
          name: newName.trim(),
      });
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

  if (loading) {
    return <LoadingState variant="admin" title="Loading System Administration…" subtitle="Fetching organization schemas, active roles, and database status" />;
  }

  return (
    <div>
      <style>{`
        .role-option-hover { transition: background 0.2s; }
        .role-option-hover:hover { background: #f3f4f6; }
        .table-card-hover { transition: box-shadow 0.2s ease, border-color 0.2s ease; }
        .table-card-hover:hover { box-shadow: 0 10px 15px -3px rgba(0,0,0,0.05), 0 4px 6px -4px rgba(0,0,0,0.03); border-color: rgba(0,0,0,0.08); }
        .tenant-item-hover { transition: transform 0.2s ease, box-shadow 0.2s ease, border-color 0.2s ease; }
        .tenant-item-hover:hover { transform: translateY(-2px); box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05); border-color: rgba(0,0,0,0.1); }
      `}</style>
      {/* ── Page Header ────────────────────────────────────────────────────── */}
      <div style={s.headerRow}>
        <div>
          <h1 style={s.pageTitle}>System Administration</h1>
          <p style={s.pageSub}>
            Provision organization tenants, manage research leads, and oversee system schemas.
          </p>
        </div>
        <Link href="/lead-dashboard" style={s.leadViewBtn} className="btn-shiny">
          Switch to Research Lead View →
        </Link>
      </div>

      {/* ── Stat Metric Cards ───────────────────────────────────────────────── */}
      <div style={s.statGrid}>
        <div style={s.statCard} className="stat-card-hover">
          <span style={s.statLabel}>PROVISIONED TENANTS</span>
          <span style={s.statValue}>{tenants.length}</span>
          <span style={s.statSub}>Isolated PostgreSQL Schemas</span>
        </div>
        <div style={s.statCard} className="stat-card-hover">
          <span style={s.statLabel}>RESEARCH LEADS</span>
          <span style={s.statValue}>{researchLeadsCount}</span>
          <span style={s.statSub}>Lead & Supervisor Roles</span>
        </div>
        <div style={s.statCard} className="stat-card-hover">
          <span style={s.statLabel}>TOTAL USERS</span>
          <span style={s.statValue}>{teamMembers.length}</span>
          <span style={s.statSub}>Active Roster Members</span>
        </div>
        <div style={s.statCard} className="stat-card-hover">
          <span style={s.statLabel}>SYSTEM HEALTH</span>
          <span style={s.statValue}>ONLINE</span>
          <span style={s.statSub}>Spring Boot Multi-Tenant Core</span>
        </div>
      </div>

      {/* ── Tenant Provisioning & Registry Section ─────────────────────────── */}
      <div style={s.gridSplit}>
        {/* Left: Provision Tenant Card */}
        <div style={s.card} className="table-card-hover">
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

            <button type="submit" style={s.submitBtn} disabled={provisioning} className="btn-shiny">
              {provisioning ? "Provisioning Schema..." : "➕ Create Tenant Schema"}
            </button>
          </form>
        </div>

        {/* Right: Tenant Registry List */}
        <div style={s.card} className="table-card-hover">
          <div style={s.cardHeader}>
            <h3 style={s.cardTitle}>📋 Tenant Registry ({tenants.length})</h3>
            <p style={s.cardSub}>Active tenant schemas in database</p>
          </div>

          <div style={s.tenantList}>
            {tenants.length === 0 ? (
              <div style={s.emptyState}>No tenants provisioned yet.</div>
            ) : (
              tenants.map((t) => (
                <div key={t.id} style={s.tenantItem} className="tenant-item-hover">
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
      <div style={{ ...s.card, marginTop: 24 }} className="table-card-hover">
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
                  <tr key={memberKey} className="table-row-hover">
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
                        <div className="role-dropdown-container" style={{ position: "relative" }}>
                          <button
                            onClick={(e) => { e.stopPropagation(); setOpenDropdownId(openDropdownId === memberKey ? null : memberKey); }}
                            disabled={updatingId === memberKey}
                            style={{ padding: "8px 12px", width: 230, display: "flex", justifyContent: "space-between", alignItems: "center", cursor: updatingId === memberKey ? "not-allowed" : "pointer", background: "#ffffff", border: "1px solid #d1d5db", borderRadius: 8, fontSize: 13, color: "#111827", transition: "all 0.2s" }}
                          >
                            <span>
                              {String(m.role).replace("ROLE_", "") === "LEAD" ? "Research Lead (Supervisor)" : 
                               String(m.role).replace("ROLE_", "") === "MEMBER" ? "Researcher (Member)" : 
                               String(m.role).replace("ROLE_", "") === "RESOURCE_MANAGER" ? "Resource Manager" : String(m.role).replace("ROLE_", "")}
                            </span>
                            <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2" style={{ color: "#9ca3af", transform: openDropdownId === memberKey ? "rotate(180deg)" : "rotate(0deg)", transition: "transform 0.2s" }}>
                              <path d="M3 5l3 3 3-3" strokeLinecap="round" strokeLinejoin="round"/>
                            </svg>
                          </button>
                          
                          {openDropdownId === memberKey && (
                            <div onClick={(e) => e.stopPropagation()} style={{ position: "absolute", top: "100%", left: 0, marginTop: 4, width: 230, background: "#ffffff", borderRadius: 8, boxShadow: "0 10px 25px -5px rgba(0,0,0,0.1), 0 8px 10px -6px rgba(0,0,0,0.1)", border: "1px solid rgba(0,0,0,0.08)", zIndex: 50, overflow: "hidden", padding: "4px 0" }}>
                              {[
                                { value: "LEAD", label: "Research Lead (Supervisor)", color: "#0369a1", bg: "#e0f2fe" },
                                { value: "MEMBER", label: "Researcher (Member)", color: "#616161", bg: "#f5f5f5" },
                                { value: "RESOURCE_MANAGER", label: "Resource Manager", color: "#283593", bg: "#e8eaf6" }
                              ].map(opt => (
                                <div 
                                  key={opt.value}
                                  onClick={() => { handleRoleChange(memberKey, opt.value); setOpenDropdownId(null); }}
                                  className="role-option-hover"
                                  style={{ padding: "10px 14px", fontSize: 13, cursor: "pointer", display: "flex", alignItems: "center", gap: 10 }}
                                >
                                  <div style={{ width: 8, height: 8, borderRadius: "50%", background: opt.color }} />
                                  <span style={{ color: "#111827", fontWeight: 500 }}>{opt.label}</span>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
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
    color: "#111827",
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
    color: "#111827",
    textDecoration: "none",
  },
  statGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(4, 1fr)",
    gap: 16,
    marginBottom: 24,
  },
  statCard: {
    padding: 24,
    display: "flex",
    flexDirection: "column",
    background: "#ffffff",
    borderRadius: 16,
    border: "1px solid rgba(0,0,0,0.06)",
    boxShadow: "0 1px 3px rgba(0,0,0,0.02)",
    transition: "transform 0.2s, box-shadow 0.2s",
  },
  statLabel: {
    fontSize: 13,
    fontWeight: 600,
    color: "#4b5563",
    marginBottom: 16,
  },
  statValue: {
    fontSize: 36,
    fontWeight: 700,
    color: "#111827",
    lineHeight: 1,
    letterSpacing: "-0.04em",
    marginBottom: 8,
  },
  statSub: {
    fontSize: 12,
    color: "#9ca3af",
    fontWeight: 500,
  },
  gridSplit: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: 20,
  },
  card: {
    background: "#ffffff",
    borderRadius: 16,
    border: "1px solid rgba(0,0,0,0.06)",
    boxShadow: "0 1px 3px rgba(0,0,0,0.02)",
    overflow: "visible",
    padding: 24,
  },
  cardHeader: {
    marginBottom: 20,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: 600,
    color: "#111827",
    margin: 0,
    letterSpacing: "-0.01em",
    marginBottom: 4,
  },
  cardSub: {
    fontSize: 13,
    color: "#6b7280",
    margin: 0,
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
    color: "#374151",
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
    padding: "16px 20px",
    background: "#ffffff",
    border: "1px solid rgba(0,0,0,0.06)",
    borderRadius: 12,
    boxShadow: "0 1px 2px rgba(0,0,0,0.02)",
    transition: "transform 0.2s, box-shadow 0.2s",
  },
  tenantName: {
    fontSize: 14,
    fontWeight: 600,
    color: "#111827",
  },
  tenantMeta: {
    fontSize: 12,
    color: "#6b7280",
    marginTop: 4,
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
    fontSize: 11,
    fontWeight: 600,
    color: "#6b7280",
    letterSpacing: "0.05em",
    textTransform: "uppercase",
    padding: "12px 24px",
    borderBottom: "1px solid #e5e7eb",
    borderTop: "1px solid #f3f4f6",
    background: "#fafafa"
  },
  td: {
    fontSize: 14,
    color: "#374151",
    padding: "16px 24px",
    borderBottom: "1px solid #f3f4f6",
    verticalAlign: "middle"
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
