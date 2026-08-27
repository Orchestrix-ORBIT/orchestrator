"use client";

import { useEffect, useState } from "react";
import { ResourcesService, type Resource } from "@/lib/services/resources";

export default function ResourceDashboardPage() {
  const [resources, setResources] = useState<Resource[]>([]);
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState<string | null>(null);

  useEffect(() => {
    ResourcesService.getAll()
      .then(setResources)
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <p style={{ padding: 40, color: "#888", fontSize: 14 }}>Loading…</p>;
  if (error)   return <p style={{ padding: 24, color: "#c62828", fontSize: 14 }}>Error: {error}</p>;

  const available    = resources.filter(r => r.status === "AVAILABLE").length;
  const inUse        = resources.filter(r => r.status === "IN_USE").length;
  const maintenance  = resources.filter(r => r.status === "MAINTENANCE").length;
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
            {resources.slice(0, 8).map(r => (
              <tr key={r.id}>
                <td style={s.td}>{r.name}</td>
                <td style={s.td}>{r.type}</td>
                <td style={s.td}>{r.location ?? "—"}</td>
                <td style={s.td}>
                  <span style={{ ...s.badge, ...statusStyle(r.status) }}>{r.status.replace("_", " ")}</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
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
