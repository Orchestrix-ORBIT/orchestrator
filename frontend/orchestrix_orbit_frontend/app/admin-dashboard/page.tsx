"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { getTenantSlug, isPlatformSession } from "@/lib/auth";
import { api } from "@/lib/api";
import { TeamsService, TeamMember } from "@/lib/services/teams";
import LoadingState from "@/components/ui/LoadingState";

interface TenantItem {
  id: string;
  slug: string;
  name: string;
  schemaName: string;
  createdAt: string;
  status?: string;      // ACTIVE | SUSPENDED | ...
  userCount?: number;   // filled by the API for the platform admin
}

// Who the signed-in admin administers (GET /api/admin/tenants/context)
interface AdminContext {
  platformAdmin: boolean;   // manages all organizations (create / list / suspend)
  slug: string;
  name: string;
  schemaName: string;
}

export default function AdminDashboardPage() {
  const [tenants, setTenants] = useState<TenantItem[]>([]);
  const [ctx, setCtx] = useState<AdminContext | null>(null);
  // Read after mount (localStorage): decides which skeleton to show while loading
  const [platformHint, setPlatformHint] = useState<boolean | null>(null); // null until known (first browser frame)
  useEffect(() => { setPlatformHint(isPlatformSession()); }, []);

  // ── Organization administrators (platform admin assigns them) ────────────
  type OrgAdmin = { id: string; email: string; displayName?: string; status?: string };
  const [adminOrgId, setAdminOrgId] = useState<string>("");
  const [orgAdmins, setOrgAdmins] = useState<OrgAdmin[]>([]);
  const [orgAdminsLoading, setOrgAdminsLoading] = useState(false);
  const [assignEmail, setAssignEmail] = useState("");
  const [assignName, setAssignName] = useState("");
  const [assignPassword, setAssignPassword] = useState("");
  const [assignMsg, setAssignMsg] = useState<string | null>(null);
  const [assignErr, setAssignErr] = useState<string | null>(null);
  const [adminConfirm, setAdminConfirm] = useState<{ type: "assign" | "remove"; admin?: OrgAdmin } | null>(null);
  const [adminBusy, setAdminBusy] = useState<string | null>(null); // "assign" or an admin id
  const isPlatform = !!ctx?.platformAdmin;
  const [tenantConfirm, setTenantConfirm] = useState<{ tenant: TenantItem; next: "SUSPENDED" | "ACTIVE" } | null>(null);
  const [tenantUpdating, setTenantUpdating] = useState<string | null>(null);
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
    // The organization list is only for the platform admin; organization admins only manage their own users.
    api.get<AdminContext>("/api/admin/tenants/context")
      .then((c) => {
        setCtx(c);
        return Promise.all([c.platformAdmin ? fetchTenants() : Promise.resolve(), fetchTeamMembers()]);
      })
      .catch(() => fetchTeamMembers())
      .finally(() => setLoading(false));

    const handleClickOutside = (e: MouseEvent) => {
      if (!(e.target as Element).closest('.role-dropdown-container')) {
        setOpenDropdownId(null);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const loadOrgAdmins = async (orgId: string) => {
    setAdminOrgId(orgId);
    setAssignMsg(null);
    setAssignErr(null);
    if (!orgId) { setOrgAdmins([]); return; }
    setOrgAdminsLoading(true);
    try {
      setOrgAdmins(await api.get<OrgAdmin[]>(`/api/admin/tenants/${orgId}/admins`));
    } catch (err: any) {
      setAssignErr(err.message || "Could not load administrators.");
      setOrgAdmins([]);
    } finally {
      setOrgAdminsLoading(false);
    }
  };

  const runAdminConfirm = async () => {
    if (!adminConfirm || !adminOrgId) return;
    const { type, admin } = adminConfirm;
    setAdminConfirm(null);
    setAssignMsg(null);
    setAssignErr(null);
    setAdminBusy(type === "assign" ? "assign" : admin!.id);
    try {
      if (type === "assign") {
        const created = await api.post<OrgAdmin>(`/api/admin/tenants/${adminOrgId}/admins`, {
          email: assignEmail.trim(),
          displayName: assignName.trim() || undefined,
          password: assignPassword || undefined,
        });
        setAssignMsg(`${created.email} is now an administrator.`);
        setAssignEmail(""); setAssignName(""); setAssignPassword("");
      } else {
        await api.del(`/api/admin/tenants/${adminOrgId}/admins/${admin!.id}`);
        setAssignMsg(`${admin!.email} is no longer an administrator (now a member).`);
      }
      setOrgAdmins(await api.get<OrgAdmin[]>(`/api/admin/tenants/${adminOrgId}/admins`));
      fetchTenants(); // user counts may change
    } catch (err: any) {
      setAssignErr(err.message || "The change could not be saved.");
    } finally {
      setAdminBusy(null);
    }
  };

  const handleTenantStatus = async () => {
    if (!tenantConfirm) return;
    const { tenant, next } = tenantConfirm;
    setTenantConfirm(null);
    setTenantUpdating(tenant.id);
    try {
      const updated = await api.patch<TenantItem>(`/api/admin/tenants/${tenant.id}/status?status=${next}`, {});
      setTenants((prev) => prev.map((t) => (t.id === tenant.id ? { ...t, status: updated.status } : t)));
    } catch (err: any) {
      alert("Failed to update organization: " + (err.message || err));
    } finally {
      setTenantUpdating(null);
    }
  };

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

  // Confirmation popup for approve / reject / reactivate
  const [confirmAction, setConfirmAction] = useState<{ type: "approve" | "reject" | "reactivate" | "delete" | "suspend"; member: TeamMember; id: string } | null>(null);

  const handleRejectSignup = async (memberId: string) => {
    setUpdatingId(memberId);
    try {
      await TeamsService.rejectSignup(memberId);
      setTeamMembers((prev) => prev.filter((m) => (m.id || m.userId) !== memberId));
    } catch (err: any) {
      alert("Failed to reject sign-up: " + (err.message || err));
    } finally {
      setUpdatingId(null);
    }
  };

  // Row currently being approved / rejected / reactivated: shown as a skeleton until the API answers
  const [processing, setProcessing] = useState<{ id: string; type: "approve" | "reject" | "reactivate" | "delete" | "suspend" } | null>(null);

  const runConfirmedAction = async () => {
    if (!confirmAction) return;
    const { type, id } = confirmAction;
    setConfirmAction(null);
    setProcessing({ id, type });
    try {
      if (type === "reject") await handleRejectSignup(id);
      else if (type === "delete") await handleDeleteUser(id);
      else if (type === "suspend") await handleSuspend(id);
      else await handleReactivate(id);
    } finally {
      setProcessing(null);
    }
  };

  // Suspend: reversible, blocks sign-in and existing sessions; data is kept.
  const handleSuspend = async (memberId: string) => {
    setUpdatingId(memberId);
    try {
      await TeamsService.removeMemberRecord(memberId);
      setTeamMembers((prev) => prev.map((m) => ((m.id || m.userId) === memberId ? { ...m, status: "SUSPENDED" } : m)));
    } catch (err: any) {
      alert("Could not suspend user: " + (err.message || err));
    } finally {
      setUpdatingId(null);
    }
  };

  // Permanent delete. The backend refuses users who still own projects, documents, teams or resources.
  const handleDeleteUser = async (memberId: string) => {
    setUpdatingId(memberId);
    try {
      await TeamsService.deleteMember(memberId);
      setTeamMembers((prev) => prev.filter((m) => (m.id || m.userId) !== memberId));
    } catch (err: any) {
      alert("Could not delete user: " + (err.message || err));
    } finally {
      setUpdatingId(null);
    }
  };

  const handleReactivate = async (memberId: string) => {
    setUpdatingId(memberId);
    try {
      const updated = await TeamsService.reactivateMember(memberId);
      setTeamMembers((prev) =>
        prev.map((m) => ((m.id || m.userId) === memberId ? { ...m, status: updated.status ?? "ACTIVE" } : m))
      );
    } catch (err: any) {
      alert("Failed to reactivate member: " + (err.message || err));
    } finally {
      setUpdatingId(null);
    }
  };

  const researchLeadsCount = teamMembers.filter(
    (m) => String(m.role).toUpperCase().replace("ROLE_", "") === "LEAD"
  ).length;

  if (loading) {
    if (platformHint === null) {
      return <LoadingState variant="org-admin" title="Loading Administration…" subtitle="Checking your administrator access" />;
    }
    return platformHint
      ? <LoadingState variant="admin" title="Loading Platform Administration…" subtitle="Fetching organizations, user counts and their status" />
      : <LoadingState variant="org-admin" title="Loading Organization Administration…" subtitle="Fetching your organization's users, roles and pending sign-ups" />;
  }

  return (
    <div>
      <style>{`
        @keyframes adminShimmer { 0% { background-position: 200% 0; } 100% { background-position: -200% 0; } }
        @keyframes adminSpin { to { transform: rotate(360deg); } }
        .admin-skeleton { background: #f1f5f9; background-image: linear-gradient(to left, #f1f5f9 8%, #e2e8f0 18%, #f1f5f9 33%); background-size: 200% 100%; animation: adminShimmer 1.4s linear infinite; border-radius: 6px; }
        .admin-spinner { width: 14px; height: 14px; border: 2px solid #cbd5e1; border-top-color: #0f172a; border-radius: 50%; animation: adminSpin 0.7s linear infinite; display: inline-block; }
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
          <h1 style={s.pageTitle}>{isPlatform ? "Platform Administration" : "Organization Administration"}</h1>
          <p style={s.pageSub}>
            {isPlatform
              ? "Platform administrator: create, monitor and suspend organizations. Each organization's research data stays private to it."
              : `Manage the users of ${ctx?.name ?? "your organization"}.`}
          </p>
        </div>
        {ctx && !isPlatform && (
          <Link href="/lead-dashboard" style={s.leadViewBtn} className="btn-shiny">
            Switch to Research Lead View →
          </Link>
        )}
      </div>

      {/* ── Stat Metric Cards ───────────────────────────────────────────────── */}
      <div style={s.statGrid}>
        <div style={s.statCard} className="stat-card-hover">
          {isPlatform ? (
            <>
              <span style={s.statLabel}>ORGANIZATIONS</span>
              <span style={s.statValue}>{tenants.length}</span>
              <span style={s.statSub}>Isolated PostgreSQL schemas</span>
            </>
          ) : (
            <>
              <span style={s.statLabel}>ORGANIZATION</span>
              <span style={{ ...s.statValue, fontSize: 22 }}>{ctx?.name ?? "—"}</span>
              <span style={s.statSub}>Slug: {ctx?.slug ?? "—"}</span>
            </>
          )}
        </div>
        {isPlatform ? (
          <>
            <div style={s.statCard} className="stat-card-hover">
              <span style={s.statLabel}>TOTAL USERS</span>
              <span style={s.statValue}>{tenants.reduce((sum, t) => sum + (t.userCount ?? 0), 0)}</span>
              <span style={s.statSub}>Across all organizations</span>
            </div>
            <div style={s.statCard} className="stat-card-hover">
              <span style={s.statLabel}>SUSPENDED ORGANIZATIONS</span>
              <span style={s.statValue}>{tenants.filter((t) => (t.status ?? "ACTIVE") !== "ACTIVE").length}</span>
              <span style={s.statSub}>Blocked until reactivated</span>
            </div>
          </>
        ) : (
          <>
            <div style={s.statCard} className="stat-card-hover">
              <span style={s.statLabel}>RESEARCH LEADS</span>
              <span style={s.statValue}>{researchLeadsCount}</span>
              <span style={s.statSub}>Lead & Supervisor Roles</span>
            </div>
            <div style={s.statCard} className="stat-card-hover">
              <span style={s.statLabel}>USERS IN {(ctx?.slug ?? "ORGANIZATION").toUpperCase()}</span>
              <span style={s.statValue}>{teamMembers.length}</span>
              <span style={s.statSub}>{teamMembers.filter((m) => String(m.status).toUpperCase() === "INACTIVE").length} awaiting approval</span>
            </div>
          </>
        )}
        <div style={s.statCard} className="stat-card-hover">
          <span style={s.statLabel}>SYSTEM HEALTH</span>
          <span style={s.statValue}>ONLINE</span>
          <span style={s.statSub}>Spring Boot Multi-Tenant Core</span>
        </div>
      </div>

      {/* ── Tenant Provisioning & Registry Section (platform admin only) ────── */}
      {isPlatform && (
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
              <span style={s.hint}>Schema will be named: <code>org_{(newSlug || "slug").toLowerCase().trim().replace(/\s+/g, "-").replace(/-/g, "_")}</code></span>
            </div>

            <button type="submit" style={s.submitBtn} disabled={provisioning} className="btn-shiny">
              {provisioning ? "Provisioning Schema..." : "➕ Create Tenant Schema"}
            </button>
          </form>
        </div>

        {/* Right: Tenant Registry List */}
        <div style={s.card} className="table-card-hover">
          <div style={s.cardHeader}>
            <h3 style={s.cardTitle}>📋 Organization Registry ({tenants.length})</h3>
            <p style={s.cardSub}>All organizations on the platform. Only names, status and user counts are shown; each organization's data stays private to it.</p>
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
                      {typeof t.userCount === "number" && <> · {t.userCount} user{t.userCount === 1 ? "" : "s"}</>}
                    </div>
                  </div>
                  <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    {(t.status ?? "ACTIVE") === "ACTIVE"
                      ? <span style={s.tenantBadge}>Active</span>
                      : <span style={{ ...s.tenantBadge, background: "#fef2f2", color: "#b91c1c", border: "1px solid #fecaca" }}>{t.status}</span>}
                    {t.slug === ctx?.slug ? (
                      <span style={{ fontSize: 11, color: "#64748b", fontWeight: 600 }}>Platform org</span>
                    ) : (
                      <button id={`btn-tenant-status-${t.slug}`} disabled={tenantUpdating === t.id}
                        onClick={() => setTenantConfirm({ tenant: t, next: (t.status ?? "ACTIVE") === "ACTIVE" ? "SUSPENDED" : "ACTIVE" })}
                        style={{ padding: "4px 10px", borderRadius: 6, fontSize: 12, fontWeight: 600, cursor: "pointer",
                          border: (t.status ?? "ACTIVE") === "ACTIVE" ? "1px solid #fecaca" : "1px solid #a7f3d0",
                          background: "#fff", color: (t.status ?? "ACTIVE") === "ACTIVE" ? "#b91c1c" : "#047857" }}>
                        {tenantUpdating === t.id ? "Saving…" : (t.status ?? "ACTIVE") === "ACTIVE" ? "Suspend" : "Reactivate"}
                      </button>
                    )}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      )}

      {/* ── Organization administrators (platform admin assigns them) ──────── */}
      {isPlatform && (
        <div style={{ ...s.card, marginTop: 24 }} className="table-card-hover" id="org-admins-panel">
          <div style={s.cardHeader}>
            <h3 style={s.cardTitle}>🛡️ Organization Administrators</h3>
            <p style={s.cardSub}>
              The platform administrator assigns each organization&apos;s admins. Organization admins then manage their own users;
              they cannot create other admins.
            </p>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 16, padding: "0 4px" }}>
            <div style={s.field}>
              <label style={s.label} htmlFor="select-admin-org">Organization</label>
              <select id="select-admin-org" value={adminOrgId} onChange={(e) => loadOrgAdmins(e.target.value)} style={s.input}>
                <option value="">Select an organization…</option>
                {tenants.map((t) => (
                  <option key={t.id} value={t.id}>{t.name} ({t.slug})</option>
                ))}
              </select>
            </div>

            {assignMsg && <div style={s.successAlert}>✅ {assignMsg}</div>}
            {assignErr && <div style={s.errorAlert}>⚠️ {assignErr}</div>}

            {adminOrgId && (
              <>
                <div>
                  <div style={{ ...s.label, marginBottom: 8 }}>Current administrators</div>
                  {orgAdminsLoading ? (
                    <div aria-busy="true" style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                      {[1, 2].map((i) => <div key={i} className="admin-skeleton" style={{ height: 44, borderRadius: 8 }} />)}
                    </div>
                  ) : orgAdmins.length === 0 ? (
                    <div style={s.emptyState}>No administrator yet. Assign one below.</div>
                  ) : (
                    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                      {orgAdmins.map((a) => (
                        <div key={a.id} data-testid={`org-admin-${a.email}`}
                          style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 14px", border: "1px solid #e5e7eb", borderRadius: 8 }}>
                          <div>
                            <strong style={{ fontSize: 14 }}>{a.displayName || a.email}</strong>
                            <div style={{ fontSize: 12, color: "#64748b" }}>{a.email}{a.status && a.status !== "ACTIVE" ? ` · ${a.status}` : ""}</div>
                          </div>
                          {adminBusy === a.id ? (
                            <span style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12, color: "#64748b", fontWeight: 600 }}>
                              <span className="admin-spinner" aria-hidden="true" /> Removing…
                            </span>
                          ) : (
                            <button onClick={() => setAdminConfirm({ type: "remove", admin: a })} disabled={!!adminBusy}
                              style={{ padding: "4px 10px", borderRadius: 6, border: "1px solid #fecaca", background: "#fff", color: "#b91c1c", fontSize: 12, fontWeight: 600, cursor: "pointer" }}>
                              Remove admin
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <form onSubmit={(e) => { e.preventDefault(); if (assignEmail.trim()) setAdminConfirm({ type: "assign" }); }}
                  style={{ display: "grid", gridTemplateColumns: "2fr 2fr 2fr auto", gap: 12, alignItems: "end" }}>
                  <div style={s.field}>
                    <label style={s.label} htmlFor="assign-email">Admin email</label>
                    <input id="assign-email" type="email" required value={assignEmail} onChange={(e) => setAssignEmail(e.target.value)} placeholder="admin@organization.org" style={s.input} />
                  </div>
                  <div style={s.field}>
                    <label style={s.label} htmlFor="assign-name">Full name (new accounts)</label>
                    <input id="assign-name" type="text" value={assignName} onChange={(e) => setAssignName(e.target.value)} placeholder="Dr. Jane Smith" style={s.input} />
                  </div>
                  <div style={s.field}>
                    <label style={s.label} htmlFor="assign-password">Initial password (new accounts)</label>
                    <input id="assign-password" type="password" value={assignPassword} onChange={(e) => setAssignPassword(e.target.value)} placeholder="Min. 8 characters" style={s.input} />
                  </div>
                  <button id="btn-assign-admin" type="submit" disabled={adminBusy === "assign"} style={{ ...s.submitBtn, whiteSpace: "nowrap" }} className="btn-shiny">
                    {adminBusy === "assign" ? "Assigning…" : "Assign Admin"}
                  </button>
                </form>
                <span style={s.hint}>
                  If the email already has an account in this organization it is promoted to administrator; otherwise a new administrator account is created with the initial password.
                </span>
              </>
            )}
          </div>
        </div>
      )}

      {/* ── Admin assign/remove confirmation popup ───────────────────────────── */}
      {adminConfirm && (() => {
        const org = tenants.find((t) => t.id === adminOrgId);
        const assign = adminConfirm.type === "assign";
        return (
          <div role="dialog" aria-modal="true" onClick={() => setAdminConfirm(null)}
            style={{ position: "fixed", inset: 0, background: "rgba(15, 23, 42, 0.5)", backdropFilter: "blur(2px)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000 }}>
            <div onClick={(e) => e.stopPropagation()}
              style={{ background: "#ffffff", borderRadius: 16, padding: 28, width: 440, maxWidth: "calc(100vw - 32px)", boxShadow: "0 25px 50px -12px rgba(0,0,0,0.25)", textAlign: "center" }}>
              <h3 style={{ fontSize: 18, fontWeight: 700, color: "#0f172a", margin: "0 0 8px 0" }}>{assign ? "Assign administrator?" : "Remove administrator?"}</h3>
              <p style={{ fontSize: 14, color: "#64748b", margin: "0 0 24px 0", lineHeight: 1.5 }}>
                {assign
                  ? `${assignEmail.trim()} will become an administrator of ${org?.name ?? "this organization"} and can manage its users.`
                  : `${adminConfirm.admin?.email} will stop being an administrator of ${org?.name ?? "this organization"} and become a member.`}
              </p>
              <div style={{ display: "flex", gap: 12 }}>
                <button onClick={() => setAdminConfirm(null)}
                  style={{ flex: 1, padding: "10px 16px", borderRadius: 8, border: "1px solid #e2e8f0", background: "#f8fafc", color: "#475569", fontSize: 14, fontWeight: 600, cursor: "pointer" }}>Cancel</button>
                <button onClick={runAdminConfirm}
                  style={{ flex: 1, padding: "10px 16px", borderRadius: 8, border: "none", background: assign ? "#047857" : "#b91c1c", color: "#ffffff", fontSize: 14, fontWeight: 600, cursor: "pointer" }}>
                  {assign ? "Yes, Assign" : "Yes, Remove"}
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* ── Research Lead & Roster Management Section (organization admins) ── */}
      {!isPlatform && (
      <div style={{ ...s.card, marginTop: 24 }} className="table-card-hover">
        <div style={s.cardHeader}>
          <h3 style={s.cardTitle}>👥 Team Member Roles & Research Lead Assignment</h3>
          <p style={s.cardSub}>
            Users in <strong>{ctx?.name ?? "this organization"}</strong>{ctx?.slug ? <> (<code>{ctx.slug}</code>)</> : null}.
            Each organization&apos;s users are managed by its own admin. Approve new sign-ups and assign Research Lead or Resource Manager roles.
          </p>
        </div>

        <table style={s.table}>
          <thead>
            <tr>
              <th style={s.th}>User</th>
              <th style={s.th}>Email</th>
              <th style={s.th}>Current Role</th>
              <th style={s.th}>Status</th>
              <th style={s.th}>Assign Role</th>
            </tr>
          </thead>
          <tbody>
            {teamMembers.length === 0 ? (
              <tr>
                <td colSpan={5} style={s.emptyStateCell}>
                  No roster members found in this tenant context.
                </td>
              </tr>
            ) : (
              teamMembers.map((m, idx) => {
                const memberKey = m.id || m.userId || `member-${idx}`;
                if (processing?.id === memberKey) {
                  const label = { approve: "Approving…", reject: "Rejecting…", reactivate: "Reactivating…", delete: "Deleting…", suspend: "Suspending…" }[processing.type];
                  return (
                    <tr key={memberKey} aria-busy="true" data-testid={`row-processing-${memberKey}`}>
                      <td style={s.td}><div className="admin-skeleton" style={{ width: 140, height: 14 }} /></td>
                      <td style={s.td}><div className="admin-skeleton" style={{ width: 190, height: 14 }} /></td>
                      <td style={s.td}><div className="admin-skeleton" style={{ width: 70, height: 20, borderRadius: 10 }} /></td>
                      <td style={s.td}>
                        <span style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12, fontWeight: 600, color: "#64748b" }}>
                          <span className="admin-spinner" aria-hidden="true" /> {label}
                        </span>
                      </td>
                      <td style={s.td}><div className="admin-skeleton" style={{ width: 200, height: 34, borderRadius: 8 }} /></td>
                    </tr>
                  );
                }
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
                      {["SUSPENDED", "INACTIVE"].includes(String(m.status || "ACTIVE").toUpperCase()) ? (() => {
                        const pending = String(m.status).toUpperCase() === "INACTIVE";
                        return (
                          <span style={{ display: "flex", alignItems: "center", gap: 8, whiteSpace: "nowrap" }}>
                            <span style={{ fontSize: 11, fontWeight: 700, color: pending ? "#b45309" : "#b91c1c", background: pending ? "#fffbeb" : "#fef2f2", border: `1px solid ${pending ? "#fde68a" : "#fecaca"}`, borderRadius: 12, padding: "2px 8px" }}>
                              {pending ? "PENDING APPROVAL" : "SUSPENDED"}
                            </span>
                            <button id={`btn-reactivate-${memberKey}`} disabled={updatingId === memberKey}
                              onClick={() => setConfirmAction({ type: pending ? "approve" : "reactivate", member: m, id: memberKey })}
                              style={{ padding: "4px 10px", borderRadius: 6, border: "1px solid #a7f3d0", background: "#ecfdf5", color: "#047857", fontSize: 12, fontWeight: 600, cursor: "pointer" }}>
                              {updatingId === memberKey ? "Saving…" : pending ? "Approve" : "Reactivate"}
                            </button>
                            {pending && (
                              <button id={`btn-reject-${memberKey}`} disabled={updatingId === memberKey}
                                onClick={() => setConfirmAction({ type: "reject", member: m, id: memberKey })}
                                style={{ padding: "4px 10px", borderRadius: 6, border: "1px solid #fecaca", background: "#fff", color: "#b91c1c", fontSize: 12, fontWeight: 600, cursor: "pointer" }}>
                                Reject
                              </button>
                            )}
                          </span>
                        );
                      })() : (
                        <span style={{ display: "flex", alignItems: "center", gap: 8, whiteSpace: "nowrap" }}>
                          <span style={{ fontSize: 11, fontWeight: 700, color: "#047857" }}>{String(m.status || "ACTIVE").toUpperCase()}</span>
                          {!(String(m.role).toUpperCase().includes("ADMIN") || String(m.role).toUpperCase().includes("OWNER")) && (
                            <button id={`btn-suspend-${memberKey}`} disabled={updatingId === memberKey} title="Block sign-in (reversible)"
                              onClick={() => setConfirmAction({ type: "suspend", member: m, id: memberKey })}
                              style={{ padding: "4px 10px", borderRadius: 6, border: "1px solid #fde68a", background: "#fffbeb", color: "#b45309", fontSize: 12, fontWeight: 600, cursor: "pointer" }}>
                              Suspend
                            </button>
                          )}
                        </span>
                      )}
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
                               String(m.role).replace("ROLE_", "") === "RESOURCE_MANAGER" ? "Resource Manager" :
                               String(m.role).replace("ROLE_", "") === "RESEARCHER" ? "Researcher" :
                               String(m.role).replace("ROLE_", "") === "GUEST" ? "Guest (Read-only)" : String(m.role).replace("ROLE_", "")}
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
                      {!(String(m.role).toUpperCase().includes("ADMIN") || String(m.role).toUpperCase().includes("OWNER")) && (
                        <button id={`btn-delete-${memberKey}`} disabled={updatingId === memberKey} title="Delete user permanently"
                          onClick={() => setConfirmAction({ type: "delete", member: m, id: memberKey })}
                          style={{ marginTop: 6, padding: "4px 10px", borderRadius: 6, border: "1px solid #fecaca", background: "#fff", color: "#b91c1c", fontSize: 12, fontWeight: 600, cursor: "pointer" }}>
                          Delete
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
      )}
      {/* ── Confirmation popup for suspending / reactivating an organization ──── */}
      {tenantConfirm && (
        <div role="dialog" aria-modal="true" onClick={() => setTenantConfirm(null)}
          style={{ position: "fixed", inset: 0, background: "rgba(15, 23, 42, 0.5)", backdropFilter: "blur(2px)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000 }}>
          <div onClick={(e) => e.stopPropagation()}
            style={{ background: "#ffffff", borderRadius: 16, padding: 28, width: 440, maxWidth: "calc(100vw - 32px)", boxShadow: "0 25px 50px -12px rgba(0,0,0,0.25)", textAlign: "center" }}>
            <h3 style={{ fontSize: 18, fontWeight: 700, color: "#0f172a", margin: "0 0 8px 0" }}>
              {tenantConfirm.next === "SUSPENDED" ? "Suspend organization?" : "Reactivate organization?"}
            </h3>
            <p style={{ fontSize: 14, color: "#64748b", margin: "0 0 24px 0", lineHeight: 1.5 }}>
              {tenantConfirm.next === "SUSPENDED"
                ? `All users of ${tenantConfirm.tenant.name} (${tenantConfirm.tenant.slug}) will be blocked until it is reactivated. No data is deleted.`
                : `Users of ${tenantConfirm.tenant.name} (${tenantConfirm.tenant.slug}) will be able to sign in again.`}
            </p>
            <div style={{ display: "flex", gap: 12 }}>
              <button onClick={() => setTenantConfirm(null)}
                style={{ flex: 1, padding: "10px 16px", borderRadius: 8, border: "1px solid #e2e8f0", background: "#f8fafc", color: "#475569", fontSize: 14, fontWeight: 600, cursor: "pointer" }}>
                Cancel
              </button>
              <button onClick={handleTenantStatus}
                style={{ flex: 1, padding: "10px 16px", borderRadius: 8, border: "none", background: tenantConfirm.next === "SUSPENDED" ? "#b91c1c" : "#047857", color: "#ffffff", fontSize: 14, fontWeight: 600, cursor: "pointer" }}>
                {tenantConfirm.next === "SUSPENDED" ? "Yes, Suspend" : "Yes, Reactivate"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Confirmation popup for approve / reject / reactivate ─────────────── */}
      {confirmAction && (() => {
        const who = confirmAction.member.displayName || confirmAction.member.email || "this user";
        const email = confirmAction.member.email || "";
        const copy = {
          approve:    { title: "Approve account?",        body: `${who} (${email}) will be able to sign in as a Researcher.`, btn: "Yes, Approve", color: "#047857" },
          reject:     { title: "Reject sign-up request?", body: `The sign-up request from ${who} (${email}) will be deleted. They can register again later.`, btn: "Yes, Reject", color: "#b91c1c" },
          delete:     { title: "Delete user permanently?", body: `${who} (${email}) and their chat messages, notifications and bookings will be removed for good, and their tasks become unassigned. This cannot be undone. To only block access, use Suspend instead.`, btn: "Yes, Delete", color: "#b91c1c" },
          suspend:    { title: "Suspend account?", body: `${who} (${email}) will be signed out and blocked from signing in. Their projects, tasks and documents are kept. You can reactivate the account at any time.`, btn: "Yes, Suspend", color: "#b45309" },
          reactivate: { title: "Reactivate account?",     body: `${who} (${email}) will be able to sign in again.`, btn: "Yes, Reactivate", color: "#047857" },
        }[confirmAction.type];
        return (
          <div role="dialog" aria-modal="true" aria-labelledby="confirm-title" onClick={() => setConfirmAction(null)}
            style={{ position: "fixed", inset: 0, background: "rgba(15, 23, 42, 0.5)", backdropFilter: "blur(2px)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000 }}>
            <div onClick={(e) => e.stopPropagation()}
              style={{ background: "#ffffff", borderRadius: 16, padding: 28, width: 420, maxWidth: "calc(100vw - 32px)", boxShadow: "0 25px 50px -12px rgba(0,0,0,0.25)", textAlign: "center" }}>
              <h3 id="confirm-title" style={{ fontSize: 18, fontWeight: 700, color: "#0f172a", margin: "0 0 8px 0" }}>{copy.title}</h3>
              <p style={{ fontSize: 14, color: "#64748b", margin: "0 0 24px 0", lineHeight: 1.5 }}>{copy.body}</p>
              <div style={{ display: "flex", gap: 12 }}>
                <button onClick={() => setConfirmAction(null)}
                  style={{ flex: 1, padding: "10px 16px", borderRadius: 8, border: "1px solid #e2e8f0", background: "#f8fafc", color: "#475569", fontSize: 14, fontWeight: 600, cursor: "pointer" }}>
                  Cancel
                </button>
                <button id="btn-confirm-action" onClick={runConfirmedAction}
                  style={{ flex: 1, padding: "10px 16px", borderRadius: 8, border: "none", background: copy.color, color: "#ffffff", fontSize: 14, fontWeight: 600, cursor: "pointer" }}>
                  {copy.btn}
                </button>
              </div>
            </div>
          </div>
        );
      })()}
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
