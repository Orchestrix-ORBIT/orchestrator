"use client";

import React, { useState } from "react";

interface PolicyRule {
  id: string;
  assetCategory: string;
  maxContinuousHours: number;
  maxWeeklyQuotaPerProject: number;
  bufferBetweenBookingsMinutes: number;
  priorityTier: "Standard" | "High-Demand" | "Critical-Path";
}

const INITIAL_POLICIES: PolicyRule[] = [
  {
    id: "POL-1",
    assetCategory: "COMPUTE (NVIDIA H100 SXM5 80GB GPU Nodes)",
    maxContinuousHours: 8,
    maxWeeklyQuotaPerProject: 48,
    bufferBetweenBookingsMinutes: 15,
    priorityTier: "High-Demand",
  },
  {
    id: "POL-2",
    assetCategory: "INSTRUMENT (Illumina NovaSeq 6000 Sequencer)",
    maxContinuousHours: 12,
    maxWeeklyQuotaPerProject: 36,
    bufferBetweenBookingsMinutes: 30,
    priorityTier: "High-Demand",
  },
  {
    id: "POL-3",
    assetCategory: "INSTRUMENT (FEI Titan 300kV TEM Microscope)",
    maxContinuousHours: 4,
    maxWeeklyQuotaPerProject: 16,
    bufferBetweenBookingsMinutes: 30,
    priorityTier: "Critical-Path",
  },
  {
    id: "POL-4",
    assetCategory: "ROOM (BSL-2 Cell Culture Cleanroom)",
    maxContinuousHours: 6,
    maxWeeklyQuotaPerProject: 24,
    bufferBetweenBookingsMinutes: 15,
    priorityTier: "Standard",
  },
  {
    id: "POL-5",
    assetCategory: "SOFTWARE (MATLAB R2026a HPC Licenses)",
    maxContinuousHours: 24,
    maxWeeklyQuotaPerProject: 168,
    bufferBetweenBookingsMinutes: 0,
    priorityTier: "Standard",
  },
];

export default function AllocationPoliciesPage() {
  const [policies, setPolicies] = useState<PolicyRule[]>(INITIAL_POLICIES);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedPolicy, setSelectedPolicy] = useState<PolicyRule | null>(null);
  const [maxHours, setMaxHours] = useState(4);
  const [weeklyQuota, setWeeklyQuota] = useState(20);
  const [buffer, setBuffer] = useState(15);

  const openEdit = (p: PolicyRule) => {
    setSelectedPolicy(p);
    setMaxHours(p.maxContinuousHours);
    setWeeklyQuota(p.maxWeeklyQuotaPerProject);
    setBuffer(p.bufferBetweenBookingsMinutes);
    setShowEditModal(true);
  };

  const handleSavePolicy = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPolicy) return;

    setPolicies((prev) =>
      prev.map((p) =>
        p.id === selectedPolicy.id
          ? {
              ...p,
              maxContinuousHours: maxHours,
              maxWeeklyQuotaPerProject: weeklyQuota,
              bufferBetweenBookingsMinutes: buffer,
            }
          : p
      )
    );
    setShowEditModal(false);
  };

  return (
    <div>
      {/* ── Page Header ────────────────────────────────────────────────────── */}
      <div style={s.headerRow}>
        <div>
          <h1 style={s.pageTitle}>Allocation Policies & Quotas</h1>
          <p style={s.pageSub}>
            Define fair-access duration limits, project quotas, and mandatory cooldown buffers.
          </p>
        </div>
      </div>

      {/* ── Metric Stat Cards ────────────────────────────────────────────────── */}
      <div style={s.statGrid}>
        <div style={s.statCard}>
          <span style={s.statLabel}>ACTIVE POLICIES</span>
          <span style={s.statValue}>{policies.length}</span>
          <span style={s.statSub}>Hardware rules enforced</span>
        </div>
        <div style={s.statCard}>
          <span style={s.statLabel}>MAX SINGLE SLOT</span>
          <span style={s.statValue}>12 hrs</span>
          <span style={s.statSub}>FEI Titan TEM Microscope</span>
        </div>
        <div style={s.statCard}>
          <span style={s.statLabel}>MANDATORY COOLDOWN</span>
          <span style={s.statValue}>15 - 60 min</span>
          <span style={s.statSub}>Thermal & vacuum reset</span>
        </div>
        <div style={s.statCard}>
          <span style={s.statLabel}>OVERRIDE AUTHORITY</span>
          <span style={s.statValue}>ENABLED</span>
          <span style={s.statSub}>Resource Manager clearance</span>
        </div>
      </div>

      {/* ── Policies Table Card ─────────────────────────────────────────────── */}
      <div style={s.tableCard}>
        <div style={s.tableHeaderRow}>
          <p style={s.sectionLabel}>ENFORCED ASSET DURATION RULES</p>
          <span style={{ fontSize: 12, color: "#9e9e9e", marginRight: 20 }}>
            Spring Boot Enforcement Engine
          </span>
        </div>

        <table style={s.table}>
          <thead>
            <tr>
              <th style={s.th}>Asset Category</th>
              <th style={s.th}>Max Continuous Slot</th>
              <th style={s.th}>Weekly Project Quota</th>
              <th style={s.th}>Cooldown Buffer</th>
              <th style={s.th}>Tier</th>
              <th style={{ ...s.th, textAlign: "right" }}>Action</th>
            </tr>
          </thead>
          <tbody>
            {policies.map((p) => (
              <tr key={p.id} style={s.tr}>
                <td style={s.td}>
                  <strong>{p.assetCategory}</strong>
                </td>
                <td style={s.td}>{p.maxContinuousHours} hours / request</td>
                <td style={s.td}>{p.maxWeeklyQuotaPerProject} hours / week</td>
                <td style={{ ...s.td, color: "#616161" }}>{p.bufferBetweenBookingsMinutes} minutes</td>
                <td style={s.td}>
                  <span
                    style={{
                      ...s.badge,
                      ...(p.priorityTier === "Critical-Path"
                        ? s.badgeCrit
                        : p.priorityTier === "High-Demand"
                        ? s.badgeHigh
                        : s.badgeNorm),
                    }}
                  >
                    {p.priorityTier}
                  </span>
                </td>
                <td style={{ ...s.td, textAlign: "right" }}>
                  <button onClick={() => openEdit(p)} style={s.btnEdit}>
                    Edit Rules →
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* ── Edit Policy Modal ───────────────────────────────────────────────── */}
      {showEditModal && selectedPolicy && (
        <div style={m.overlay}>
          <div style={m.modal}>
            <div style={m.header}>
              <div>
                <h3 style={m.title}>Update Allocation Policy</h3>
                <p style={m.sub}>{selectedPolicy.assetCategory}</p>
              </div>
              <button onClick={() => setShowEditModal(false)} style={m.closeBtn}>✕</button>
            </div>

            <form onSubmit={handleSavePolicy} style={m.body}>
              <div style={m.field}>
                <label style={m.label}>MAX CONTINUOUS DURATION (HOURS)</label>
                <input
                  type="number"
                  min={1}
                  max={24}
                  value={maxHours}
                  onChange={(e) => setMaxHours(Number(e.target.value))}
                  style={m.input}
                />
              </div>

              <div style={m.field}>
                <label style={m.label}>WEEKLY QUOTA PER PROJECT (HOURS)</label>
                <input
                  type="number"
                  min={1}
                  max={100}
                  value={weeklyQuota}
                  onChange={(e) => setWeeklyQuota(Number(e.target.value))}
                  style={m.input}
                />
              </div>

              <div style={m.field}>
                <label style={m.label}>COOLDOWN BUFFER BETWEEN SLOTS (MINUTES)</label>
                <input
                  type="number"
                  min={0}
                  max={120}
                  step={5}
                  value={buffer}
                  onChange={(e) => setBuffer(Number(e.target.value))}
                  style={m.input}
                />
              </div>

              <div style={m.footer}>
                <button
                  type="button"
                  onClick={() => setShowEditModal(false)}
                  style={m.btnSecondary}
                >
                  Cancel
                </button>
                <button type="submit" style={m.btnPrimary}>
                  Save Policy Update
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

const s: Record<string, React.CSSProperties> = {
  headerRow: { display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: 24 },
  pageTitle: { fontSize: 28, fontWeight: 700, color: "#161616", letterSpacing: "-0.5px", marginBottom: 4 },
  pageSub: { fontSize: 13, color: "#9e9e9e" },
  statGrid: { display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16, marginBottom: 32 },
  statCard: { background: "#ffffff", border: "1px solid #e0e0e0", borderRadius: 6, padding: "18px 20px 20px", display: "flex", flexDirection: "column", gap: 6 },
  statLabel: { fontSize: 11, fontWeight: 600, color: "#9e9e9e", letterSpacing: "0.5px", textTransform: "uppercase" as const },
  statValue: { fontSize: 32, fontWeight: 700, color: "#161616", letterSpacing: "-1px", lineHeight: 1.1 },
  statSub: { fontSize: 12, color: "#9e9e9e" },
  tableCard: { background: "#ffffff", border: "1px solid #e0e0e0", borderRadius: 6, overflow: "hidden" },
  tableHeaderRow: { display: "flex", alignItems: "center", justifyContent: "space-between", borderBottom: "1px solid #eeeeee", background: "#fafafa" },
  sectionLabel: { fontSize: 11, fontWeight: 600, color: "#9e9e9e", letterSpacing: "0.6px", textTransform: "uppercase" as const, padding: "14px 20px 4px", margin: 0 },
  table: { width: "100%", borderCollapse: "collapse" as const, fontSize: 13 },
  th: { textAlign: "left" as const, padding: "10px 16px", fontSize: 12, fontWeight: 500, color: "#9e9e9e", borderBottom: "1px solid #eeeeee", background: "#fafafa" },
  tr: { borderBottom: "1px solid #f0f0f0" },
  td: { padding: "14px 16px", color: "#161616", fontSize: 13, verticalAlign: "middle" as const },
  badge: { fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 3, textTransform: "uppercase" as const, whiteSpace: "nowrap" as const, display: "inline-block", flexShrink: 0 },
  badgeCrit: { background: "#fee2e2", color: "#dc2626", border: "1px solid #fca5a5" },
  badgeHigh: { background: "#fff8e1", color: "#f57f17", border: "1px solid #ffe082" },
  badgeNorm: { background: "#f5f5f5", color: "#616161", border: "1px solid #e0e0e0" },
  btnEdit: { padding: "5px 12px", background: "#f5f5f5", border: "1px solid #d0d0d0", borderRadius: 4, fontSize: 12, fontWeight: 600, color: "#161616", cursor: "pointer", whiteSpace: "nowrap" as const },
};

const m: Record<string, React.CSSProperties> = {
  overlay: { position: "fixed" as const, inset: 0, background: "rgba(0, 0, 0, 0.4)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 100, padding: 20 },
  modal: { background: "#ffffff", border: "1px solid #e0e0e0", borderRadius: 6, width: "100%", maxWidth: 500, boxShadow: "0 10px 25px rgba(0, 0, 0, 0.1)" },
  header: { padding: "18px 24px", borderBottom: "1px solid #eeeeee", display: "flex", alignItems: "flex-start", justifyContent: "space-between", background: "#fafafa" },
  title: { fontSize: 16, fontWeight: 700, color: "#161616", margin: 0 },
  sub: { fontSize: 12, color: "#9e9e9e", marginTop: 4 },
  closeBtn: { background: "none", border: "none", fontSize: 15, color: "#9e9e9e", cursor: "pointer" },
  body: { padding: "20px 24px", display: "flex", flexDirection: "column", gap: 14 },
  field: { display: "flex", flexDirection: "column", gap: 6 },
  label: { fontSize: 11, fontWeight: 600, color: "#9e9e9e", letterSpacing: "0.5px" },
  input: { padding: "8px 12px", fontSize: 13, border: "1px solid #d0d0d0", borderRadius: 4, outline: "none", background: "#ffffff" },
  footer: { padding: "14px 24px", borderTop: "1px solid #eeeeee", background: "#fafafa", display: "flex", justifyContent: "space-between", alignItems: "center" },
  btnPrimary: { padding: "8px 16px", background: "#161616", color: "#ffffff", border: "none", borderRadius: 4, fontSize: 13, fontWeight: 600, cursor: "pointer" },
  btnSecondary: { padding: "8px 14px", background: "#ffffff", color: "#424242", border: "1px solid #d0d0d0", borderRadius: 4, fontSize: 13, fontWeight: 500, cursor: "pointer" },
};
