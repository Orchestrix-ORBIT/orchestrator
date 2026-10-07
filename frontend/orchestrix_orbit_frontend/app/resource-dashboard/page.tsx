"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ResourcesService, type Resource, type Booking } from "@/lib/services/resources";
import LoadingState from "@/components/ui/LoadingState";

export default function ResourceDashboardPage() {
  const [resources, setResources] = useState<Resource[]>([]);
  const [maintenanceLogs, setMaintenanceLogs] = useState<any[]>([]);
  const [allBookings, setAllBookings] = useState<Booking[]>([]);
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState<string | null>(null);

  useEffect(() => {
    Promise.all([
      ResourcesService.getAll().catch(() => []),
      ResourcesService.getMaintenance().catch(() => []),
    ])
      .then(async ([resList, maintList]) => {
        setResources(resList);
        setMaintenanceLogs(maintList || []);
        
        const nestedBookings = await Promise.all(
          resList.map((r: Resource) => ResourcesService.getBookings(r.id).catch(() => []))
        );
        setAllBookings(nestedBookings.flat().map(normalizeBooking));
      })
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <LoadingState variant="manager-overview" />;
  if (error)   return <p style={{ padding: 24, color: "#c62828", fontSize: 14 }}>Error: {error}</p>;

  const effectiveResources = resources.map(r => ({
    ...r,
    effectiveStatus: getEffectiveStatus(r, maintenanceLogs, allBookings),
  }));

  const available    = effectiveResources.filter(r => r.effectiveStatus === "AVAILABLE").length;
  const inUse        = effectiveResources.filter(r => r.effectiveStatus === "IN_USE").length;
  const maintenance  = effectiveResources.filter(r => r.effectiveStatus === "MAINTENANCE").length;
  const utilization  = resources.length ? Math.round((inUse / resources.length) * 100) : 0;

  const STATS = [
    { id: "stat-total",        label: "Total Assets",       value: String(resources.length), sub: "registered" },
    { id: "stat-available",    label: "Available Now",      value: String(available),        sub: "ready to book" },
    { id: "stat-in-use",       label: "In Use",             value: String(inUse),            sub: "active sessions" },
    { id: "stat-maintenance",  label: "Under Maintenance",  value: String(maintenance),      sub: "unavailable" },
  ];

  return (
    <div>
      {/* ── Organization Header Banner ───────────────────────────────────────── */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: 16 }}>
        <div>
          <h1 style={{ fontSize: 26, fontWeight: 700, color: "#111827", letterSpacing: "-0.025em", margin: 0, marginBottom: 4 }}>
            Resource Overview
          </h1>
        </div>
      </div>

      {/* Stats - Bento Grid Style */}
      <div style={s.statsRow}>
        {STATS.map(stat => (
          <div key={stat.id} id={stat.id} style={s.statCard} className="stat-card-hover">
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16 }}>
              <span style={s.statLabel}>{stat.label}</span>
            </div>
            <div style={{ display: "flex", alignItems: "baseline", gap: 12 }}>
              <span style={s.statValue}>{stat.value}</span>
            </div>
            <span style={s.statSub}>{stat.sub}</span>
          </div>
        ))}
      </div>

      {/* Recent resources */}
      <div style={s.card}>
        <div style={s.cardHead}>
          <div>
            <h2 style={s.cardTitle}>Recent Assets</h2>
            <p style={{ margin: 0, fontSize: 13, color: "#6b7280", marginTop: 4 }}>Latest resources added to your facilities.</p>
          </div>
          <Link href="/resource-dashboard/assets" style={s.cardLink} className="btn-shiny">View catalog →</Link>
        </div>
        <div style={s.tableWrapper}>
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
                <tr key={r.id} className="table-row-hover">
                  <td style={s.td}>
                    <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                      <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#10b981" }} />
                      <span style={{ fontWeight: 600, color: "#111827" }}>
                        {r.name}
                      </span>
                    </div>
                  </td>
                  <td style={s.td}>
                    <span style={{ color: "#4b5563" }}>{r.type}</span>
                  </td>
                  <td style={s.td}>
                    <span style={{ color: "#4b5563" }}>{(r as any).metadata?.location || r.location || "Core Lab"}</span>
                  </td>
                  <td style={s.td}>
                    <span style={{ ...s.badge, ...statusStyle(r.effectiveStatus) }}>{r.effectiveStatus.replace("_", " ")}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
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

function normalizeBooking(b: any): any {
  if (!b || !b.startTime) return b;
  const startObj = new Date(b.startTime);
  if (isNaN(startObj.getTime())) return b;

  const tzOffsetMinutes = new Date().getTimezoneOffset();
  if (tzOffsetMinutes === 0) return b;

  const tzOffsetMs = tzOffsetMinutes * 60 * 1000;
  const startMs = startObj.getTime();
  const createdMs = b.createdAt ? new Date(b.createdAt).getTime() : null;

  const isShiftedFromCreated = createdMs !== null && Math.abs((startMs - createdMs) - (-tzOffsetMs)) < 30 * 60 * 1000;
  const isShiftedFromNow = Math.abs((startMs - Date.now()) - (-tzOffsetMs)) < 3 * 3600 * 1000;

  if (isShiftedFromCreated || isShiftedFromNow) {
    const fixedStart = new Date(startMs + tzOffsetMs).toISOString();
    const durMs = b.endTime ? (new Date(b.endTime).getTime() - startMs) : 3 * 3600 * 1000;
    const fixedEnd = new Date(new Date(fixedStart).getTime() + durMs).toISOString();
    return {
      ...b,
      startTime: fixedStart,
      endTime: fixedEnd,
    };
  }

  return b;
}

function getEffectiveStatus(resource: Resource, maintenanceLogs: any[] = [], bookings: Booking[] = []): Resource["status"] {
  const now = new Date();
  
  // 1. Maintenance has highest priority
  const assetLogs = (maintenanceLogs || []).filter((m: any) => {
    const isIdMatch = m.resourceId && resource.id && String(m.resourceId) === String(resource.id);
    const isNameMatch = m.assetName && resource.name && String(m.assetName).trim().toLowerCase() === String(resource.name).trim().toLowerCase();
    return isIdMatch || isNameMatch;
  });

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

  // 2. Check active bookings for IN_USE (Sync with Lead Dashboard logic)
  const resBookings = (bookings || []).filter((b) => {
    const isIdMatch = String(b.resourceId) === String(resource.id);
    const isNameMatch = b.resourceName && resource.name && String(b.resourceName).trim().toLowerCase() === String(resource.name).trim().toLowerCase();
    return (isIdMatch || isNameMatch) && b.status !== "CANCELLED" && b.status !== "REJECTED";
  });

  const activeBooking = resBookings.find((b) => {
    const start = new Date(b.startTime);
    const end = new Date(b.endTime);
    // Treat as active if currently between start and end, or starting in the next 5 minutes
    const isStartedOrImminent = (now >= start || (start.getTime() - now.getTime() <= 5 * 60 * 1000));
    return isStartedOrImminent && now <= end;
  });

  if (activeBooking) {
    return "IN_USE";
  }

  // 3. Fallback if DB statically says MAINTENANCE or IN_USE but actual logs/bookings are empty
  if (resource.status === "MAINTENANCE" || resource.status === "IN_USE") {
    return "AVAILABLE";
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
  statsRow: { display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 24, marginBottom: 32 },
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
  statValue: { fontSize: 36, fontWeight: 700, color: "#111827", lineHeight: 1, letterSpacing: "-0.04em", marginBottom: 8 },
  statLabel: { fontSize: 13, fontWeight: 600, color: "#4b5563" },
  statSub: { fontSize: 12, color: "#9ca3af", fontWeight: 500 },
  card: { 
    background: "#ffffff", 
    borderRadius: 16, 
    border: "1px solid rgba(0,0,0,0.06)",
    boxShadow: "0 1px 3px rgba(0,0,0,0.02)",
    overflow: "hidden",
  },
  cardHead: { display: "flex", justifyContent: "space-between", alignItems: "flex-start", padding: "24px 24px 20px" },
  cardTitle: { fontSize: 18, fontWeight: 600, color: "#111827", margin: 0, letterSpacing: "-0.01em" },
  cardLink: {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    background: "#ffffff",
    border: "1px solid #d1d5db",
    borderRadius: 8,
    padding: "8px 16px",
    fontSize: 13,
    fontWeight: 600,
    color: "#374151",
    cursor: "pointer",
    textDecoration: "none",
  },
  tableWrapper: { width: "100%", overflowX: "auto" },
  table: { width: "100%", borderCollapse: "collapse", minWidth: 800 },
  th: { 
    textAlign: "left", 
    fontSize: 11, 
    fontWeight: 600, 
    color: "#6b7280", 
    textTransform: "uppercase", 
    letterSpacing: "0.05em",
    padding: "16px 24px",
    borderBottom: "1px solid #f3f4f6",
    background: "#f9fafb"
  },
  td: { 
    fontSize: 13, 
    color: "#111827", 
    padding: "16px 24px", 
    borderBottom: "1px solid #f3f4f6",
    verticalAlign: "middle"
  },
  badge: { 
    display: "inline-flex",
    alignItems: "center",
    fontSize: 11, 
    fontWeight: 600, 
    padding: "4px 10px", 
    borderRadius: 9999, 
    letterSpacing: "0.02em" 
  },
};
