"use client";

import React, { useState } from "react";

interface ResourceItem {
  id: string;
  name: string;
  type: string;
  status: "In Use" | "Reserved" | "Available" | "Under Maintenance";
  bookedBy: string;
  project: string;
  availableSlot: string;
}

const INITIAL_RESOURCES: ResourceItem[] = [
  { id: "1", name: "GPU Lab Workstation 3", type: "NVIDIA A100 80GB", status: "In Use", bookedBy: "Dr. Aris", project: "Project Alpha Core", availableSlot: "Today, 18:00 - 22:00" },
  { id: "2", name: "Electron Microscope Suite", type: "Cryo-EM Node 1", status: "Reserved", bookedBy: "Chalani K.", project: "Material Sci Group", availableSlot: "Tomorrow, 09:00 - 13:00" },
  { id: "3", name: "Quantum Sim Cluster 02", type: "Qiskit IBM Backend", status: "Available", bookedBy: "-", project: "-", availableSlot: "Available Now" },
  { id: "4", name: "Spectroscopy Lab Unit B", type: "Mass Spectrometer", status: "Available", bookedBy: "-", project: "-", availableSlot: "Available Now" },
  { id: "5", name: "PostgreSQL Multi-Tenant Sidecar", type: "Single-Tenant DB", status: "In Use", bookedBy: "Dinuka K.", project: "System Core", availableSlot: "Dedicated" },
];

export default function ResourcesPage() {
  const [resources, setResources] = useState<ResourceItem[]>(INITIAL_RESOURCES);
  const [showBookingModal, setShowBookingModal] = useState(false);
  const [selectedResource, setSelectedResource] = useState<string>("3"); // default to Quantum Sim
  const [selectedProject, setSelectedProject] = useState<string>("Project Alpha Core");
  const [dateInput, setDateInput] = useState("2026-08-22");
  const [timeSlotInput, setTimeSlotInput] = useState("14:00 - 17:00 (3 Hours)");
  const [bookingSuccess, setBookingSuccess] = useState(false);

  const handleBookingSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setResources((prev) =>
      prev.map((r) =>
        r.id === selectedResource
          ? {
              ...r,
              status: "Reserved",
              bookedBy: "Dinuka K. (Lead)",
              project: selectedProject,
              availableSlot: `${dateInput}, ${timeSlotInput}`,
            }
          : r
      )
    );
    setBookingSuccess(true);
    setTimeout(() => {
      setBookingSuccess(false);
      setShowBookingModal(false);
    }, 1200);
  };

  const openBookingFor = (resourceId: string) => {
    setSelectedResource(resourceId);
    setShowBookingModal(true);
  };

  return (
    <div>
      {/* ── Page Header ────────────────────────────────────────────────────── */}
      <div style={s.headerRow}>
        <div>
          <h1 style={s.pageTitle}>Resources & Compute</h1>
          <p style={s.pageSub}>
            Shared laboratory assets, GPU compute clusters, and equipment booking schedules (FR-RES-01, FR-RES-06).
          </p>
        </div>

        <button
          id="btn-request-resource"
          onClick={() => setShowBookingModal(true)}
          style={s.btnPrimary}
        >
          + Request Resource Booking
        </button>
      </div>

      {/* ── Metric Stat Cards ────────────────────────────────────────────────── */}
      <div style={s.statGrid}>
        <div style={s.statCard}>
          <span style={s.statLabel}>TOTAL ASSETS</span>
          <span style={s.statValue}>{resources.length}</span>
          <span style={s.statSub}>Managed hardware & nodes</span>
        </div>
        <div style={s.statCard}>
          <span style={s.statLabel}>GPU UTILIZATION</span>
          <span style={s.statValue}>84%</span>
          <span style={s.statSub}>Active quantum simulations</span>
        </div>
        <div style={s.statCard}>
          <span style={s.statLabel}>YOUR ACTIVE BOOKINGS</span>
          <span style={s.statValue}>
            {resources.filter((r) => r.bookedBy.includes("Dinuka")).length}
          </span>
          <span style={s.statSub}>Lead reservations</span>
        </div>
        <div style={s.statCard}>
          <span style={s.statLabel}>CONCURRENCY LOCK</span>
          <span style={s.statValue}>ACTIVE</span>
          <span style={s.statSub}>Zero double-booking SLA</span>
        </div>
      </div>

      {/* ── Resources Table Card ────────────────────────────────────────────── */}
      <div style={s.tableCard}>
        <div style={s.tableHeaderRow}>
          <p style={s.sectionLabel}>LAB HARDWARE & SHARED ASSETS ROSTER</p>
          <span style={{ fontSize: 12, color: "#9e9e9e", marginRight: 16 }}>
            {resources.filter((r) => r.status === "Available").length} Available for Booking
          </span>
        </div>

        <table style={s.table}>
          <thead>
            <tr>
              <th style={s.th}>Resource Name</th>
              <th style={s.th}>Specification / Type</th>
              <th style={s.th}>Next Available Slot</th>
              <th style={s.th}>Current Allocation</th>
              <th style={s.th}>Status</th>
              <th style={{ ...s.th, textAlign: "right" }}>Action</th>
            </tr>
          </thead>
          <tbody>
            {resources.map((r) => (
              <tr key={r.id} style={s.tr}>
                <td style={s.td}>
                  <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                    <strong>{r.name}</strong>
                    <span style={{ fontSize: 11, color: "#9e9e9e" }}>ID: RES-0{r.id}</span>
                  </div>
                </td>
                <td style={{ ...s.td, color: "#616161" }}>{r.type}</td>
                <td style={{ ...s.td, color: "#161616", fontSize: 12 }}>{r.availableSlot}</td>
                <td style={s.td}>
                  {r.project !== "-" ? (
                    <div style={{ display: "flex", flexDirection: "column", gap: 1 }}>
                      <span style={{ fontWeight: 500 }}>{r.bookedBy}</span>
                      <span style={{ fontSize: 11, color: "#9e9e9e" }}>{r.project}</span>
                    </div>
                  ) : (
                    <span style={{ color: "#9e9e9e" }}>—</span>
                  )}
                </td>
                <td style={s.td}>
                  <span
                    style={{
                      ...s.badge,
                      ...(r.status === "In Use"
                        ? s.badgeActive
                        : r.status === "Reserved"
                        ? s.badgeReserved
                        : s.badgeAvailable),
                    }}
                  >
                    {r.status}
                  </span>
                </td>
                <td style={{ ...s.td, textAlign: "right" }}>
                  {r.status === "Available" ? (
                    <button
                      onClick={() => openBookingFor(r.id)}
                      style={s.btnBookNow}
                    >
                      Book Slot
                    </button>
                  ) : r.bookedBy.includes("Dinuka") ? (
                    <span style={{ fontSize: 12, color: "#2e7d32", fontWeight: 600 }}>
                      Your Booking
                    </span>
                  ) : (
                    <button
                      onClick={() => openBookingFor(r.id)}
                      style={s.btnWaitlist}
                    >
                      Reserve Next
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* ── Booking Request Modal ────────────────────────────────────────────── */}
      {showBookingModal && (
        <div style={m.overlay}>
          <div style={m.modal}>
            <div style={m.header}>
              <div>
                <h3 style={m.title}>Request Resource Booking</h3>
                <p style={m.sub}>Reserve laboratory hardware with strict concurrency lock protection (FR-RES-06).</p>
              </div>
              <button onClick={() => setShowBookingModal(false)} style={m.closeBtn}>✕</button>
            </div>

            {bookingSuccess ? (
              <div style={{ padding: "36px 24px", textAlign: "center" }}>
                <span style={{ fontSize: 28 }}>✓</span>
                <h4 style={{ fontSize: 16, fontWeight: 700, color: "#161616", marginTop: 8 }}>
                  Booking Request Confirmed!
                </h4>
                <p style={{ fontSize: 13, color: "#616161", marginTop: 4 }}>
                  Resource locked and registered to your project ledger.
                </p>
              </div>
            ) : (
              <form onSubmit={handleBookingSubmit} style={m.body}>
                <div style={m.field}>
                  <label style={m.label}>SELECT RESOURCE *</label>
                  <select
                    value={selectedResource}
                    onChange={(e) => setSelectedResource(e.target.value)}
                    style={m.select}
                  >
                    {resources.map((r) => (
                      <option key={r.id} value={r.id}>
                        {r.name} ({r.type}) — {r.status}
                      </option>
                    ))}
                  </select>
                </div>

                <div style={m.field}>
                  <label style={m.label}>TARGET RESEARCH PROJECT *</label>
                  <select
                    value={selectedProject}
                    onChange={(e) => setSelectedProject(e.target.value)}
                    style={m.select}
                  >
                    <option value="Project Alpha Core">Project Alpha Core</option>
                    <option value="Nexus Protocol">Nexus Protocol</option>
                    <option value="System Core Architecture">System Core Architecture</option>
                  </select>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                  <div style={m.field}>
                    <label style={m.label}>RESERVATION DATE</label>
                    <input
                      type="date"
                      value={dateInput}
                      onChange={(e) => setDateInput(e.target.value)}
                      style={m.input}
                    />
                  </div>

                  <div style={m.field}>
                    <label style={m.label}>TIME SLOT & DURATION</label>
                    <select
                      value={timeSlotInput}
                      onChange={(e) => setTimeSlotInput(e.target.value)}
                      style={m.select}
                    >
                      <option value="09:00 - 12:00 (3 Hours)">09:00 - 12:00 (3h)</option>
                      <option value="14:00 - 17:00 (3 Hours)">14:00 - 17:00 (3h)</option>
                      <option value="18:00 - 22:00 (4 Hours)">18:00 - 22:00 (4h)</option>
                      <option value="Full Day (08:00 - 20:00)">Full Day (12h)</option>
                    </select>
                  </div>
                </div>

                <div style={{ background: "#f5f5f5", padding: "10px 14px", borderRadius: 4, fontSize: 12, color: "#616161" }}>
                  🔒 <strong>Zero Double-Booking Guarantee</strong>: Database-level row locking resolves concurrent requests in &lt;500ms.
                </div>

                <div style={m.footer}>
                  <button
                    type="button"
                    onClick={() => setShowBookingModal(false)}
                    style={m.btnSecondary}
                  >
                    Cancel
                  </button>
                  <button type="submit" style={m.btnPrimary}>
                    Confirm Reservation
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

const s: Record<string, React.CSSProperties> = {
  headerRow: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-end",
    marginBottom: 24,
  },
  pageTitle: {
    fontSize: 28,
    fontWeight: 700,
    color: "#161616",
    letterSpacing: "-0.5px",
    marginBottom: 4,
  },
  pageSub: {
    fontSize: 13,
    color: "#9e9e9e",
  },
  btnPrimary: {
    background: "#161616",
    color: "#ffffff",
    border: "none",
    borderRadius: 4,
    padding: "9px 16px",
    fontSize: 13,
    fontWeight: 600,
    cursor: "pointer",
  },
  statGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(4, 1fr)",
    gap: 16,
    marginBottom: 32,
  },
  statCard: {
    background: "#ffffff",
    border: "1px solid #e0e0e0",
    borderRadius: 6,
    padding: "18px 20px 20px",
    display: "flex",
    flexDirection: "column",
    gap: 6,
  },
  statLabel: {
    fontSize: 11,
    fontWeight: 600,
    color: "#9e9e9e",
    letterSpacing: "0.5px",
    textTransform: "uppercase" as const,
  },
  statValue: {
    fontSize: 32,
    fontWeight: 700,
    color: "#161616",
    letterSpacing: "-1px",
    lineHeight: 1.1,
  },
  statSub: {
    fontSize: 12,
    color: "#9e9e9e",
  },
  tableCard: {
    background: "#ffffff",
    border: "1px solid #e0e0e0",
    borderRadius: 6,
    overflow: "hidden",
  },
  tableHeaderRow: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
  },
  sectionLabel: {
    fontSize: 11,
    fontWeight: 600,
    color: "#9e9e9e",
    letterSpacing: "0.6px",
    textTransform: "uppercase" as const,
    padding: "16px 20px 12px",
  },
  table: {
    width: "100%",
    borderCollapse: "collapse" as const,
    fontSize: 13,
  },
  th: {
    textAlign: "left" as const,
    padding: "8px 16px",
    fontSize: 12,
    fontWeight: 500,
    color: "#9e9e9e",
    borderBottom: "1px solid #eeeeee",
    borderTop: "1px solid #eeeeee",
    background: "#fafafa",
  },
  tr: {
    borderBottom: "1px solid #f0f0f0",
  },
  td: {
    padding: "12px 16px",
    color: "#161616",
    fontSize: 13,
    verticalAlign: "middle" as const,
  },
  badge: {
    fontSize: 11,
    fontWeight: 600,
    padding: "3px 8px",
    borderRadius: 4,
  },
  badgeActive: {
    background: "#161616",
    color: "#ffffff",
  },
  badgeReserved: {
    background: "#fff8e1",
    color: "#f57f17",
    border: "1px solid #ffe082",
  },
  badgeAvailable: {
    background: "#e8f5e9",
    color: "#2e7d32",
    border: "1px solid #c8e6c9",
  },
  btnBookNow: {
    padding: "5px 12px",
    background: "#161616",
    color: "#ffffff",
    border: "none",
    borderRadius: 4,
    fontSize: 12,
    fontWeight: 600,
    cursor: "pointer",
  },
  btnWaitlist: {
    padding: "5px 10px",
    background: "transparent",
    color: "#616161",
    border: "1px solid #d0d0d0",
    borderRadius: 4,
    fontSize: 12,
    cursor: "pointer",
  },
};

const m: Record<string, React.CSSProperties> = {
  overlay: {
    position: "fixed" as const,
    inset: 0,
    background: "rgba(0, 0, 0, 0.4)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 100,
    padding: 20,
  },
  modal: {
    background: "#ffffff",
    border: "1px solid #e0e0e0",
    borderRadius: 6,
    width: "100%",
    maxWidth: 520,
    boxShadow: "0 10px 25px rgba(0, 0, 0, 0.1)",
  },
  header: {
    padding: "18px 24px",
    borderBottom: "1px solid #eeeeee",
    display: "flex",
    alignItems: "flex-start",
    justifyContent: "space-between",
  },
  title: {
    fontSize: 16,
    fontWeight: 700,
    color: "#161616",
  },
  sub: {
    fontSize: 12,
    color: "#9e9e9e",
    marginTop: 2,
  },
  closeBtn: {
    background: "none",
    border: "none",
    fontSize: 15,
    color: "#9e9e9e",
    cursor: "pointer",
  },
  body: {
    padding: "20px 24px",
    display: "flex",
    flexDirection: "column",
    gap: 14,
  },
  field: {
    display: "flex",
    flexDirection: "column",
    gap: 6,
  },
  label: {
    fontSize: 11,
    fontWeight: 600,
    color: "#9e9e9e",
    letterSpacing: "0.5px",
  },
  input: {
    padding: "8px 12px",
    fontSize: 13,
    border: "1px solid #d0d0d0",
    borderRadius: 4,
    outline: "none",
    background: "#ffffff",
  },
  select: {
    padding: "8px 12px",
    fontSize: 13,
    border: "1px solid #d0d0d0",
    borderRadius: 4,
    background: "#ffffff",
    outline: "none",
  },
  footer: {
    display: "flex",
    justifyContent: "flex-end",
    gap: 8,
    paddingTop: 10,
  },
  btnPrimary: {
    padding: "8px 16px",
    background: "#161616",
    color: "#ffffff",
    border: "none",
    borderRadius: 4,
    fontSize: 13,
    fontWeight: 600,
    cursor: "pointer",
  },
  btnSecondary: {
    padding: "8px 14px",
    background: "#ffffff",
    color: "#424242",
    border: "1px solid #d0d0d0",
    borderRadius: 4,
    fontSize: 13,
    fontWeight: 500,
    cursor: "pointer",
  },
};
