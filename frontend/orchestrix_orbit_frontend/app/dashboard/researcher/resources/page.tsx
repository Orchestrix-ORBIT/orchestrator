"use client";

import { useEffect, useState } from "react";
import LoadingState from "@/components/ui/LoadingState";
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
  const [resources, setResources]             = useState<Resource[]>([]);
  const [maintenanceLogs, setMaintenanceLogs] = useState<any[]>([]);
  const [allBookings, setAllBookings]         = useState<any[]>([]);
  const [myBookings, setMyBookings]           = useState<Booking[]>([]);
  const [projects, setProjects]       = useState<Project[]>([]);
  const [activeTab, setActiveTab]     = useState<ActiveTab>("Browse Resources");
  const [loading, setLoading]         = useState(true);
  const [error, setError]             = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedResourceDetails, setSelectedResourceDetails] = useState<Resource | null>(null);

  // Booking modal
  const [showBookingModal, setShowBookingModal]   = useState(false);
  const [bookingResource, setBookingResource]     = useState<Resource | null>(null);
  const [bookingProjectId, setBookingProjectId]   = useState("");
  const [bookingDate, setBookingDate]             = useState("");
  const [bookingStartTime, setBookingStartTime]   = useState("");
  const [bookingEndTime, setBookingEndTime]       = useState("");
  const [bookingPurpose, setBookingPurpose]       = useState("");
  const [booking, setBookingInProgress]           = useState(false);
  const [bookingError, setBookingError]           = useState<string | null>(null);

  /* ── Load on mount ──────────────────────────────────────────────────── */
  useEffect(() => {
    async function load() {
      try {
        const [r, b, p, m] = await Promise.all([
          ResourcesService.getAll(),
          ResourcesService.getMyBookings(),
          ProjectsService.getAll(),
          ResourcesService.getMaintenance().catch(() => []),
        ]);

        const bookingResults = await Promise.all(
          (r || []).map((res) =>
            ResourcesService.getBookings(res.id).catch(() => [])
          )
        );
        let allTeamBookings = bookingResults.flat();
        allTeamBookings = allTeamBookings.filter((bk, i, arr) => arr.findIndex(x => x.id === bk.id) === i);
        allTeamBookings = allTeamBookings.map(normalizeBooking);
        setAllBookings(allTeamBookings);

        setResources(r);
        setMyBookings(b);
        setProjects(p);
        setMaintenanceLogs(m || []);
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
    if (!bookingResource || !bookingDate || !bookingStartTime || !bookingEndTime) return;
    setBookingInProgress(true);
    setBookingError(null);
    try {
      const startObj = new Date(`${bookingDate}T${bookingStartTime}`);
      const endObj = new Date(`${bookingDate}T${bookingEndTime}`);
      const body: CreateBookingBody = {
        projectId: bookingProjectId || undefined,
        startTime: startObj.toISOString(),
        endTime: endObj.toISOString(),
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

  function openBookingModal(resource: Resource & { nextAvailableTime?: Date | null }) {
    setBookingResource(resource);
    setBookingError(null);

    let startD = new Date();
    if (resource.nextAvailableTime && resource.nextAvailableTime > startD) {
      startD = new Date(resource.nextAvailableTime);
    }

    const yyyy = startD.getFullYear();
    const mm = String(startD.getMonth() + 1).padStart(2, '0');
    const dd = String(startD.getDate()).padStart(2, '0');
    setBookingDate(`${yyyy}-${mm}-${dd}`);

    const startH = String(startD.getHours()).padStart(2, '0');
    const startM = String(startD.getMinutes()).padStart(2, '0');
    setBookingStartTime(`${startH}:${startM}`);

    const endD = new Date(startD.getTime() + 60 * 60 * 1000);
    const endH = String(endD.getHours()).padStart(2, '0');
    const endM = String(endD.getMinutes()).padStart(2, '0');
    setBookingEndTime(`${endH}:${endM}`);

    setShowBookingModal(true);
  }

  if (loading) return <LoadingState variant="researcher-resources" title="Loading Resources..." subtitle="Fetching available resources and your bookings" />;
  if (error)   return <p style={{ padding: 24, color: "#c62828", fontSize: 14 }}>Error: {error}</p>;

  const effectiveResources = resources.map(r => {
    const { status, nextAvailableTime } = getEffectiveStatus(r, maintenanceLogs, allBookings);
    return { ...r, effectiveStatus: status, nextAvailableTime };
  });

  const filteredResources = effectiveResources.filter(r => 
    r.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
    r.type.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (r.description || "").toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredBookings = myBookings.filter(b => 
    b.resourceName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    b.purpose?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const slotStatus = showBookingModal && bookingResource
    ? checkResourceSlotStatus(bookingResource, bookingDate, bookingStartTime, bookingEndTime, allBookings, maintenanceLogs)
    : { isBookable: true, reason: "", label: "" };

  // Max duration client-side check
  const maxDurViolation = (() => {
    if (!showBookingModal || !bookingResource || !bookingDate || !bookingStartTime || !bookingEndTime) return null;
    const max = bookingResource.maxDurationHours;
    if (!max) return null;
    const start = new Date(`${bookingDate}T${bookingStartTime}`);
    const end   = new Date(`${bookingDate}T${bookingEndTime}`);
    if (isNaN(start.getTime()) || isNaN(end.getTime())) return null;
    const durationHours = (end.getTime() - start.getTime()) / 3600000;
    if (durationHours > max) return { requested: Math.round(durationHours * 10) / 10, max };
    return null;
  })();

  // User-concurrency check: does the current user already have a DIFFERENT resource booked at the selected slot?
  const userConcurrencyConflict = showBookingModal && bookingResource
    ? (() => {
        const { slotStart, slotEnd } = (bookingDate && bookingStartTime && bookingEndTime)
          ? getSlotStartEndDates(bookingDate, bookingStartTime, bookingEndTime)
          : { slotStart: null, slotEnd: null };
        if (!slotStart || !slotEnd) return null;
        const myId = myBookings[0]?.userId; // current user's ID
        return allBookings.find((b) => {
          if (!myId || b.userId !== myId) return false;
          // Must be a different resource
          const isOtherResource =
            String(b.resourceId) !== String(bookingResource.id) &&
            (!b.resourceName || String(b.resourceName).trim().toLowerCase() !== String(bookingResource.name).trim().toLowerCase());
          if (!isOtherResource) return false;
          if (b.status === "CANCELLED" || b.status === "REJECTED") return false;
          return new Date(b.startTime) < slotEnd && new Date(b.endTime) > slotStart;
        }) || null;
      })()
    : null;

  // Per-resource: is the current user actively using this resource right now?
  const now = new Date();
  const myUserId = myBookings[0]?.userId;
  function isMyActiveBookingOnResource(resourceId: string) {
    return allBookings.some((b) =>
      b.userId === myUserId &&
      String(b.resourceId) === String(resourceId) &&
      b.status === "APPROVED" &&
      new Date(b.startTime) <= now &&
      new Date(b.endTime) >= now
    );
  }

  return (
    <div>
      <div style={s.header}>
        <div>
          <h1 style={s.title}>Resources</h1>
          <p style={s.sub}>{resources.length} available resources</p>
        </div>
        
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ position: "relative", display: "flex", alignItems: "center", border: "1px solid #e5e7eb", borderRadius: 6, padding: "8px 10px", transition: "border-color 0.2s", background: "#fff" }}
               onFocus={(e) => e.currentTarget.style.borderColor = "#3b82f6"}
               onBlur={(e) => e.currentTarget.style.borderColor = "#e5e7eb"}
          >
            <svg style={{ color: "#9ca3af", flexShrink: 0, marginRight: 8 }} width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
            <input
              type="text"
              placeholder={`Search ${activeTab === "Browse Resources" ? "resources" : "bookings"}...`}
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              style={{ width: "200px", fontSize: 13, color: "#111827" }}
              className="no-default-input"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                style={{
                  position: "absolute",
                  right: 8,
                  background: "#f3f4f6",
                  border: "none",
                  fontSize: 10,
                  fontWeight: 700,
                  color: "#6b7280",
                  cursor: "pointer",
                  padding: "4px 6px",
                  borderRadius: 4,
                  lineHeight: 1,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center"
                }}
                title="Clear search"
                className="btn-secondary-hover"
              >
                ESC
              </button>
            )}
          </div>
        </div>
      </div>

      {/* ── Tabs ─────────────────────────────────────────────────────────── */}
      <div style={s.tabRow}>
        {(["Browse Resources", "My Bookings"] as ActiveTab[]).map(t => (
          <button key={t} className="btn-hover-flat" style={activeTab === t ? s.tabOn : s.tabOff} onClick={() => { setActiveTab(t); setSearchQuery(""); }}>
            {t} {t === "My Bookings" ? `(${myBookings.length})` : ""}
          </button>
        ))}
      </div>

      {/* ── Resources list ───────────────────────────────────────────────── */}
      {activeTab === "Browse Resources" && (
        <div style={s.grid}>
          {filteredResources.map(r => (
            <div 
              key={r.id} 
              id={`resource-card-${r.id}`} 
              style={{ ...s.card, cursor: "pointer" }} 
              className="card-depth"
              onClick={() => setSelectedResourceDetails(r)}
            >
              <div style={s.cardTop}>
                 <span style={s.resourceType}>{r.type}</span>
                <span style={{ ...s.statusBadge, ...statusStyle(r.effectiveStatus) }}>{r.effectiveStatus.replace("_", " ")}</span>
              </div>
              <h3 style={s.cardName}>{r.name}</h3>
              <p style={s.cardDesc}>{r.description || "No description"}</p>
              <div style={{ marginTop: "auto", display: "flex", flexDirection: "column", gap: 8 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                  {r.location && <p style={{ ...s.cardMeta, margin: 0 }}>📍 {r.location}</p>}
                  {r.maxDurationHours && (
                    <span style={{ fontSize: 11, fontWeight: 700, background: "#eff6ff", color: "#1d4ed8", border: "1px solid #bfdbfe", borderRadius: 4, padding: "2px 7px", whiteSpace: "nowrap" as const }}>
                      ⏱ Max {r.maxDurationHours}h / session
                    </span>
                  )}
                </div>
                <button
                  id={`btn-book-${r.id}`}
                  className="btn-hover-lift"
                  style={{ ...s.bookBtn, opacity: 1 }}
                  onClick={(e) => { e.stopPropagation(); openBookingModal(r); }}
                >
                  {r.effectiveStatus === "AVAILABLE"
                    ? "Book Now"
                    : isMyActiveBookingOnResource(r.id)
                    ? "Book Another Slot"
                    : "Reserve Next"}
                </button>
              </div>
            </div>
          ))}
          {filteredResources.length === 0 && (
            <p style={{ color: "#6b7280", fontSize: 13 }}>No resources found.</p>
          )}
        </div>
      )}

      {/* ── My Bookings ──────────────────────────────────────────────────── */}
      {activeTab === "My Bookings" && (
        <div style={s.bookingList}>
          {myBookings.some(b => b.status === "PENDING" || b.status === "PENDING_APPROVAL") && (
            <div style={{ ...s.errorBanner, background: "#fff8e1", border: "1px solid #ffecb3", color: "#f57f17", marginBottom: 8 }}>
              <span style={{ fontWeight: 600 }}>Note:</span> Your pending booking requests require approval from the Research Lead. You will be notified once they are reviewed.
            </div>
          )}
          {filteredBookings.length === 0 ? (
            <p style={{ color: "#6b7280", fontSize: 13 }}>No bookings found.</p>
          ) : filteredBookings.map(b => (
            <div key={b.id} id={`booking-row-${b.id}`} style={s.bookingRow} className="card-depth">
              <div>
                <div style={s.bookingName}>{b.resourceName}</div>
                <div style={s.bookingTime}>
                  {new Date(b.startTime).toLocaleString()} → {new Date(b.endTime).toLocaleString()}
                </div>
                {b.purpose && <div style={s.bookingPurpose}>{b.purpose}</div>}
              </div>
              <span 
                style={{ ...s.statusBadge, ...bookingStatusStyle(b.status) }}
                title={b.status === "PENDING" ? "Awaiting Lead Approval" : b.status}
              >
                {b.status}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* ── Resource Details Modal ────────────────────────────────────────── */}
      {selectedResourceDetails && (
        <div style={s.overlay} onClick={() => setSelectedResourceDetails(null)}>
          <div style={{ ...s.modal, maxWidth: 560, padding: 0, overflow: "hidden", boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.25), 0 0 0 1px rgba(0,0,0,0.05)", borderRadius: 12 }} onClick={e => e.stopPropagation()}>
            <div style={{ padding: "24px 24px 20px", borderBottom: "1px solid #f3f4f6" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 }}>
                <h2 style={{ fontSize: 20, fontWeight: 700, color: "#111827", margin: 0 }}>
                  {selectedResourceDetails.name}
                </h2>
                <button onClick={() => setSelectedResourceDetails(null)} style={{ background: "none", border: "none", color: "#9ca3af", cursor: "pointer", fontSize: 20, lineHeight: 1 }}>✕</button>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 12, fontSize: 13, color: "#6b7280" }}>
                <span style={{ fontFamily: "var(--font-mono)" }}>ID: RES-{selectedResourceDetails.id.substring(0, 5)}</span>
                {selectedResourceDetails.location && (
                  <>
                    <span>•</span>
                    <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
                      <span style={{ color: "#ef4444" }}>📍</span> {selectedResourceDetails.location}
                    </span>
                  </>
                )}
              </div>
            </div>

            <div style={{ padding: 24, display: "flex", flexDirection: "column", gap: 16 }}>
              <div style={{ border: "1px solid #f3f4f6", borderRadius: 8, padding: 16 }}>
                <div style={{ fontSize: 10, fontWeight: 700, color: "#9ca3af", letterSpacing: "0.5px", textTransform: "uppercase", marginBottom: 8 }}>
                  Resource Description
                </div>
                <p style={{ fontSize: 14, color: "#374151", margin: 0, lineHeight: 1.5 }}>
                  {selectedResourceDetails.description || "No description provided."}
                </p>
              </div>

              <div style={{ border: "1px solid #f3f4f6", borderRadius: 8, padding: 16 }}>
                <div style={{ fontSize: 10, fontWeight: 700, color: "#9ca3af", letterSpacing: "0.5px", textTransform: "uppercase", marginBottom: 8 }}>
                  Category / Specification
                </div>
                <div style={{ fontSize: 14, fontWeight: 500, color: "#111827" }}>
                  {selectedResourceDetails.type}
                </div>
              </div>

              {selectedResourceDetails.maxDurationHours && (
                <div style={{ border: "1px solid #bfdbfe", borderRadius: 8, padding: 16, background: "#eff6ff" }}>
                  <div style={{ fontSize: 10, fontWeight: 700, color: "#1d4ed8", letterSpacing: "0.5px", textTransform: "uppercase", marginBottom: 8 }}>
                    ⏱ Max Session Duration
                  </div>
                  <div style={{ fontSize: 14, fontWeight: 700, color: "#1e40af" }}>
                    {selectedResourceDetails.maxDurationHours} hour{selectedResourceDetails.maxDurationHours > 1 ? "s" : ""} per booking
                  </div>
                  <div style={{ fontSize: 12, color: "#3b82f6", marginTop: 4 }}>
                    Fair-access policy: bookings exceeding this limit will be rejected.
                  </div>
                </div>
              )}
            </div>

            <div style={{ padding: "16px 24px", borderTop: "1px solid #f3f4f6", display: "flex", justifyContent: "flex-end" }}>
              <button 
                onClick={() => setSelectedResourceDetails(null)}
                className="btn-hover-flat"
                style={{ padding: "8px 16px", background: "#ffffff", border: "1px solid #d1d5db", borderRadius: 6, fontSize: 13, fontWeight: 600, color: "#374151", cursor: "pointer" }}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Booking modal ─────────────────────────────────────────────────── */}
      {showBookingModal && bookingResource && (
        <div style={s.overlay}>
          <div style={{ ...s.modal, maxWidth: 560, padding: 0, overflow: "hidden", boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.25), 0 0 0 1px rgba(0,0,0,0.05)", borderRadius: 12 }}>
            <div style={{ padding: "24px 24px 20px", borderBottom: "1px solid #f3f4f6" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 4 }}>
                <h2 style={{ fontSize: 20, fontWeight: 700, color: "#111827", margin: 0 }}>Request Resource Booking</h2>
                <button onClick={() => { setShowBookingModal(false); setBookingError(null); }} style={{ background: "none", border: "none", color: "#9ca3af", cursor: "pointer", fontSize: 20, lineHeight: 1 }}>✕</button>
              </div>
              <p style={{ fontSize: 13, color: "#6b7280", margin: 0 }}>Reserve laboratory hardware with strict concurrency lock protection.</p>
            </div>
            
            <form onSubmit={handleBook} style={{ padding: 24, display: "flex", flexDirection: "column", gap: 20 }}>
              {/* Max duration info banner */}
              {bookingResource?.maxDurationHours && (
                <div style={{ background: "#eff6ff", border: "1px solid #bfdbfe", borderRadius: 6, padding: "10px 14px", fontSize: 12, color: "#1d4ed8", display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{ fontWeight: 700, fontSize: 14 }}>⏱</span>
                  <span><strong>Max session:</strong> {bookingResource.maxDurationHours} hour{bookingResource.maxDurationHours > 1 ? "s" : ""} per booking (fair-access policy). Exceeding this limit will be rejected.</span>
                </div>
              )}
              {/* Row 1 */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 16 }}>
                <div style={s.field}>
                  <label style={{ fontSize: 10, fontWeight: 700, color: "#374151", letterSpacing: "0.5px", textTransform: "uppercase" }}>Reservation Date *</label>
                  <input type="date" style={s.input} value={bookingDate} onChange={e => setBookingDate(e.target.value)} required />
                </div>
                <div style={s.field}>
                  <label style={{ fontSize: 10, fontWeight: 700, color: "#374151", letterSpacing: "0.5px", textTransform: "uppercase" }}>Start Time *</label>
                  <input type="time" style={s.input} value={bookingStartTime} onChange={e => setBookingStartTime(e.target.value)} required />
                </div>
                <div style={s.field}>
                  <label style={{ fontSize: 10, fontWeight: 700, color: "#374151", letterSpacing: "0.5px", textTransform: "uppercase" }}>End Time *</label>
                  <input type="time" style={s.input} value={bookingEndTime} onChange={e => setBookingEndTime(e.target.value)} required />
                </div>
              </div>

              {/* Row 2 */}
              <div style={s.field}>
                <label style={{ fontSize: 10, fontWeight: 700, color: "#374151", letterSpacing: "0.5px", textTransform: "uppercase" }}>Select Resource *</label>
                <input type="text" style={{ ...s.input, background: "#f9fafb", color: "#6b7280" }} value={bookingResource.name} disabled />
              </div>

              {/* Row 3 */}
              {projects.length > 0 && (
                <div style={s.field}>
                  <label style={{ fontSize: 10, fontWeight: 700, color: "#374151", letterSpacing: "0.5px", textTransform: "uppercase" }}>Target Research Project *</label>
                  <select style={s.input} value={bookingProjectId} onChange={e => setBookingProjectId(e.target.value)} required>
                    {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                  </select>
                </div>
              )}

              {/* Row 4 (Purpose - Researcher specific) */}
              <div style={s.field}>
                <label style={{ fontSize: 10, fontWeight: 700, color: "#374151", letterSpacing: "0.5px", textTransform: "uppercase" }}>Purpose</label>
                <input style={s.input} value={bookingPurpose} onChange={e => setBookingPurpose(e.target.value)} placeholder="e.g. Simulation run batch 4" />
              </div>

              {bookingError && (
                <div style={{ background: "#fef2f2", border: "1px solid #fecaca", borderRadius: 6, padding: "12px 16px", fontSize: 13, color: "#b91c1c", display: "flex", gap: 8 }}>
                  <span style={{ fontWeight: 700 }}>⚠️</span>
                  <span>{bookingError}</span>
                </div>
              )}

              {(!slotStatus.isBookable) && (
                <div style={{ background: "#fef2f2", border: "1px solid #fecaca", borderRadius: 6, padding: "12px 16px", fontSize: 13, color: "#b91c1c", display: "flex", gap: 8 }}>
                  <span style={{ fontWeight: 700 }}>⚠️</span>
                  <span><strong>Cannot Book: {bookingResource?.name}</strong> is {slotStatus.reason}. Please select another time or resource.</span>
                </div>
              )}

              {slotStatus.isBookable && userConcurrencyConflict && (
                <div style={{ background: "#fff3cd", border: "1px solid #ffc107", borderRadius: 6, padding: "12px 16px", fontSize: 13, color: "#856404", display: "flex", gap: 8 }}>
                  <span style={{ fontWeight: 700 }}>🚫</span>
                  <span>
                    <strong>Scheduling Conflict:</strong> You already have <strong>{(userConcurrencyConflict as any).resourceName || "another resource"}</strong> booked during this time slot.
                    A researcher can only use <strong>one resource at a time</strong>. Please choose a non-overlapping slot.
                  </span>
                </div>
              )}

              {slotStatus.isBookable && !userConcurrencyConflict && isMyActiveBookingOnResource(bookingResource?.id || "") && (
                <div style={{ background: "#f0fdf4", border: "1px solid #86efac", borderRadius: 6, padding: "12px 16px", fontSize: 13, color: "#166534", display: "flex", gap: 8 }}>
                  <span style={{ fontWeight: 700 }}>✅</span>
                  <span>You currently have this resource. You are booking an <strong>additional future slot</strong> for this same resource — this is allowed.</span>
                </div>
              )}

              {/* Max duration violation warning */}
              {maxDurViolation && (
                <div style={{ background: "#fef2f2", border: "1px solid #fecaca", borderRadius: 6, padding: "12px 16px", fontSize: 13, color: "#b91c1c", display: "flex", gap: 8 }}>
                  <span style={{ fontWeight: 700 }}>⏱</span>
                  <span><strong>Duration too long:</strong> This resource allows a maximum of <strong>{maxDurViolation.max}h</strong> per booking. Your selection is <strong>{maxDurViolation.requested}h</strong>. Please shorten your slot.</span>
                </div>
              )}

              {(() => {
                const isBlocked = !slotStatus.isBookable || !!userConcurrencyConflict || !!maxDurViolation;
                return (
                  <div style={{ display: "flex", justifyContent: "flex-end", gap: 12, marginTop: 4 }}>
                    <button type="button" className="btn-hover-flat" style={{ padding: "10px 18px", background: "#ffffff", border: "1px solid #d1d5db", borderRadius: 6, fontSize: 13, fontWeight: 600, color: "#374151", cursor: "pointer" }} onClick={() => { setShowBookingModal(false); setBookingError(null); }}>
                      Cancel
                    </button>
                    <button type="submit" className={isBlocked ? "" : "btn-hover-lift"} style={{ padding: "10px 18px", background: isBlocked ? "#9ca3af" : "#111827", color: "#ffffff", border: "none", borderRadius: 6, fontSize: 13, fontWeight: 600, cursor: isBlocked ? "not-allowed" : "pointer", opacity: booking ? 0.7 : 1 }} disabled={booking || isBlocked}>
                      {!slotStatus.isBookable
                        ? `Cannot Book (${slotStatus.label})`
                        : maxDurViolation
                        ? `Exceeds ${maxDurViolation.max}h Limit`
                        : userConcurrencyConflict
                        ? "Scheduling Conflict"
                        : booking
                        ? "Processing..."
                        : "Confirm Booking"}
                    </button>
                  </div>
                );
              })()}
            </form>
          </div>
        </div>
      )}
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
  if (tzOffsetMinutes === 0) return b; // In UTC, no offset distortion

  const tzOffsetMs = tzOffsetMinutes * 60 * 1000;
  const startMs = startObj.getTime();
  const createdMs = b.createdAt ? new Date(b.createdAt).getTime() : null;

  // If created recently and shifted forward by approximately the timezone offset
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

function getSlotStartEndDates(dateStr: string, startTimeStr: string, endTimeStr: string) {
  const now = new Date();
  const defaultDate = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
  const dateVal = dateStr || defaultDate;
  
  const [startHStr, startMStr] = (startTimeStr || "14:00").split(":");
  let startH = parseInt(startHStr || "14", 10);
  let startM = parseInt(startMStr || "0", 10);

  const [endHStr, endMStr] = (endTimeStr || "15:00").split(":");
  let endH = parseInt(endHStr || "15", 10);
  let endM = parseInt(endMStr || "0", 10);

  const [y, m, d] = dateVal.split("-").map((v) => parseInt(v, 10));
  
  const slotStart = new Date(y, (m || 1) - 1, d || 1, startH, startM, 0);
  let slotEnd = new Date(y, (m || 1) - 1, d || 1, endH, endM, 0);

  if (slotEnd <= slotStart) {
    slotEnd = new Date(slotEnd.getTime() + 24 * 60 * 60 * 1000);
  }

  return { slotStart, slotEnd };
}

function checkResourceSlotStatus(resource: any, dateStr: string, startTimeStr: string, endTimeStr: string, allBookings: any[], maintenanceLogs: any[] = []) {
  if (!resource) return { isBookable: true, label: "Available", reason: "" };
  const { slotStart, slotEnd } = getSlotStartEndDates(dateStr, startTimeStr, endTimeStr);

  const assetLogs = (maintenanceLogs || []).filter((m) => {
    const isIdMatch = m.resourceId && resource.id && String(m.resourceId) === String(resource.id);
    const isNameMatch = m.assetName && resource.name && String(m.assetName).trim().toLowerCase() === String(resource.name).trim().toLowerCase();
    return isIdMatch || isNameMatch;
  });

  let hasOverlappingMaintenanceLog = false;
  for (const m of assetLogs) {
    const dates = parseMaintDates(m);
    if (dates && dates.start && dates.end) {
      if (slotStart < dates.end && slotEnd > dates.start) {
        hasOverlappingMaintenanceLog = true;
        return {
          isBookable: false,
          label: "Under Maintenance",
          reason: `scheduled maintenance window (${dates.start.toLocaleDateString()} – ${dates.end.toLocaleDateString()})`,
        };
      }
    }
  }

  if (!hasOverlappingMaintenanceLog && (resource.status === "MAINTENANCE" || resource.status === "Under Maintenance" || resource.status === "Maintenance")) {
      return {
          isBookable: false,
          label: "Under Maintenance",
          reason: "currently flagged for offline maintenance",
      };
  }

  const resBookings = (allBookings || []).filter((b) => {
    const isIdMatch = b.resourceId && resource.id && String(b.resourceId) === String(resource.id);
    const isNameMatch = b.resourceName && resource.name && String(b.resourceName).trim().toLowerCase() === String(resource.name).trim().toLowerCase();
    return (isIdMatch || isNameMatch) && b.status !== "CANCELLED" && b.status !== "REJECTED";
  });

  const overlappingBooking = resBookings.find((b) => {
    const bStart = new Date(b.startTime);
    const bEnd = new Date(b.endTime);
    return bStart < slotEnd && bEnd > slotStart;
  });

  if (overlappingBooking) {
    let resolvedBookedBy = overlappingBooking.bookedBy || overlappingBooking.userName || overlappingBooking.userEmail;
    if (resolvedBookedBy && resolvedBookedBy.includes("@")) resolvedBookedBy = resolvedBookedBy.split("@")[0];
    if (!resolvedBookedBy && overlappingBooking.userId) resolvedBookedBy = `User ${overlappingBooking.userId.substring(0, 5)}`;
    if (!resolvedBookedBy) resolvedBookedBy = "another researcher";

    return {
      isBookable: false,
      label: "Booked (Unavailable)",
      reason: `already booked for selected time by ${resolvedBookedBy}`,
    };
  }

  return { isBookable: true, label: "Available", reason: "" };
}

function getEffectiveStatus(resource: Resource, maintenanceLogs: any[] = [], allBookings: any[] = []): { status: Resource["status"], nextAvailableTime: Date | null } {
  const now = new Date();
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
    const dates = parseMaintDates(activeLog);
    return { status: "MAINTENANCE", nextAvailableTime: dates?.end ? new Date(dates.end.getTime() + 60000) : new Date(now.getTime() + 86400000) };
  }

  if (resource.status === "MAINTENANCE") {
    const hasActiveOrUpcoming = assetLogs.some((m) => {
      const dates = parseMaintDates(m);
      return dates?.end && now <= dates.end;
    });
    if (!hasActiveOrUpcoming) {
      return { status: "AVAILABLE", nextAvailableTime: null };
    }
    return { status: "MAINTENANCE", nextAvailableTime: new Date(now.getTime() + 86400000) };
  }

  const resBookings = (allBookings || []).filter((b) => {
    const isIdMatch = String(b.resourceId) === String(resource.id);
    const isNameMatch = b.resourceName && resource.name && String(b.resourceName).trim().toLowerCase() === String(resource.name).trim().toLowerCase();
    return (isIdMatch || isNameMatch) && b.status !== "CANCELLED" && b.status !== "REJECTED";
  });

  const activeBooking = resBookings.find((b) => {
    const start = new Date(b.startTime);
    const end = new Date(b.endTime);
    const isStartedOrImminent = (now >= start || (start.getTime() - now.getTime() <= 5 * 60 * 1000));
    return isStartedOrImminent && now <= end;
  });

  if (activeBooking) {
    return { status: "IN_USE", nextAvailableTime: new Date(activeBooking.endTime) };
  }

  const upcomingBooking = resBookings
    .filter((b) => new Date(b.startTime) > now)
    .sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime())[0];

  if (upcomingBooking) {
    return { status: "RESERVED", nextAvailableTime: new Date(upcomingBooking.startTime) };
  }

  return { status: resource.status, nextAvailableTime: null };
}

function statusStyle(status: string): React.CSSProperties {
  switch (status) {
    case "AVAILABLE":    return { background: "#e8f5e9", color: "#2e7d32" };
    case "IN_USE":       return { background: "#fff3e0", color: "#e65100" };
    case "MAINTENANCE":  return { background: "#fce4ec", color: "#880e4f" };
    case "RESERVED":     return { background: "#f1f5f9", color: "#475569" };
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
  title: { fontSize: 22, fontWeight: 700, color: "#111827", marginBottom: 4 },
  sub: { fontSize: 13, color: "#6b7280" },
  tabRow: { display: "flex", gap: 6, marginBottom: 20 },
  tabOn: { padding: "8px 16px", fontSize: 13, fontWeight: 700, color: "#ffffff", background: "#161616", border: "1px solid #161616", borderRadius: 6, cursor: "pointer" },
  tabOff: { padding: "8px 16px", fontSize: 13, fontWeight: 600, color: "#616161", background: "#f5f5f5", border: "1px solid #f3f4f6", borderRadius: 6, cursor: "pointer" },
  grid: { display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 16 },
  card: { background: "#ffffff", border: "1px solid #f3f4f6", borderRadius: 12, padding: 20, display: "flex", flexDirection: "column", gap: 8 , boxShadow: "0 4px 6px -1px rgba(0,0,0,0.05), 0 2px 4px -1px rgba(0,0,0,0.03)"},
  cardTop: { display: "flex", justifyContent: "space-between", alignItems: "center" },
  resourceType: { fontSize: 10, fontWeight: 700, color: "#6b7280", letterSpacing: "0.5px", textTransform: "uppercase" as const },
  statusBadge: { fontSize: 10, fontWeight: 700, letterSpacing: "0.5px", padding: "3px 8px", borderRadius: 4 },
  cardName: { fontSize: 15, fontWeight: 600, color: "#111827", margin: 0 },
  cardDesc: { fontSize: 13, color: "#616161", lineHeight: 1.5, margin: 0 },
  cardMeta: { fontSize: 12, color: "#6b7280", margin: 0 },
  bookBtn: { marginTop: 8, padding: "9px 0", background: "#161616", color: "#fff", border: "none", borderRadius: 6, fontSize: 13, fontWeight: 600, cursor: "pointer" },
  bookingList: { display: "flex", flexDirection: "column", gap: 12 },
  bookingRow: { background: "#ffffff", border: "1px solid #f3f4f6", borderRadius: 12, padding: 16, display: "flex", justifyContent: "space-between", alignItems: "flex-start" },
  bookingName: { fontSize: 14, fontWeight: 600, color: "#111827", marginBottom: 4 },
  bookingTime: { fontSize: 12, color: "#6b7280" },
  bookingPurpose: { fontSize: 12, color: "#aaa", marginTop: 4 },
  btnPrimary: { padding: "10px 18px", background: "#161616", color: "#ffffff", border: "none", borderRadius: 6, fontSize: 13, fontWeight: 600, cursor: "pointer" , boxShadow: "0 4px 6px -1px rgba(17, 24, 39, 0.15)"},
  btnSecondary: { padding: "10px 18px", background: "#ffffff", color: "#111827", border: "1px solid #d0d0d0", borderRadius: 6, fontSize: 13, fontWeight: 600, cursor: "pointer" },
  overlay: { position: "fixed" as const, inset: 0, background: "rgba(0,0,0,0.4)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 100 },
  modal: { background: "#ffffff", borderRadius: 10, padding: 28, width: "100%", maxWidth: 460 },
  modalHead: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 },
  modalTitle: { fontSize: 16, fontWeight: 700, color: "#111827" },
  closeBtn: { background: "none", border: "none", fontSize: 22, color: "#6b7280", cursor: "pointer" },
  modalForm: { display: "flex", flexDirection: "column", gap: 14 },
  modalActions: { display: "flex", gap: 10, justifyContent: "flex-end", marginTop: 8 },
  field: { display: "flex", flexDirection: "column", gap: 6 },
  label: { fontSize: 12, fontWeight: 600, color: "#111827" },
  input: { padding: "10px 12px", fontSize: 14, border: "1.5px solid #d0d0d0", borderRadius: 6, fontFamily: "inherit", width: "100%" },
  errorBanner: { padding: "10px 14px", background: "#fff0f0", border: "1px solid #f5c6cb", borderRadius: 6, fontSize: 13, color: "#c62828" },
};
