"use client";

import { useEffect, useState } from "react";
import {
  ResourcesService,
  type Resource,
  type Booking,
  type BookingStatus,
  type CreateBookingBody,
} from "@/lib/services/resources";
import { ProjectsService, type Project } from "@/lib/services/projects";

type ActiveTab = "Browse Resources" | "My Bookings";

export default function ResearcherResourcesPage() {
  const [resources, setResources]     = useState<Resource[]>([]);
  const [myBookings, setMyBookings]   = useState<Booking[]>([]);
  const [projects, setProjects]       = useState<Project[]>([]);
  const [activeTab, setActiveTab]     = useState<ActiveTab>("Browse Resources");
  const [loading, setLoading]         = useState(true);
  const [error, setError]             = useState<string | null>(null);

  // Booking modal
  const [showBookingModal, setShowBookingModal]   = useState(false);
  const [bookingResource, setBookingResource]     = useState<Resource | null>(null);
  const [bookingProjectId, setBookingProjectId]   = useState("");
  const [bookingStart, setBookingStart]           = useState("");
  const [bookingEnd, setBookingEnd]               = useState("");
  const [bookingPurpose, setBookingPurpose]       = useState("");
  const [booking, setBookingInProgress]           = useState(false);
  const [bookingError, setBookingError]           = useState<string | null>(null);

  /* ── Load on mount ──────────────────────────────────────────────────── */
  useEffect(() => {
    async function load() {
      try {
        const [r, b, p] = await Promise.all([
          ResourcesService.getAll(),
          ResourcesService.getMyBookings(),
          ProjectsService.getAll(),
        ]);
        setResources(r);
        setMyBookings(b);
        setProjects(p);
        if (p.length > 0) setBookingProjectId(p[0].id);
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : "Failed to load resources");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  /* ── Create booking ─────────────────────────────────────────────────── */
  async function handleBook(e: React.FormEvent) {
    e.preventDefault();
    if (!bookingResource || !bookingStart || !bookingEnd) return;
    setBookingInProgress(true);
    setBookingError(null);
    try {
      const body: CreateBookingBody = {
        projectId: bookingProjectId || undefined,
        startTime: new Date(bookingStart).toISOString(),
        endTime: new Date(bookingEnd).toISOString(),
        purpose: bookingPurpose.trim() || undefined,
      };
      const created = await ResourcesService.createBooking(bookingResource.id, body);
      setMyBookings(prev => [created, ...prev]);
      setShowBookingModal(false);
      setActiveTab("My Bookings");
    } catch (err: unknown) {
      setBookingError(err instanceof Error ? err.message : "Booking failed");
    } finally {
      setBookingInProgress(false);
    }
  }

  function openBookingModal(resource: Resource) {
    setBookingResource(resource);
    setBookingError(null);
    setShowBookingModal(true);
  }

  if (loading) return <p style={{ padding: 40, color: "#888", fontSize: 14 }}>Loading resources…</p>;
  if (error)   return <p style={{ padding: 24, color: "#c62828", fontSize: 14 }}>Error: {error}</p>;

  return (
    <div>
      <div style={s.header}>
        <div>
          <h1 style={s.title}>Resources</h1>
          <p style={s.sub}>{resources.length} available resources</p>
        </div>
      </div>

      {/* ── Tabs ─────────────────────────────────────────────────────────── */}
      <div style={s.tabRow}>
        {(["Browse Resources", "My Bookings"] as ActiveTab[]).map(t => (
          <button key={t} style={activeTab === t ? s.tabOn : s.tabOff} onClick={() => setActiveTab(t)}>
            {t} {t === "My Bookings" ? `(${myBookings.length})` : ""}
          </button>
        ))}
      </div>

      {/* ── Resources list ───────────────────────────────────────────────── */}
      {activeTab === "Browse Resources" && (
        <div style={s.grid}>
          {resources.map(r => (
            <div key={r.id} id={`resource-card-${r.id}`} style={s.card}>
              <div style={s.cardTop}>
                <span style={s.resourceType}>{r.type}</span>
                <span style={{ ...s.statusBadge, ...statusStyle(r.status) }}>{r.status.replace("_", " ")}</span>
              </div>
              <h3 style={s.cardName}>{r.name}</h3>
              <p style={s.cardDesc}>{r.description || "No description"}</p>
              {r.location && <p style={s.cardMeta}>📍 {r.location}</p>}
              {r.maxDurationHours && <p style={s.cardMeta}>⏱ Max {r.maxDurationHours}h</p>}
              <button
                id={`btn-book-${r.id}`}
                style={{ ...s.bookBtn, opacity: r.status === "AVAILABLE" ? 1 : 0.4 }}
                disabled={r.status !== "AVAILABLE"}
                onClick={() => openBookingModal(r)}
              >
                {r.status === "AVAILABLE" ? "Book Now" : "Unavailable"}
              </button>
            </div>
          ))}
          {resources.length === 0 && (
            <p style={{ color: "#888", fontSize: 13 }}>No resources found.</p>
          )}
        </div>
      )}

      {/* ── My Bookings ──────────────────────────────────────────────────── */}
      {activeTab === "My Bookings" && (
        <div style={s.bookingList}>
          {myBookings.length === 0 ? (
            <p style={{ color: "#888", fontSize: 13 }}>No bookings yet.</p>
          ) : myBookings.map(b => (
            <div key={b.id} id={`booking-row-${b.id}`} style={s.bookingRow}>
              <div>
                <div style={s.bookingName}>{b.resourceName}</div>
                <div style={s.bookingTime}>
                  {new Date(b.startTime).toLocaleString()} → {new Date(b.endTime).toLocaleString()}
                </div>
                {b.purpose && <div style={s.bookingPurpose}>{b.purpose}</div>}
              </div>
              <span style={{ ...s.statusBadge, ...bookingStatusStyle(b.status) }}>{b.status}</span>
            </div>
          ))}
        </div>
      )}

      {/* ── Booking modal ─────────────────────────────────────────────────── */}
      {showBookingModal && bookingResource && (
        <div style={s.overlay}>
          <div style={s.modal}>
            <div style={s.modalHead}>
              <span style={s.modalTitle}>Book — {bookingResource.name}</span>
              <button style={s.closeBtn} onClick={() => setShowBookingModal(false)}>×</button>
            </div>
            <form onSubmit={handleBook} style={s.modalForm}>
              {bookingError && <div style={s.errorBanner}>{bookingError}</div>}
              {projects.length > 0 && (
                <div style={s.field}>
                  <label style={s.label}>Project</label>
                  <select id="select-booking-project" style={s.input} value={bookingProjectId}
                    onChange={e => setBookingProjectId(e.target.value)}>
                    {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                  </select>
                </div>
              )}
              <div style={s.field}>
                <label style={s.label}>Start time *</label>
                <input id="input-booking-start" type="datetime-local" style={s.input}
                  value={bookingStart} onChange={e => setBookingStart(e.target.value)} required />
              </div>
              <div style={s.field}>
                <label style={s.label}>End time *</label>
                <input id="input-booking-end" type="datetime-local" style={s.input}
                  value={bookingEnd} onChange={e => setBookingEnd(e.target.value)} required />
              </div>
              <div style={s.field}>
                <label style={s.label}>Purpose</label>
                <input id="input-booking-purpose" style={s.input} value={bookingPurpose}
                  onChange={e => setBookingPurpose(e.target.value)} placeholder="e.g. Simulation run batch 4" />
              </div>
              <div style={s.modalActions}>
                <button type="button" style={s.btnSecondary} onClick={() => setShowBookingModal(false)}>Cancel</button>
                <button id="btn-confirm-booking" type="submit"
                  style={{ ...s.btnPrimary, opacity: booking ? 0.6 : 1 }} disabled={booking}>
                  {booking ? "Booking…" : "Confirm Booking"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

function statusStyle(status: string): React.CSSProperties {
  switch (status) {
    case "AVAILABLE":    return { background: "#e8f5e9", color: "#2e7d32" };
    case "IN_USE":       return { background: "#fff3e0", color: "#e65100" };
    case "MAINTENANCE":  return { background: "#fce4ec", color: "#880e4f" };
    default:             return { background: "#f5f5f5", color: "#757575" };
  }
}

function bookingStatusStyle(status: BookingStatus): React.CSSProperties {
  switch (status) {
    case "APPROVED":  return { background: "#e8f5e9", color: "#2e7d32" };
    case "PENDING":   return { background: "#fff8e1", color: "#f57f17" };
    case "REJECTED":  return { background: "#fde8e8", color: "#c62828" };
    default:          return { background: "#f5f5f5", color: "#757575" };
  }
}

/* ── Styles ─────────────────────────────────────────────────────────────── */
const s: Record<string, React.CSSProperties> = {
  header: { display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 20 },
  title: { fontSize: 22, fontWeight: 700, color: "#161616", marginBottom: 4 },
  sub: { fontSize: 13, color: "#888888" },
  tabRow: { display: "flex", gap: 4, marginBottom: 20 },
  tabOn: { padding: "8px 16px", fontSize: 13, fontWeight: 700, color: "#161616", background: "#161616", color2: "#fff" as unknown as string, border: "none", borderRadius: 6, cursor: "pointer" } as React.CSSProperties,
  tabOff: { padding: "8px 16px", fontSize: 13, fontWeight: 500, color: "#888", background: "#f0f0f0", border: "none", borderRadius: 6, cursor: "pointer" },
  grid: { display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 16 },
  card: { background: "#ffffff", border: "1px solid #e8e8e8", borderRadius: 8, padding: 20, display: "flex", flexDirection: "column", gap: 8 },
  cardTop: { display: "flex", justifyContent: "space-between", alignItems: "center" },
  resourceType: { fontSize: 10, fontWeight: 700, color: "#888", letterSpacing: "0.5px", textTransform: "uppercase" as const },
  statusBadge: { fontSize: 10, fontWeight: 700, letterSpacing: "0.5px", padding: "3px 8px", borderRadius: 4 },
  cardName: { fontSize: 15, fontWeight: 600, color: "#161616", margin: 0 },
  cardDesc: { fontSize: 13, color: "#616161", lineHeight: 1.5, margin: 0 },
  cardMeta: { fontSize: 12, color: "#888", margin: 0 },
  bookBtn: { marginTop: 8, padding: "9px 0", background: "#161616", color: "#fff", border: "none", borderRadius: 6, fontSize: 13, fontWeight: 600, cursor: "pointer" },
  bookingList: { display: "flex", flexDirection: "column", gap: 12 },
  bookingRow: { background: "#ffffff", border: "1px solid #e8e8e8", borderRadius: 8, padding: 16, display: "flex", justifyContent: "space-between", alignItems: "flex-start" },
  bookingName: { fontSize: 14, fontWeight: 600, color: "#161616", marginBottom: 4 },
  bookingTime: { fontSize: 12, color: "#888" },
  bookingPurpose: { fontSize: 12, color: "#aaa", marginTop: 4 },
  btnPrimary: { padding: "10px 18px", background: "#161616", color: "#ffffff", border: "none", borderRadius: 6, fontSize: 13, fontWeight: 600, cursor: "pointer" },
  btnSecondary: { padding: "10px 18px", background: "#ffffff", color: "#161616", border: "1px solid #d0d0d0", borderRadius: 6, fontSize: 13, fontWeight: 600, cursor: "pointer" },
  overlay: { position: "fixed" as const, inset: 0, background: "rgba(0,0,0,0.4)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 100 },
  modal: { background: "#ffffff", borderRadius: 10, padding: 28, width: "100%", maxWidth: 460 },
  modalHead: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 },
  modalTitle: { fontSize: 16, fontWeight: 700, color: "#161616" },
  closeBtn: { background: "none", border: "none", fontSize: 22, color: "#888", cursor: "pointer" },
  modalForm: { display: "flex", flexDirection: "column", gap: 14 },
  modalActions: { display: "flex", gap: 10, justifyContent: "flex-end", marginTop: 8 },
  field: { display: "flex", flexDirection: "column", gap: 6 },
  label: { fontSize: 12, fontWeight: 600, color: "#161616" },
  input: { padding: "10px 12px", fontSize: 14, border: "1.5px solid #d0d0d0", borderRadius: 6, fontFamily: "inherit", width: "100%" },
  errorBanner: { padding: "10px 14px", background: "#fff0f0", border: "1px solid #f5c6cb", borderRadius: 6, fontSize: 13, color: "#c62828" },
};
