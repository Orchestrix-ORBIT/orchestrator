"use client";

import React, { useState } from "react";

interface BookingRecord {
  id: string;
  resourceName: string;
  requester: string;
  project: string;
  date: string;
  timeSlot: string;
  durationHours: number;
  status: "Pending" | "Approved" | "Rejected" | "Overridden";
  lockHash: string;
  purpose: string;
}

const INITIAL_BOOKINGS: BookingRecord[] = [
  {
    id: "BK-801",
    resourceName: "GPU Workstation Node 1 (8x A100)",
    requester: "Dinuka K. (Lead)",
    project: "Project Alpha Core",
    date: "Aug 21, 2026",
    timeSlot: "14:00 - 18:00",
    durationHours: 4,
    status: "Pending",
    lockHash: "0x9f83a...4b12 (Acquiring)",
    purpose: "Quantum decoherence simulation run batch 4.",
  },
  {
    id: "BK-802",
    resourceName: "Titan Krios Cryo-EM Suite",
    requester: "Shehara K. (Researcher)",
    project: "Project Alpha Core",
    date: "Aug 21, 2026",
    timeSlot: "09:00 - 17:00",
    durationHours: 8,
    status: "Approved",
    lockHash: "0x4e21c...88a1 (Locked)",
    purpose: "Full day single-particle structural electron freezing.",
  },
  {
    id: "BK-803",
    resourceName: "High-Resolution Mass Spectrometer",
    requester: "Amara P. (Postdoc)",
    project: "Nexus Protocol",
    date: "Aug 22, 2026",
    timeSlot: "10:00 - 14:00",
    durationHours: 4,
    status: "Approved",
    lockHash: "0x1b77a...29c4 (Locked)",
    purpose: "Proteomics peptide fingerprinting.",
  },
  {
    id: "BK-804",
    resourceName: "GPU Workstation Node 2 (4x A100)",
    requester: "Marcus N. (Specialist)",
    project: "Beta Synthesis",
    date: "Aug 20, 2026",
    timeSlot: "13:00 - 17:00",
    durationHours: 4,
    status: "Approved",
    lockHash: "0x7c90e...11df (Archived)",
    purpose: "Neural network pre-training check.",
  },
  {
    id: "BK-805",
    resourceName: "ISO-5 Cleanroom Photolithography Bay",
    requester: "E. Chen (Researcher)",
    project: "Nexus Protocol",
    date: "Aug 19, 2026",
    timeSlot: "09:00 - 15:00",
    durationHours: 6,
    status: "Overridden",
    lockHash: "0x3a88b...990f (Overridden)",
    purpose: "Wafer exposure run shifted due to priority facility maintenance.",
  },
];

export default function BookingsApprovalsPage() {
  const [bookings, setBookings] = useState<BookingRecord[]>(INITIAL_BOOKINGS);
  const [filter, setFilter] = useState<"ALL" | BookingRecord["status"]>("ALL");
  const [selectedBooking, setSelectedBooking] = useState<BookingRecord | null>(null);
  const [overrideReason, setOverrideReason] = useState("");
  const [showOverrideModal, setShowOverrideModal] = useState(false);
  const [showLockModal, setShowLockModal] = useState(false);

  const handleApprove = (id: string) => {
    setBookings((prev) =>
      prev.map((b) =>
        b.id === id
          ? { ...b, status: "Approved", lockHash: "0x" + Math.random().toString(16).slice(2, 10) + "... (Locked)" }
          : b
      )
    );
  };

  const handleReject = (id: string) => {
    setBookings((prev) =>
      prev.map((b) =>
        b.id === id
          ? { ...b, status: "Rejected", lockHash: "RELEASED" }
          : b
      )
    );
  };

  const handleOverrideSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedBooking) return;

    setBookings((prev) =>
      prev.map((b) =>
        b.id === selectedBooking.id
          ? {
              ...b,
              status: "Overridden",
              purpose: `[MANAGER OVERRIDE]: ${overrideReason}`,
              lockHash: "0xOVERRIDE... (Admin Locked)",
            }
          : b
      )
    );
    setShowOverrideModal(false);
    setSelectedBooking(null);
    setOverrideReason("");
  };

  const filteredBookings = bookings.filter((b) => {
    if (filter === "ALL") return true;
    return b.status === filter;
  });

  return (
    <div>
      {/* ── Page Header ────────────────────────────────────────────────────── */}
      <div style={s.headerRow}>
        <div>
          <h1 style={s.pageTitle}>Bookings & Approvals</h1>
          <p style={s.pageSub}>
            Global reservation lifecycle, conflict resolution, and priority override controls (FR-RES-02, 04, 07).
          </p>
        </div>

        <button onClick={() => setShowLockModal(true)} style={s.btnSecondary}>
          🔒 Inspect Concurrency Lock Engine
        </button>
      </div>

      {/* ── Metric Stat Cards ────────────────────────────────────────────────── */}
      <div style={s.statGrid}>
        <div style={s.statCard}>
          <span style={s.statLabel}>TOTAL RESERVATIONS</span>
          <span style={s.statValue}>{bookings.length}</span>
          <span style={s.statSub}>Across all research tracks</span>
        </div>
        <div style={s.statCard}>
          <span style={s.statLabel}>PENDING APPROVAL</span>
          <span style={s.statValue}>
            {bookings.filter((b) => b.status === "Pending").length}
          </span>
          <span style={s.statSub}>Requires manager action</span>
        </div>
        <div style={s.statCard}>
          <span style={s.statLabel}>CONFIRMED SLOTS</span>
          <span style={s.statValue}>
            {bookings.filter((b) => b.status === "Approved").length}
          </span>
          <span style={s.statSub}>Atomic database locks active</span>
        </div>
        <div style={s.statCard}>
          <span style={s.statLabel}>OVERRIDDEN</span>
          <span style={s.statValue}>
            {bookings.filter((b) => b.status === "Overridden").length}
          </span>
          <span style={s.statSub}>Priority administrative overrides</span>
        </div>
      </div>

      {/* ── Filter Bar ──────────────────────────────────────────────────────── */}
      <div style={s.filterBar}>
        <div style={s.filterGroup}>
          <span style={s.filterLabel}>STATUS:</span>
          {(["ALL", "Pending", "Approved", "Rejected", "Overridden"] as const).map((st) => (
            <button
              key={st}
              onClick={() => setFilter(st)}
              style={filter === st ? s.filterBtnActive : s.filterBtn}
            >
              {st === "ALL" ? "All Bookings" : st}
            </button>
          ))}
        </div>
        <span style={s.countLabel}>{filteredBookings.length} Records</span>
      </div>

      {/* ── Bookings Table Card ─────────────────────────────────────────────── */}
      <div style={s.tableCard}>
        <div style={s.tableHeaderRow}>
          <p style={s.sectionLabel}>GLOBAL LABORATORY BOOKING SCHEDULE</p>
          <span style={{ fontSize: 12, color: "#9e9e9e", marginRight: 20 }}>
            PostgreSQL Concurrency Guard Active
          </span>
        </div>

        <table style={s.table}>
          <thead>
            <tr>
              <th style={s.th}>Resource & Purpose</th>
              <th style={s.th}>Requester & Project</th>
              <th style={s.th}>Scheduled Time Slot</th>
              <th style={s.th}>Duration</th>
              <th style={s.th}>Status</th>
              <th style={s.th}>Lock Hash (FR-RES-07)</th>
              <th style={{ ...s.th, textAlign: "right" }}>Manager Action</th>
            </tr>
          </thead>
          <tbody>
            {filteredBookings.map((b) => (
              <tr key={b.id} style={s.tr}>
                <td style={s.td}>
                  <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                    <strong>{b.resourceName}</strong>
                    <span style={{ fontSize: 11, color: "#616161", maxWidth: 300, lineHeight: 1.3 }}>
                      {b.purpose}
                    </span>
                  </div>
                </td>
                <td style={s.td}>
                  <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                    <span>{b.requester}</span>
                    <span style={s.badgeProject}>{b.project}</span>
                  </div>
                </td>
                <td style={s.td}>
                  <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                    <strong>{b.date}</strong>
                    <span style={{ fontSize: 11, color: "#9e9e9e" }}>{b.timeSlot}</span>
                  </div>
                </td>
                <td style={{ ...s.td, color: "#616161" }}>{b.durationHours} hrs</td>
                <td style={s.td}>
                  <span
                    style={{
                      ...s.badge,
                      ...(b.status === "Approved"
                        ? s.badgeApproved
                        : b.status === "Pending"
                        ? s.badgePending
                        : b.status === "Overridden"
                        ? s.badgeOverride
                        : s.badgeRejected),
                    }}
                  >
                    {b.status}
                  </span>
                </td>
                <td style={{ ...s.td, fontFamily: "monospace", fontSize: 11, color: "#9e9e9e" }}>
                  {b.lockHash}
                </td>
                <td style={{ ...s.td, textAlign: "right" }}>
                  {b.status === "Pending" ? (
                    <div style={{ display: "flex", gap: 6, justifyContent: "flex-end" }}>
                      <button onClick={() => handleApprove(b.id)} style={s.btnApprove}>
                        Approve
                      </button>
                      <button onClick={() => handleReject(b.id)} style={s.btnReject}>
                        Reject
                      </button>
                      <button
                        onClick={() => {
                          setSelectedBooking(b);
                          setShowOverrideModal(true);
                        }}
                        style={s.btnOverride}
                      >
                        ⚡ Override
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => {
                        setSelectedBooking(b);
                        setShowOverrideModal(true);
                      }}
                      style={s.btnOverrideSmall}
                    >
                      ⚡ Override Slot
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* ── Manager Override Modal (FR-RES-04) ───────────────────────────────── */}
      {showOverrideModal && selectedBooking && (
        <div style={m.overlay}>
          <div style={m.modal}>
            <div style={m.header}>
              <div>
                <h3 style={m.title}>Administrative Booking Override</h3>
                <p style={m.sub}>Reassign slot or enforce priority laboratory maintenance (FR-RES-04).</p>
              </div>
              <button onClick={() => setShowOverrideModal(false)} style={m.closeBtn}>✕</button>
            </div>

            <form onSubmit={handleOverrideSubmit} style={m.body}>
              <div style={m.infoBox}>
                <p style={{ fontSize: 12, margin: 0, color: "#424242" }}>
                  Asset: <strong>{selectedBooking.resourceName}</strong>
                </p>
                <p style={{ fontSize: 12, margin: "4px 0 0", color: "#424242" }}>
                  Current Slot: {selectedBooking.date} • {selectedBooking.timeSlot} ({selectedBooking.requester})
                </p>
              </div>

              <div style={m.field}>
                <label style={m.label}>OVERRIDE REASON / NEW ALLOCATION *</label>
                <textarea
                  required
                  rows={3}
                  placeholder="State operational reason, emergency priority run, or maintenance conflict..."
                  value={overrideReason}
                  onChange={(e) => setOverrideReason(e.target.value)}
                  style={m.textarea}
                />
              </div>

              <div style={m.footer}>
                <button
                  type="button"
                  onClick={() => setShowOverrideModal(false)}
                  style={m.btnSecondary}
                >
                  Cancel
                </button>
                <button type="submit" style={m.btnOverrideSubmit}>
                  Enforce Override
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Concurrency Engine Inspection Modal (FR-RES-07) ─────────────────── */}
      {showLockModal && (
        <div style={m.overlay}>
          <div style={m.modalLarge}>
            <div style={m.header}>
              <div>
                <h3 style={m.title}>PostgreSQL Concurrency Lock Engine (FR-RES-07)</h3>
                <p style={m.sub}>Database-level atomic row lock telemetry and zero-conflict validation.</p>
              </div>
              <button onClick={() => setShowLockModal(false)} style={m.closeBtn}>✕</button>
            </div>

            <div style={m.body}>
              <div style={m.lockBox}>
                <p style={{ fontSize: 13, fontWeight: 700, color: "#2e7d32", margin: 0 }}>
                  🔒 Lock Algorithm: SELECT ... FOR UPDATE (PostgreSQL Atomic Row Lock)
                </p>
                <p style={{ fontSize: 12, color: "#424242", marginTop: 4, lineHeight: 1.5 }}>
                  When a researcher submits a booking request, Spring Boot acquires a row lock on the asset for the time interval. Overlapping concurrent attempts are rejected in <strong>&lt; 500ms</strong> with an intuitive &quot;Time Slot Already Booked&quot; message (NFR-PERF-02, NFR-USE-03).
                </p>
              </div>

              <div style={m.field}>
                <label style={m.label}>ACTIVE ROW LOCK ASSERTIONS</label>
                <div style={m.codeBox}>
                  <code>
                    SELECT COUNT(*) FROM resource_booking WHERE resource_id = &apos;AST-101&apos; AND status = &apos;APPROVED&apos; AND (start_time &lt; &apos;18:00&apos; AND end_time &gt; &apos;14:00&apos;);
                    <br />
                    -- Conflict detected: 0 (Atomic lock granted)
                  </code>
                </div>
              </div>
            </div>

            <div style={m.footer}>
              <button onClick={() => setShowLockModal(false)} style={m.btnSecondary}>
                Close
              </button>
            </div>
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
  btnSecondary: { background: "#ffffff", color: "#424242", border: "1px solid #d0d0d0", borderRadius: 4, padding: "8px 14px", fontSize: 13, fontWeight: 500, cursor: "pointer" },
  statGrid: { display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16, marginBottom: 32 },
  statCard: { background: "#ffffff", border: "1px solid #e0e0e0", borderRadius: 6, padding: "18px 20px 20px", display: "flex", flexDirection: "column", gap: 6 },
  statLabel: { fontSize: 11, fontWeight: 600, color: "#9e9e9e", letterSpacing: "0.5px", textTransform: "uppercase" as const },
  statValue: { fontSize: 32, fontWeight: 700, color: "#161616", letterSpacing: "-1px", lineHeight: 1.1 },
  statSub: { fontSize: 12, color: "#9e9e9e" },
  filterBar: {
    background: "#ffffff",
    border: "1px solid #e0e0e0",
    borderRadius: 6,
    padding: "12px 18px",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 20,
  },
  filterGroup: { display: "flex", alignItems: "center", gap: 8 },
  filterLabel: { fontSize: 11, fontWeight: 600, color: "#9e9e9e", letterSpacing: "0.5px", marginRight: 4 },
  filterBtn: { background: "transparent", border: "1px solid #d0d0d0", borderRadius: 4, padding: "5px 12px", fontSize: 12, fontWeight: 500, color: "#616161", cursor: "pointer" },
  filterBtnActive: { background: "#161616", border: "1px solid #161616", borderRadius: 4, padding: "5px 12px", fontSize: 12, fontWeight: 600, color: "#ffffff", cursor: "pointer" },
  countLabel: { fontSize: 12, color: "#9e9e9e", fontWeight: 500 },
  tableCard: { background: "#ffffff", border: "1px solid #e0e0e0", borderRadius: 6, overflow: "hidden" },
  tableHeaderRow: { display: "flex", alignItems: "center", justifyContent: "space-between", borderBottom: "1px solid #eeeeee", background: "#fafafa" },
  sectionLabel: { fontSize: 11, fontWeight: 600, color: "#9e9e9e", letterSpacing: "0.6px", textTransform: "uppercase" as const, padding: "14px 20px 4px", margin: 0 },
  table: { width: "100%", borderCollapse: "collapse" as const, fontSize: 13 },
  th: { textAlign: "left" as const, padding: "10px 16px", fontSize: 12, fontWeight: 500, color: "#9e9e9e", borderBottom: "1px solid #eeeeee", background: "#fafafa" },
  tr: { borderBottom: "1px solid #f0f0f0" },
  td: { padding: "12px 16px", color: "#161616", fontSize: 13, verticalAlign: "middle" as const },
  badge: { fontSize: 11, fontWeight: 600, padding: "3px 10px", borderRadius: 4, whiteSpace: "nowrap" as const, display: "inline-block" },
  badgeApproved: { background: "#161616", color: "#ffffff" },
  badgePending: { background: "#fff8e1", color: "#f57f17", border: "1px solid #ffe082" },
  badgeOverride: { background: "#eff6ff", color: "#1d4ed8", border: "1px solid #bfdbfe" },
  badgeRejected: { background: "#fee2e2", color: "#dc2626", border: "1px solid #fca5a5" },
  badgeProject: { fontSize: 10, background: "#f5f5f5", border: "1px solid #e0e0e0", borderRadius: 3, padding: "1px 5px", color: "#616161", whiteSpace: "nowrap" as const, display: "inline-block" },
  btnApprove: { background: "#161616", color: "#ffffff", border: "none", borderRadius: 4, padding: "5px 10px", fontSize: 11, fontWeight: 600, cursor: "pointer", whiteSpace: "nowrap" as const },
  btnReject: { background: "transparent", color: "#d32f2f", border: "1px solid #ffcdd2", borderRadius: 4, padding: "5px 8px", fontSize: 11, fontWeight: 500, cursor: "pointer", whiteSpace: "nowrap" as const },
  btnOverride: { background: "#eff6ff", color: "#1d4ed8", border: "1px solid #bfdbfe", borderRadius: 4, padding: "5px 8px", fontSize: 11, fontWeight: 600, cursor: "pointer", whiteSpace: "nowrap" as const },
  btnOverrideSmall: { background: "transparent", color: "#1d4ed8", border: "1px solid #bfdbfe", borderRadius: 4, padding: "4px 8px", fontSize: 11, fontWeight: 500, cursor: "pointer", whiteSpace: "nowrap" as const },
};

const m: Record<string, React.CSSProperties> = {
  overlay: { position: "fixed" as const, inset: 0, background: "rgba(0, 0, 0, 0.4)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 100, padding: 20 },
  modal: { background: "#ffffff", border: "1px solid #e0e0e0", borderRadius: 6, width: "100%", maxWidth: 540, boxShadow: "0 10px 25px rgba(0, 0, 0, 0.1)" },
  modalLarge: { background: "#ffffff", border: "1px solid #e0e0e0", borderRadius: 6, width: "100%", maxWidth: 650, boxShadow: "0 10px 25px rgba(0, 0, 0, 0.1)" },
  header: { padding: "18px 24px", borderBottom: "1px solid #eeeeee", display: "flex", alignItems: "flex-start", justifyContent: "space-between", background: "#fafafa" },
  title: { fontSize: 16, fontWeight: 700, color: "#161616", margin: 0 },
  sub: { fontSize: 12, color: "#9e9e9e", marginTop: 4 },
  closeBtn: { background: "none", border: "none", fontSize: 15, color: "#9e9e9e", cursor: "pointer" },
  body: { padding: "20px 24px", display: "flex", flexDirection: "column", gap: 14 },
  infoBox: { background: "#f8fafc", border: "1px solid #e2e8f0", padding: "12px 14px", borderRadius: 4 },
  lockBox: { background: "#f0fdf4", border: "1px solid #bbf7d0", padding: "14px 16px", borderRadius: 4 },
  codeBox: { background: "#1c1c1c", color: "#4ade80", padding: "12px 14px", borderRadius: 4, fontFamily: "monospace", fontSize: 12 },
  field: { display: "flex", flexDirection: "column", gap: 6 },
  label: { fontSize: 11, fontWeight: 600, color: "#9e9e9e", letterSpacing: "0.5px" },
  textarea: { padding: "8px 12px", fontSize: 13, border: "1px solid #d0d0d0", borderRadius: 4, outline: "none", resize: "none" },
  footer: { padding: "14px 24px", borderTop: "1px solid #eeeeee", background: "#fafafa", display: "flex", justifyContent: "space-between", alignItems: "center" },
  btnOverrideSubmit: { padding: "8px 16px", background: "#1d4ed8", color: "#ffffff", border: "none", borderRadius: 4, fontSize: 13, fontWeight: 600, cursor: "pointer" },
  btnSecondary: { padding: "8px 14px", background: "#ffffff", color: "#424242", border: "1px solid #d0d0d0", borderRadius: 4, fontSize: 13, fontWeight: 500, cursor: "pointer" },
};
