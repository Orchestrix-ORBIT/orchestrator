"use client";

import { useEffect, useState } from "react";
import { ResourcesService, type Resource } from "@/lib/services/resources";

export default function ResourceDashboardPage() {
  const [resources, setResources] = useState<Resource[]>([]);
  const [maintenanceLogs, setMaintenanceLogs] = useState<any[]>([]);
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState<string | null>(null);

  useEffect(() => {
    Promise.all([
      ResourcesService.getAll().catch(() => []),
      ResourcesService.getMaintenance().catch(() => []),
    ])
      .then(([resList, maintList]) => {
        setResources(resList);
        setMaintenanceLogs(maintList || []);
      })
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <p style={{ padding: 40, color: "#888", fontSize: 14 }}>Loading…</p>;
  if (error)   return <p style={{ padding: 24, color: "#c62828", fontSize: 14 }}>Error: {error}</p>;

  const effectiveResources = resources.map(r => ({
    ...r,
    effectiveStatus: getEffectiveStatus(r, maintenanceLogs),
  }));

  const available    = effectiveResources.filter(r => r.effectiveStatus === "AVAILABLE").length;
  const inUse        = effectiveResources.filter(r => r.effectiveStatus === "IN_USE").length;
  const maintenance  = effectiveResources.filter(r => r.effectiveStatus === "MAINTENANCE").length;
  const utilization  = resources.length ? Math.round((inUse / resources.length) * 100) : 0;

  const STATS = [
    { id: "stat-total",        label: "TOTAL ASSETS",       value: String(resources.length), sub: "registered" },
    { id: "stat-available",    label: "AVAILABLE NOW",      value: String(available),        sub: "ready to book" },
    { id: "stat-in-use",       label: "IN USE",             value: String(inUse),            sub: "active sessions" },
    { id: "stat-maintenance",  label: "UNDER MAINTENANCE",  value: String(maintenance),      sub: "unavailable" },
  ];

  return (
    <div>
      <h1 style={s.title}>Resource Overview</h1>
      <p style={s.sub}>Utilization: {utilization}% · {resources.length} total assets</p>

      <div style={s.statsRow}>
        {STATS.map(stat => (
          <div key={stat.id} id={stat.id} style={s.statCard}>
            <span style={s.statValue}>{stat.value}</span>
            <span style={s.statLabel}>{stat.label}</span>
            <span style={s.statSub}>{stat.sub}</span>
          </div>
        ))}
      </div>

      {/* Recent resources */}
      <div style={s.card}>
        <div style={s.cardTitle}>Recent Assets</div>
        <table style={s.table}>
          <thead>
            <tr>
              {["Name", "Type", "Location", "Status"].map(h => (
                <th key={h} style={s.th}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {effectiveResources.slice(0, 8).map(r => (
              <tr key={r.id}>
                <td style={s.td}>{r.name}</td>
                <td style={s.td}>{r.type}</td>
                <td style={s.td}>{(r as any).metadata?.location || r.location || "Core Lab"}</td>
                <td style={s.td}>
                  <span style={{ ...s.badge, ...statusStyle(r.effectiveStatus) }}>{r.effectiveStatus.replace("_", " ")}</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function parseMaintDates(m: any) {
  if (!m) return null;
  const sRaw = m.startDate || "";
  const eRaw = m.endDate || "";
  if (!sRaw && !eRaw) return null;
  const cleanStart = sRaw.replace(/\s*\(\d{2}:\d{2}\)/, '').trim();
  const cleanEnd = eRaw.replace(/\s*\(\d{2}:\d{2}\)/, '').trim();
  let start = new Date(cleanStart);
  let end = new Date(cleanEnd);
  if (isNaN(start.getTime())) start = new Date(sRaw);
  if (isNaN(end.getTime())) end = new Date(eRaw);
  if (!isNaN(end.getTime()) && !cleanEnd.includes(":") && !eRaw.includes("T")) {
    end.setHours(23, 59, 59, 999);
  }
  return {
    start: !isNaN(start.getTime()) ? start : null,
    end: !isNaN(end.getTime()) ? end : null,
  };
}

function getEffectiveStatus(resource: Resource, maintenanceLogs: any[] = []): Resource["status"] {
  const now = new Date();
  const assetLogs = (maintenanceLogs || []).filter((m: any) => {
    const isIdMatch = m.resourceId && resource.id && String(m.resourceId) === String(resource.id);
    const isNameMatch = m.assetName && resource.name && String(m.assetName).trim().toLowerCase() === String(resource.name).trim().toLowerCase();
    return isIdMatch || isNameMatch;
  });

  // Check if ANY log is currently active
  const activeLog = assetLogs.find((m) => {
    const dates = parseMaintDates(m);
    if (!dates || !dates.end) return false;
    if (dates.start && dates.end) {
      return now >= dates.start && now <= dates.end;
    }
    return now <= dates.end;
  });

  if (activeLog) {
    return "MAINTENANCE";
  }

  // If DB statically says MAINTENANCE but no logs are currently active or upcoming, treat as AVAILABLE
  if (resource.status === "MAINTENANCE") {
    const hasActiveOrUpcoming = assetLogs.some((m) => {
      const dates = parseMaintDates(m);
      return dates?.end && now <= dates.end;
    });
    if (!hasActiveOrUpcoming) {
      return "AVAILABLE";
    }
  }

  return resource.status;
}

function statusStyle(status: string): React.CSSProperties {
  switch (status) {
    case "AVAILABLE":   return { background: "#e8f5e9", color: "#2e7d32" };
    case "IN_USE":      return { background: "#fff3e0", color: "#e65100" };
    case "MAINTENANCE": return { background: "#fce4ec", color: "#880e4f" };
    default:            return { background: "#f5f5f5", color: "#757575" };
  }
}

const s: Record<string, React.CSSProperties> = {
  title: { fontSize: 22, fontWeight: 700, color: "#161616", marginBottom: 4 },
  sub: { fontSize: 13, color: "#888", marginBottom: 24 },
  statsRow: { display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16, marginBottom: 24 },
  statCard: { background: "#fff", border: "1px solid #e8e8e8", borderRadius: 8, padding: "20px 24px", display: "flex", flexDirection: "column", gap: 4 },
  statValue: { fontSize: 32, fontWeight: 700, color: "#161616", lineHeight: 1 },
  statLabel: { fontSize: 10, fontWeight: 700, color: "#888", letterSpacing: "0.8px", marginTop: 6 },
  statSub: { fontSize: 12, color: "#aaa" },
  card: { background: "#fff", border: "1px solid #e8e8e8", borderRadius: 8, padding: 24 },
  cardTitle: { fontSize: 14, fontWeight: 600, color: "#161616", marginBottom: 16 },
  table: { width: "100%", borderCollapse: "collapse" },
  th: { textAlign: "left" as const, fontSize: 10, fontWeight: 700, color: "#888", letterSpacing: "0.6px", textTransform: "uppercase" as const, paddingBottom: 10, borderBottom: "1px solid #f0f0f0" },
  td: { fontSize: 13, color: "#424242", padding: "10px 0", borderBottom: "1px solid #f8f8f8" },
  badge: { fontSize: 10, fontWeight: 700, padding: "3px 8px", borderRadius: 4, letterSpacing: "0.4px" },
};
