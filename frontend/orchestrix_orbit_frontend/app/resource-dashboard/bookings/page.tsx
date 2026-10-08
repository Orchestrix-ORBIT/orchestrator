"use client";

import { useEffect, useState } from "react";
import {
  ResourcesService,
  type Resource,
  type Booking,
  type BookingStatus,
} from "@/lib/services/resources";
import LoadingState from "@/components/ui/LoadingState";

export default function ResourceBookingsPage() {
  const [resources, setResources]   = useState<Resource[]>([]);
  const [bookings, setBookings]     = useState<Booking[]>([]);
  const [loading, setLoading]       = useState(true);
  const [error, setError]           = useState<string | null>(null);
  const [filter, setFilter]         = useState<"ALL" | BookingStatus>("ALL");
  const [updating, setUpdating]     = useState<string | null>(null);
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
  const [confirmModal, setConfirmModal] = useState<{ id: string, status: BookingStatus } | null>(null);
  const [reasonText, setReasonText] = useState("");

  useEffect(() => {
    async function load() {
      try {
        const resourceList = await ResourcesService.getAll();
        setResources(resourceList);

        const bookingResults = await Promise.all(
          resourceList.map(r =>
            ResourcesService.getBookings(r.id).catch(() => [] as Booking[])
          )
        );
        const allBookings = bookingResults.flat();
        const unique = allBookings.filter((b, i, arr) => arr.findIndex(x => x.id === b.id) === i);
        
        const now = Date.now();
        unique.sort((a, b) => {
          const getScore = (booking: Booking) => {
            const isPending = booking.status === "PENDING" || booking.status === "PENDING_APPROVAL";
            const start = new Date(booking.startTime).getTime();
            const end = new Date(booking.endTime).getTime();
            
            if (isPending) return 100;
            if (booking.status === "APPROVED") {
              if (start <= now && end >= now) return 90; // Active
              if (start > now) return 80; // Upcoming
            }
            return 0; // Past, Cancelled, Rejected
          };

          const scoreA = getScore(a);
          const scoreB = getScore(b);
          if (scoreA !== scoreB) return scoreB - scoreA;

          const startA = new Date(a.startTime).getTime();
          const startB = new Date(b.startTime).getTime();
          const endA = new Date(a.endTime).getTime();
          const endB = new Date(b.endTime).getTime();
          
          if (scoreA === 100 || scoreA === 80) {
            return startA - startB; // Pending/Upcoming: soonest first
          } else if (scoreA === 90) {
            return endA - endB; // Active: soonest to finish first
          } else {
            return endB - endA; // Past: most recently finished first
          }
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

  function initiateUpdateStatus(bookingId: string, status: BookingStatus) {
    setConfirmModal({ id: bookingId, status });
    setReasonText("");
  }

  async function handleConfirmAction() {
    if (!confirmModal) return;
    const { id, status } = confirmModal;

    if (status === "CANCELLED" && !reasonText.trim()) {
      alert("A cancellation reason is required.");
      return;
    }

    setUpdating(id);
    setConfirmModal(null);
    try {
      const updated = await ResourcesService.updateBookingStatus(id, status, reasonText.trim() || undefined);
      setBookings(prev => prev.map(b => b.id === id ? { ...b, status: updated.status } : b));
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Failed to update booking");
    } finally {
      setUpdating(null);
    }
  }

  if (loading) return <LoadingState variant="manager-bookings" />;
  if (error)   return <p style={{ padding: 24, color: "#c62828", fontSize: 14 }}>Error: {error}</p>;

  const pendingCount = bookings.filter(b => b.status === "PENDING" || b.status === "PENDING_APPROVAL").length;
  const approvedCount = bookings.filter(b => b.status === "APPROVED").length;
  
  const visible = filter === "ALL" 
    ? bookings 
    : bookings.filter(b => b.status === filter || (filter === "PENDING_APPROVAL" && b.status === "PENDING"));

  return (
    <>
      <style>{`
        .table-row { transition: all 0.2s ease; cursor: pointer; border-bottom: 1px solid rgba(0,0,0,0.04); }
        .table-row:hover { background: #f8fafc; }
        .table-row:last-child { border-bottom: none; }
        .filter-btn { padding: 8px 16px; font-size: 13px; font-weight: 600; border-radius: 8px; cursor: pointer; transition: all 0.2s; border: none; }
        .filter-btn.active { background: #0f172a; color: white; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1); }
        .filter-btn.inactive { background: transparent; color: #64748b; }
        .filter-btn.inactive:hover { background: #f1f5f9; color: #334155; }
        .action-btn { padding: 6px 12px; font-size: 12px; font-weight: 600; border-radius: 6px; cursor: pointer; transition: all 0.2s; display: inline-flex; align-items: center; justify-content: center; gap: 4px; }
        .action-btn:disabled { opacity: 0.5; cursor: not-allowed; }
        .btn-approve { background: #ecfdf5; color: #059669; border: 1px solid #a7f3d0; }
        .btn-approve:hover:not(:disabled) { background: #d1fae5; }
        .btn-reject:hover:not(:disabled) { background: #ffe4e6; }
        .btn-cancel { background: #f8fafc; color: #64748b; border: 1px solid #e2e8f0; }
        .btn-cancel:hover:not(:disabled) { background: #f1f5f9; color: #475569; }
        .bento-hover { transition: transform 0.2s cubic-bezier(0.4, 0, 0.2, 1), box-shadow 0.2s cubic-bezier(0.4, 0, 0.2, 1); cursor: default; }
        .bento-hover:hover { transform: translateY(-4px); box-shadow: 0 12px 20px -8px rgba(0,0,0,0.08), 0 4px 6px -4px rgba(0,0,0,0.04); border-color: rgba(0,0,0,0.1); }
        .table-card-hover { transition: box-shadow 0.2s ease, border-color 0.2s ease; }
        .table-card-hover:hover { box-shadow: 0 10px 15px -3px rgba(0,0,0,0.05), 0 4px 6px -4px rgba(0,0,0,0.03); border-color: rgba(0,0,0,0.08); }
      `}</style>
      
      <div style={{ display: "flex", flexDirection: "column", gap: 24, padding: "8px 0 32px 0" }}>
        
        {/* Header */}
        <div>
          <h1 style={{ fontSize: 28, fontWeight: 800, color: "#0f172a", margin: "0 0 8px 0", letterSpacing: "-0.5px" }}>Bookings & Approvals</h1>
          <p style={{ fontSize: 15, color: "#64748b", margin: 0 }}>Manage access requests, resolve conflicts, and oversee active reservations.</p>
        </div>

        {/* Bento Stats Row */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 20 }}>
          <div style={s.bentoCard} className="bento-hover">
            <div style={s.bentoTitle}>TOTAL BOOKINGS</div>
            <div style={s.bentoValue}>{bookings.length}</div>
            <div style={s.bentoSub}>Lifetime platform requests</div>
          </div>
          <div style={s.bentoCard} className="bento-hover">
            <div style={s.bentoTitle}>PENDING APPROVALS</div>
            <div style={{...s.bentoValue, color: pendingCount > 0 ? "#f59e0b" : "#0f172a"}}>{pendingCount}</div>
            <div style={s.bentoSub}>{pendingCount > 0 ? "Requires your immediate attention" : "All caught up"}</div>
          </div>
          <div style={s.bentoCard} className="bento-hover">
            <div style={s.bentoTitle}>APPROVED & ACTIVE</div>
            <div style={s.bentoValue}>{approvedCount}</div>
            <div style={s.bentoSub}>Currently scheduled sessions</div>
          </div>
        </div>

        {/* Main List Container */}
        <div className="table-card-hover" style={{ background: "#fff", borderRadius: 16, border: "1px solid rgba(0,0,0,0.06)", boxShadow: "0 4px 6px -1px rgba(0,0,0,0.02), 0 2px 4px -2px rgba(0,0,0,0.02)", overflow: "hidden" }}>
          
          {/* Table Header & Filters */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "20px 24px", borderBottom: "1px solid rgba(0,0,0,0.06)", background: "#fcfcfd" }}>
            <h2 style={{ fontSize: 13, fontWeight: 700, color: "#475569", letterSpacing: "0.5px", margin: 0, textTransform: "uppercase" }}>
              Booking Registry
            </h2>
            <div style={{ display: "flex", gap: 4, background: "#f8fafc", padding: 4, borderRadius: 10, border: "1px solid rgba(0,0,0,0.04)" }}>
              {(["ALL", "PENDING_APPROVAL", "APPROVED", "CANCELLED", "REJECTED"] as const).map(f => {
                const label = f === "PENDING_APPROVAL" ? "PENDING" : f;
                return (
                  <button key={f}
                    className={`filter-btn ${filter === f ? "active" : "inactive"}`}
                    onClick={() => setFilter(f)}>
                    {label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Table */}
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left" }}>
              <thead>
                <tr>
                  <th style={s.th}>Resource & Purpose</th>
                  <th style={s.th}>Requested By</th>
                  <th style={s.th}>Schedule</th>
                  <th style={s.th}>Status</th>
                  <th style={s.th}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {visible.length === 0 ? (
                  <tr>
                    <td colSpan={5} style={{ padding: "48px 24px", textAlign: "center", color: "#94a3b8", fontSize: 14 }}>
                      No {filter === "ALL" ? "" : filter.replace("_", " ").toLowerCase()} bookings found.
                    </td>
                  </tr>
                ) : visible.map(b => {
                  const resource = resources.find(r => r.id === b.resourceId);
                  const isPending = b.status === "PENDING" || b.status === "PENDING_APPROVAL";
                  const isFutureOrActive = new Date(b.endTime) > new Date();
                  const isCompleted = b.status === "APPROVED" && !isFutureOrActive;
                  const displayStatus = isCompleted ? "COMPLETED" : (b.status === "PENDING_APPROVAL" ? "PENDING" : b.status);
                  const canCancel = isPending || (b.status === "APPROVED" && isFutureOrActive);
                  
                  return (
                    <tr key={b.id} className="table-row" onClick={() => setSelectedBooking(b)}>
                      <td style={s.td}>
                        <div style={{ fontWeight: 600, color: "#0f172a", fontSize: 14, marginBottom: 4 }}>{b.resourceName}</div>
                        <div style={{ fontSize: 12, color: "#64748b", display: "flex", gap: 8, alignItems: "center" }}>
                          {resource && <span style={{ background: "#f1f5f9", padding: "2px 6px", borderRadius: 4, fontWeight: 500 }}>{resource.type}</span>}
                          {b.purpose ? <span style={{ fontStyle: "italic", maxWidth: 200, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>"{b.purpose}"</span> : "No purpose"}
                        </div>
                      </td>
                      <td style={s.td}>
                        <div style={{ fontWeight: 500, color: "#334155", fontSize: 13 }}>
                          {(b as any).userEmail || (b.userId ? `${b.userId.slice(0, 16)}…` : "Researcher")}
                        </div>
                      </td>
                      <td style={s.td}>
                        <div style={{ fontSize: 13, color: "#0f172a", fontWeight: 500, marginBottom: 2 }}>{new Date(b.startTime).toLocaleDateString()}</div>
                        <div style={{ fontSize: 12, color: "#64748b" }}>
                          {new Date(b.startTime).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})} - {new Date(b.endTime).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                        </div>
                      </td>
                      <td style={s.td}>
                        <span style={{ ...s.badge, ...statusStyle(displayStatus) }}>
                          {displayStatus}
                        </span>
                      </td>
                      <td style={s.td} onClick={e => e.stopPropagation()}>
                        <div style={{ display: "flex", gap: 8 }}>
                          {canCancel && (
                            <button className="action-btn btn-cancel" disabled={updating === b.id} onClick={() => initiateUpdateStatus(b.id, "CANCELLED")}>
                              Cancel / Override
                            </button>
                          )}
                          {!canCancel && (
                            <span style={{ fontSize: 12, color: "#cbd5e1" }}>—</span>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* ── Booking Details Modal ─────────────────────────────────────────── */}
      {selectedBooking && (
        <div style={m.overlay} onClick={() => setSelectedBooking(null)}>
          <div style={m.modal} onClick={(e) => e.stopPropagation()}>
            <div style={m.header}>
              <h3 style={m.modalTitle}>Booking Details</h3>
              <button onClick={() => setSelectedBooking(null)} style={m.closeBtn}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
              </button>
            </div>
            <div style={m.body}>
              <div style={m.field}>
                <label style={m.label}>Resource</label>
                <div style={m.value}>{selectedBooking.resourceName} <span style={{color:"#94a3b8", fontSize:12}}>(ID: {selectedBooking.resourceId})</span></div>
              </div>
              <div style={m.field}>
                <label style={m.label}>Requested By</label>
                <div style={m.value}>{(selectedBooking as any).userEmail || selectedBooking.userId}</div>
              </div>
              <div style={m.field}>
                <label style={m.label}>Status</label>
                <div style={m.value}>
                  <span style={{ ...s.badge, ...statusStyle(selectedBooking.status) }}>
                    {selectedBooking.status === "PENDING_APPROVAL" ? "PENDING" : selectedBooking.status}
                  </span>
                </div>
              </div>
              <div style={m.field}>
                <label style={m.label}>Schedule</label>
                <div style={m.value}>
                  {new Date(selectedBooking.startTime).toLocaleString()} <span style={{color:"#94a3b8"}}>→</span> {new Date(selectedBooking.endTime).toLocaleString()}
                </div>
              </div>
              <div style={m.field}>
                <label style={m.label}>Purpose</label>
                <div style={{ ...m.value, background: "#f8fafc", padding: 12, borderRadius: 8, fontSize: 13, color: "#334155", border: "1px solid #e2e8f0" }}>
                  {selectedBooking.purpose || <span style={{fontStyle:"italic", color:"#94a3b8"}}>No purpose provided.</span>}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Action Confirmation Modal ───────────────────────────────────────── */}
      {confirmModal && (
        <div style={m.overlay} onClick={() => setConfirmModal(null)}>
          <div style={{...m.modal, width: 440}} onClick={(e) => e.stopPropagation()}>
            <div style={m.header}>
              <h3 style={m.modalTitle}>Cancel Booking</h3>
              <button onClick={() => setConfirmModal(null)} style={m.closeBtn}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
              </button>
            </div>
            <div style={{ padding: "24px 32px 32px" }}>
              <p style={{ fontSize: 14, color: "#475569", margin: "0 0 20px 0", lineHeight: 1.5 }}>
                You are about to cancel this booking. Please provide a brief reason so the requester knows why their session was revoked.
              </p>
              
              <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 24 }}>
                <label style={{ fontSize: 12, fontWeight: 700, color: "#0f172a" }}>Cancellation Reason <span style={{color: "#e11d48"}}>*</span></label>
                <textarea 
                  autoFocus
                  placeholder="e.g. Emergency cluster maintenance required..."
                  value={reasonText}
                  onChange={(e) => setReasonText(e.target.value)}
                  style={{ width: "100%", padding: 12, borderRadius: 8, border: "1px solid #cbd5e1", fontSize: 14, minHeight: 80, resize: "none", outline: "none", boxSizing: "border-box", transition: "border-color 0.2s" }}
                  onFocus={(e) => e.currentTarget.style.borderColor = "#3b82f6"}
                  onBlur={(e) => e.currentTarget.style.borderColor = "#cbd5e1"}
                />
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end", gap: 12 }}>
                <button 
                  onClick={() => setConfirmModal(null)}
                  style={{ padding: "10px 16px", background: "#f8fafc", color: "#475569", border: "1px solid #e2e8f0", borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: "pointer", transition: "all 0.2s" }}
                  onMouseOver={(e) => e.currentTarget.style.background = "#f1f5f9"}
                  onMouseOut={(e) => e.currentTarget.style.background = "#f8fafc"}
                >
                  Keep Booking
                </button>
                <button 
                  onClick={handleConfirmAction}
                  disabled={!reasonText.trim()}
                  style={{ padding: "10px 16px", background: "#e11d48", color: "#fff", border: "none", borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: !reasonText.trim() ? "not-allowed" : "pointer", opacity: !reasonText.trim() ? 0.5 : 1, transition: "all 0.2s", display: "flex", alignItems: "center", gap: 6 }}
                  onMouseOver={(e) => { if (reasonText.trim()) e.currentTarget.style.background = "#be123c"; }}
                  onMouseOut={(e) => { if (reasonText.trim()) e.currentTarget.style.background = "#e11d48"; }}
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><circle cx="12" cy="12" r="10"></circle><line x1="15" y1="9" x2="9" y2="15"></line><line x1="9" y1="9" x2="15" y2="15"></line></svg>
                  Revoke Booking
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function statusStyle(status: string): React.CSSProperties {
  switch (status) {
    case "APPROVED":   return { background: "#ecfdf5", color: "#059669", border: "1px solid #a7f3d0" };
    case "PENDING":
    case "PENDING_APPROVAL": return { background: "#fffbeb", color: "#d97706", border: "1px solid #fde68a" };
    case "REJECTED":   return { background: "#fef2f2", color: "#e11d48", border: "1px solid #fecdd3" };
    case "CANCELLED":  return { background: "#f8fafc", color: "#64748b", border: "1px solid #e2e8f0" };
    case "COMPLETED":  return { background: "#f1f5f9", color: "#475569", border: "1px solid #cbd5e1" };
    default:           return { background: "#f8fafc", color: "#64748b", border: "1px solid #e2e8f0" };
  }
}

const s: Record<string, React.CSSProperties> = {
  bentoCard: { background: "#fff", padding: "24px", borderRadius: 16, border: "1px solid rgba(0,0,0,0.06)", boxShadow: "0 4px 6px -1px rgba(0,0,0,0.02)" },
  bentoTitle: { fontSize: 11, fontWeight: 700, color: "#64748b", letterSpacing: "0.5px", textTransform: "uppercase", marginBottom: 12 },
  bentoValue: { fontSize: 36, fontWeight: 800, color: "#0f172a", marginBottom: 4, letterSpacing: "-1px", lineHeight: 1 },
  bentoSub: { fontSize: 13, color: "#94a3b8", fontWeight: 500 },
  
  th: { padding: "16px 24px", fontSize: 11, fontWeight: 700, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.5px", borderBottom: "1px solid rgba(0,0,0,0.06)" },
  td: { padding: "16px 24px", verticalAlign: "middle" },
  
  badge: { fontSize: 11, fontWeight: 700, padding: "4px 10px", borderRadius: 999, letterSpacing: "0.4px", whiteSpace: "nowrap" as const, display: "inline-block" },
};

const m: Record<string, React.CSSProperties> = {
  overlay: { position: "fixed", top: 0, left: 0, right: 0, bottom: 0, background: "rgba(15, 23, 42, 0.4)", backdropFilter: "blur(6px)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", animation: "modalFadeIn 0.15s ease-out" },
  modal: { background: "#fff", width: 540, maxWidth: "90%", borderRadius: 24, overflow: "hidden", boxShadow: "0 25px 50px -12px rgba(0,0,0,0.25)", animation: "modalSlideUp 0.25s cubic-bezier(0.16, 1, 0.3, 1)" },
  header: { display: "flex", justifyContent: "space-between", alignItems: "center", padding: "24px 32px 20px", borderBottom: "1px solid #f1f5f9" },
  modalTitle: { margin: 0, fontSize: 18, fontWeight: 700, color: "#0f172a" },
  closeBtn: { background: "transparent", border: "none", cursor: "pointer", color: "#94a3b8", padding: 8, margin: -8, borderRadius: "50%", transition: "all 0.2s", display: "flex" },
  body: { padding: "24px 32px 32px", display: "flex", flexDirection: "column", gap: 20 },
  field: { display: "flex", flexDirection: "column", gap: 6 },
  label: { fontSize: 11, fontWeight: 700, color: "#64748b", letterSpacing: "0.5px", textTransform: "uppercase" },
  value: { fontSize: 14, color: "#0f172a", fontWeight: 500, wordBreak: "break-word" },
};
