"use client";

import React, { useEffect, useMemo, useState } from "react";
import LoadingState from "@/components/ui/LoadingState";
import { ResourcesService, type Booking, type Resource } from "@/lib/services/resources";

// Live usage analytics computed from the real resources, bookings and maintenance data.
// "Booked hours" counts APPROVED bookings that overlap the current calendar month.

const ACTIVE = new Set(["APPROVED"]);
const PENDING = new Set(["PENDING", "PENDING_APPROVAL"]);

function hoursInWindow(b: Booking, from: Date, to: Date): number {
  const start = Math.max(new Date(b.startTime).getTime(), from.getTime());
  const end = Math.min(new Date(b.endTime).getTime(), to.getTime());
  return end > start ? (end - start) / 3_600_000 : 0;
}

function fmtHours(h: number): string {
  return h >= 10 ? `${Math.round(h)} hrs` : `${h.toFixed(1)} hrs`;
}

export default function UsageAnalyticsPage() {
  const [resources, setResources] = useState<Resource[]>([]);
  const [bookings, setBookings] = useState<(Booking & { projectName?: string; userEmail?: string })[]>([]);
  const [maintenance, setMaintenance] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const [res, maint] = await Promise.all([
          ResourcesService.getAll(),
          ResourcesService.getMaintenance().catch(() => []),
        ]);
        const perResource = await Promise.all(res.map((r) => ResourcesService.getBookings(r.id).catch(() => [] as Booking[])));
        setResources(res);
        setBookings(perResource.flat());
        setMaintenance(maint as any[]);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Could not load analytics data.");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const stats = useMemo(() => {
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 1);
    const approved = bookings.filter((b) => ACTIVE.has(b.status));
    const monthHours = approved.reduce((sum, b) => sum + hoursInWindow(b, monthStart, monthEnd), 0);
    const pending = bookings.filter((b) => PENDING.has(b.status)).length;
    const activeMaint = maintenance.filter((m) => {
      const s = new Date(m.startTime ?? m.startDate ?? 0).getTime();
      const e = new Date(m.endTime ?? m.endDate ?? 0).getTime();
      return e >= now.getTime() && s <= now.getTime() + 7 * 86_400_000;
    }).length;
    const available = resources.filter((r) => r.status === "AVAILABLE").length;

    // Booked hours per resource type, relative to monthly capacity (resources × hours in month)
    const monthCapacityPerResource = (monthEnd.getTime() - monthStart.getTime()) / 3_600_000;
    const typeOf = new Map(resources.map((r) => [r.id, r.type]));
    const byType = new Map<string, { hours: number; count: number }>();
    for (const r of resources) {
      const cur = byType.get(r.type) ?? { hours: 0, count: 0 };
      byType.set(r.type, { ...cur, count: cur.count + 1 });
    }
    for (const b of approved) {
      const t = typeOf.get(b.resourceId);
      if (!t) continue;
      byType.get(t)!.hours += hoursInWindow(b, monthStart, monthEnd);
    }
    const categories = [...byType.entries()]
      .map(([type, v]) => ({ type, hours: v.hours, count: v.count, pct: (v.hours / (v.count * monthCapacityPerResource)) * 100 }))
      .sort((a, b) => b.hours - a.hours);

    // Booked hours per project (all approved bookings)
    const byProject = new Map<string, number>();
    for (const b of approved) {
      const key = b.projectName || "No project";
      byProject.set(key, (byProject.get(key) ?? 0) + (new Date(b.endTime).getTime() - new Date(b.startTime).getTime()) / 3_600_000);
    }
    const totalProjectHours = [...byProject.values()].reduce((a, b) => a + b, 0);
    const projects = [...byProject.entries()].map(([name, hours]) => ({ name, hours, share: totalProjectHours ? (hours / totalProjectHours) * 100 : 0 }))
      .sort((a, b) => b.hours - a.hours);

    return { monthHours, pending, activeMaint, available, categories, projects };
  }, [resources, bookings, maintenance]);

  function exportCsv() {
    const header = ["Resource", "Project", "User", "Start", "End", "Hours", "Status", "Purpose"];
    const name = new Map(resources.map((r) => [r.id, r.name]));
    const rows = bookings.map((b) => [
      name.get(b.resourceId) ?? b.resourceName ?? "", b.projectName ?? "", b.userEmail ?? "",
      b.startTime, b.endTime, ((new Date(b.endTime).getTime() - new Date(b.startTime).getTime()) / 3_600_000).toFixed(2),
      b.status, (b as any).purpose ?? "",
    ]);
    const csv = [header, ...rows].map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = `resource-usage-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  if (loading) return <LoadingState title="Loading Usage Analytics..." subtitle="Aggregating bookings, assets and maintenance windows" />;
  if (error) return <p style={{ padding: 24, color: "#c62828", fontSize: 14 }}>Error: {error}</p>;

  return (
    <div>
      {/* ── Page Header ─────────────────────────────────────────────────────── */}
      <div style={s.headerRow}>
        <div>
          <h1 style={s.pageTitle}>Usage & Capacity Analytics</h1>
          <p style={s.pageSub}>
            Live figures from {resources.length} assets and {bookings.length} booking records.
          </p>
        </div>
        <button style={s.btnSecondary} onClick={exportCsv} disabled={bookings.length === 0}>
          📥 Export Booking Report (CSV)
        </button>
      </div>

      {/* ── Metric Stat Cards ───────────────────────────────────────────────── */}
      <div style={s.statGrid}>
        <div style={s.statCard}>
          <span style={s.statLabel}>HOURS BOOKED</span>
          <span style={s.statValue}>{fmtHours(stats.monthHours)}</span>
          <span style={s.statSub}>Approved, current month</span>
        </div>
        <div style={s.statCard}>
          <span style={s.statLabel}>PENDING APPROVALS</span>
          <span style={s.statValue}>{stats.pending}</span>
          <span style={s.statSub}>Booking requests awaiting review</span>
        </div>
        <div style={s.statCard}>
          <span style={s.statLabel}>AVAILABLE ASSETS</span>
          <span style={s.statValue}>{stats.available}/{resources.length}</span>
          <span style={s.statSub}>Ready to book right now</span>
        </div>
        <div style={s.statCard}>
          <span style={s.statLabel}>MAINTENANCE WINDOWS</span>
          <span style={s.statValue}>{stats.activeMaint}</span>
          <span style={s.statSub}>Active or starting within 7 days</span>
        </div>
      </div>

      {/* ── Visual Analytics Breakdown ──────────────────────────────────────── */}
      <div style={s.chartGrid}>
        <div style={s.chartCard}>
          <p style={s.sectionLabel}>UTILIZATION BY ASSET CATEGORY (THIS MONTH)</p>
          <div style={{ display: "flex", flexDirection: "column", gap: 16, padding: "16px 20px" }}>
            {stats.categories.length === 0 && <p style={{ fontSize: 13, color: "#9e9e9e" }}>No assets registered.</p>}
            {stats.categories.map((c) => (
              <div key={c.type}>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, marginBottom: 6 }}>
                  <strong>{c.type} <span style={{ fontWeight: 400, color: "#9e9e9e" }}>({c.count} asset{c.count === 1 ? "" : "s"})</span></strong>
                  <span style={{ fontWeight: 600 }}>{fmtHours(c.hours)} · {c.pct.toFixed(1)}%</span>
                </div>
                <div style={s.progressBarBg}>
                  <div style={{ ...s.progressBarFill, width: `${Math.min(100, c.pct)}%`, background: "#161616" }} />
                </div>
              </div>
            ))}
          </div>
        </div>

        <div style={s.chartCard}>
          <p style={s.sectionLabel}>HOURS BOOKED BY RESEARCH PROJECT</p>
          <table style={s.table}>
            <thead>
              <tr>
                <th style={s.th}>Project Workspace</th>
                <th style={s.th}>Hours</th>
                <th style={s.th}>Share</th>
              </tr>
            </thead>
            <tbody>
              {stats.projects.length === 0 && (
                <tr style={s.tr}><td style={s.td} colSpan={3}>No approved bookings yet.</td></tr>
              )}
              {stats.projects.map((p) => (
                <tr key={p.name} style={s.tr}>
                  <td style={s.td}><strong>{p.name}</strong></td>
                  <td style={s.td}>{fmtHours(p.hours)}</td>
                  <td style={s.td}>{p.share.toFixed(1)}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

const s: Record<string, React.CSSProperties> = {
  headerRow: { display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: 24 },
  pageTitle: { fontSize: 28, fontWeight: 700, color: "#161616", letterSpacing: "-0.5px", marginBottom: 4 },
  pageSub: { fontSize: 13, color: "#9e9e9e" },
  btnSecondary: { background: "#ffffff", color: "#424242", border: "1px solid #d0d0d0", borderRadius: 4, padding: "8px 14px", fontSize: 13, fontWeight: 500, cursor: "pointer" },
  statGrid: { display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16, marginBottom: 32 },
  statCard: { background: "#ffffff", border: "1px solid #e0e0e0", borderRadius: 6, padding: "18px 20px 20px", display: "flex", flexDirection: "column", gap: 6 },
  statLabel: { fontSize: 11, fontWeight: 600, color: "#9e9e9e", letterSpacing: "0.5px", textTransform: "uppercase" as const },
  statValue: { fontSize: 32, fontWeight: 700, color: "#161616", letterSpacing: "-1px", lineHeight: 1.1 },
  statSub: { fontSize: 12, color: "#9e9e9e" },
  chartGrid: { display: "grid", gridTemplateColumns: "1.2fr 1fr", gap: 20 },
  chartCard: { background: "#ffffff", border: "1px solid #e0e0e0", borderRadius: 6, overflow: "hidden" },
  sectionLabel: { fontSize: 11, fontWeight: 600, color: "#9e9e9e", letterSpacing: "0.6px", textTransform: "uppercase" as const, padding: "14px 20px", borderBottom: "1px solid #eeeeee", background: "#fafafa", margin: 0 },
  progressBarBg: { height: 6, background: "#f0f0f0", borderRadius: 3, overflow: "hidden" },
  progressBarFill: { height: "100%", borderRadius: 3 },
  table: { width: "100%", borderCollapse: "collapse" as const, fontSize: 13 },
  th: { textAlign: "left" as const, padding: "10px 16px", fontSize: 12, fontWeight: 500, color: "#9e9e9e", borderBottom: "1px solid #eeeeee", background: "#fafafa" },
  tr: { borderBottom: "1px solid #f0f0f0" },
  td: { padding: "12px 16px", color: "#161616", fontSize: 13 },
};
