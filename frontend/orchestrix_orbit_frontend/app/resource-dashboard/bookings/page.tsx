"use client";

import { useEffect, useState } from "react";
import {
  ResourcesService,
  type Resource,
  type Booking,
  type BookingStatus,
} from "@/lib/services/resources";

/*
 * This page shows ALL bookings across ALL resources.
 * The resource manager can approve or reject pending bookings.
 *
 * PATCH /api/resources/bookings/{bookingId}/status
 * Body: { status: "APPROVED" | "REJECTED" }
 */

export default function ResourceBookingsPage() {
  const [resources, setResources]   = useState<Resource[]>([]);
  const [bookings, setBookings]     = useState<Booking[]>([]);
  const [loading, setLoading]       = useState(true);
  const [error, setError]           = useState<string | null>(null);
  const [filter, setFilter]         = useState<"ALL" | BookingStatus>("ALL");
  const [updating, setUpdating]     = useState<string | null>(null);
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);

  useEffect(() => {
    async function load() {
      try {
        const resourceList = await ResourcesService.getAll();
        setResources(resourceList);

        // Fetch bookings for all resources in parallel
        const bookingResults = await Promise.all(
          resourceList.map(r =>
            ResourcesService.getBookings(r.id).catch(() => [] as Booking[])
          )
        );
        // Flat + deduplicate by id
        const allBookings = bookingResults.flat();
        const unique = allBookings.filter((b, i, arr) => arr.findIndex(x => x.id === b.id) === i);
        
        // Sort: PENDING_APPROVAL first, then by createdAt (newest first)
        unique.sort((a, b) => {
          const aPending = (a.status === "PENDING_APPROVAL" || a.status === "PENDING") ? 1 : 0;
          const bPending = (b.status === "PENDING_APPROVAL" || b.status === "PENDING") ? 1 : 0;
          if (aPending !== bPending) {
            return bPending - aPending; // 1 goes before 0
          }
          const timeA = new Date(a.createdAt || a.startTime).getTime();
          const timeB = new Date(b.createdAt || b.startTime).getTime();
          return timeB - timeA;
        });
        
        setBookings(unique);
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : "Failed to load bookings");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  /* ── Approve / Reject ───────────────────────────────────────────────── */
  async function updateStatus(bookingId: string, status: BookingStatus) {
    const action = status === "APPROVED" ? "approve" : "reject";
    if (!window.confirm(`Are you sure you want to ${action} this booking?`)) return;

    setUpdating(bookingId);
    try {
      const updated = await ResourcesService.updateBookingStatus(bookingId, status);
      setBookings(prev => prev.map(b => b.id === bookingId ? { ...b, status: updated.status } : b));
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Failed to update booking");
    } finally {
      setUpdating(null);
    }
  }

  if (loading) return <p style={{ padding: 40, color: "#888", fontSize: 14 }}>Loading bookings…</p>;
  if (error)   return <p style={{ padding: 24, color: "#c62828", fontSize: 14 }}>Error: {error}</p>;

  const pending   = bookings.filter(b => b.status === "PENDING" || b.status === "PENDING_APPROVAL").length;
  const visible   = filter === "ALL" ? bookings : bookings.filter(b => b.status === filter || (filter === "PENDING_APPROVAL" && b.status === "PENDING"));

  return (
    <div>
      <div style={s.header}>
        <div>
          <h1 style={s.title}>Booking Requests</h1>
          <p style={s.sub}>{bookings.length} total bookings · {pending} pending</p>
        </div>
      </div>

      {/* Filter */}
      <div style={s.filterRow}>
        {(["ALL", "PENDING_APPROVAL", "APPROVED", "REJECTED", "CANCELLED"] as const).map(f => {
          const count = f === "ALL" 
            ? bookings.length 
            : bookings.filter(b => b.status === f || (f === "PENDING_APPROVAL" && b.status === "PENDING")).length;
          
          return (
            <button key={f}
              style={filter === f ? s.filterOn : s.filterOff}
              onClick={() => setFilter(f)}>
              {f === "ALL" ? `All (${count})` : `${f.replace("_", " ")} (${count})`}
            </button>
          );
        })}
      </div>

      {/* Bookings list */}
      <div style={s.list}>
        {visible.length === 0 ? (
          <div style={s.empty}>No {filter === "ALL" ? "" : filter.toLowerCase() + " "}bookings found.</div>
        ) : visible.map(b => {
          const resource = resources.find(r => r.id === b.resourceId);
          return (
            <div 
              key={b.id} 
              id={`booking-card-${b.id}`} 
              style={s.card}
              onClick={() => setSelectedBooking(b)}
            >
              <div style={s.cardTop}>
                <div>
                  <div style={s.resourceName}>{b.resourceName}</div>
                  <div style={s.userId}>Requested by: {(b as any).userEmail || (b.userId ? `${b.userId.slice(0, 12)}…` : "Researcher")}</div>
                  {b.purpose && <div style={s.purpose}>{b.purpose}</div>}
                </div>
                <span style={{ ...s.badge, ...statusStyle(b.status) }}>{b.status}</span>
              </div>
              <div style={s.timeRow}>
                <span>⏰ {new Date(b.startTime).toLocaleString()}</span>
                <span>→</span>
                <span>{new Date(b.endTime).toLocaleString()}</span>
              </div>
              {resource && (
                <div style={s.resourceTag}>📍 {resource.location ?? resource.type}</div>
              )}
              {/* Actions — only for PENDING or PENDING_APPROVAL */}
              {(b.status === "PENDING" || b.status === "PENDING_APPROVAL") && (
                <div style={s.actions}>
                  <button
                    id={`btn-approve-${b.id}`}
                    style={{ ...s.approveBtn, opacity: updating === b.id ? 0.6 : 1 }}
                    disabled={updating === b.id}
                    onClick={(e) => {
                      e.stopPropagation();
                      updateStatus(b.id, "APPROVED");
                    }}
                  >
                    {updating === b.id ? "…" : "✓ Approve"}
                  </button>
                  <button
                    id={`btn-reject-${b.id}`}
                    style={{ ...s.rejectBtn, opacity: updating === b.id ? 0.6 : 1 }}
                    disabled={updating === b.id}
                    onClick={(e) => {
                      e.stopPropagation();
                      updateStatus(b.id, "REJECTED");
                    }}
                  >
                    {updating === b.id ? "…" : "✕ Reject"}
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* ── Booking Details Modal ─────────────────────────────────────────── */}
      {selectedBooking && (
        <div style={m.overlay} onClick={() => setSelectedBooking(null)}>
          <div style={m.modal} onClick={(e) => e.stopPropagation()}>
            <div style={m.header}>
              <h3 style={m.modalTitle}>Booking Details</h3>
              <button onClick={() => setSelectedBooking(null)} style={m.closeBtn}>✕</button>
            </div>
            <div style={m.body}>
              <div style={m.field}>
                <label style={m.label}>Booking ID</label>
                <div style={m.value}><code style={{background:"#f5f5f5", padding:"2px 6px", borderRadius:4}}>{selectedBooking.id}</code></div>
              </div>
              <div style={m.field}>
                <label style={m.label}>Resource</label>
                <div style={m.value}>{selectedBooking.resourceName} (ID: {selectedBooking.resourceId})</div>
              </div>
              <div style={m.field}>
                <label style={m.label}>Requested By (User ID)</label>
                <div style={m.value}>{(selectedBooking as any).userEmail || selectedBooking.userId}</div>
              </div>
              <div style={m.field}>
                <label style={m.label}>Project</label>
                <div style={m.value}>
                  {selectedBooking.projectName || selectedBooking.projectId || "No Project"}
                  {selectedBooking.projectId && <span style={{fontSize:11, color:"#888", marginLeft:6}}>(ID: {selectedBooking.projectId})</span>}
                </div>
              </div>
              <div style={m.field}>
                <label style={m.label}>Status</label>
                <div style={m.value}>
                  <span style={{ ...s.badge, ...statusStyle(selectedBooking.status), display: "inline-block", marginTop: 2 }}>
                    {selectedBooking.status}
                  </span>
                </div>
              </div>
              <div style={m.field}>
                <label style={m.label}>Schedule</label>
                <div style={m.value}>
                  {new Date(selectedBooking.startTime).toLocaleString()} → {new Date(selectedBooking.endTime).toLocaleString()}
                </div>
              </div>
              <div style={m.field}>
                <label style={m.label}>Created At</label>
                <div style={m.value}>{new Date(selectedBooking.createdAt || selectedBooking.startTime).toLocaleString()}</div>
              </div>
              <div style={m.field}>
                <label style={m.label}>Purpose</label>
                <div style={m.value}>{selectedBooking.purpose || "No purpose provided."}</div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function statusStyle(status: string): React.CSSProperties {
  switch (status) {
    case "APPROVED":   return { background: "#e8f5e9", color: "#2e7d32" };
    case "PENDING":
    case "PENDING_APPROVAL": return { background: "#fff8e1", color: "#f57f17" };
    case "REJECTED":   return { background: "#fde8e8", color: "#c62828" };
    case "CANCELLED":  return { background: "#f5f5f5", color: "#757575" };
    default:           return { background: "#f5f5f5", color: "#757575" };
  }
}

const s: Record<string, React.CSSProperties> = {
  header: { display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 20 },
  title: { fontSize: 22, fontWeight: 700, color: "#161616", marginBottom: 4 },
  sub: { fontSize: 13, color: "#888888" },
  filterRow: { display: "flex", gap: 6, marginBottom: 20, flexWrap: "wrap" as const },
  filterOn: { padding: "6px 14px", fontSize: 12, fontWeight: 700, color: "#fff", background: "#161616", border: "none", borderRadius: 5, cursor: "pointer" },
  filterOff: { padding: "6px 14px", fontSize: 12, fontWeight: 500, color: "#888", background: "#f0f0f0", border: "none", borderRadius: 5, cursor: "pointer" },
  list: { display: "flex", flexDirection: "column", gap: 12 },
  card: { background: "#fff", border: "1px solid #e8e8e8", borderRadius: 8, padding: 18, cursor: "pointer", transition: "transform 0.1s ease, box-shadow 0.1s ease" },
  cardTop: { display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 10 },
  resourceName: { fontSize: 15, fontWeight: 600, color: "#161616", marginBottom: 2 },
  userId: { fontSize: 12, color: "#888", marginBottom: 2 },
  purpose: { fontSize: 12, color: "#616161", fontStyle: "italic" },
  badge: { fontSize: 11, fontWeight: 700, padding: "4px 10px", borderRadius: 5, letterSpacing: "0.4px", whiteSpace: "nowrap" as const },
  timeRow: { display: "flex", gap: 8, fontSize: 12, color: "#424242", marginBottom: 6 },
  resourceTag: { fontSize: 12, color: "#888", marginBottom: 10 },
  actions: { display: "flex", gap: 8, marginTop: 4 },
  approveBtn: { padding: "7px 14px", fontSize: 12, fontWeight: 700, color: "#fff", background: "#2e7d32", border: "none", borderRadius: 5, cursor: "pointer" },
  rejectBtn: { padding: "7px 14px", fontSize: 12, fontWeight: 700, color: "#fff", background: "#c62828", border: "none", borderRadius: 5, cursor: "pointer" },
  empty: { padding: "40px 20px", textAlign: "center" as const, color: "#888", fontSize: 13 },
};

const m: Record<string, React.CSSProperties> = {
  overlay: { position: "fixed", top: 0, left: 0, right: 0, bottom: 0, background: "rgba(0,0,0,0.5)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center" },
  modal: { background: "#fff", width: 500, maxWidth: "90%", borderRadius: 8, overflow: "hidden", boxShadow: "0 4px 12px rgba(0,0,0,0.15)" },
  header: { display: "flex", justifyContent: "space-between", alignItems: "center", padding: "16px 20px", borderBottom: "1px solid #eee", background: "#fcfcfc" },
  modalTitle: { margin: 0, fontSize: 16, fontWeight: 700, color: "#161616" },
  closeBtn: { background: "transparent", border: "none", fontSize: 16, cursor: "pointer", color: "#888" },
  body: { padding: "20px", display: "flex", flexDirection: "column", gap: 14 },
  field: { display: "flex", flexDirection: "column", gap: 4 },
  label: { fontSize: 11, fontWeight: 700, color: "#9e9e9e", letterSpacing: "0.5px", textTransform: "uppercase" },
  value: { fontSize: 13, color: "#161616", fontWeight: 500, wordBreak: "break-word" },
};
