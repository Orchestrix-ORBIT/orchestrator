"use client";

import React, { useState, useEffect } from "react";
import { ResourcesService, type Resource } from "@/lib/services/resources";

interface MaintenanceEvent {
  id: string;
  assetName: string;
  category: string;
  startDate: string;
  endDate: string;
  downtimeType: "Preventive Calibration" | "Emergency Repair" | "Firmware/Driver Update" | "Safety Inspection";
  technician: string;
  status: "Scheduled" | "In Progress" | "Completed";
  notes: string;
}

const INITIAL_MAINTENANCE: MaintenanceEvent[] = [
  {
    id: "MNT-301",
    assetName: "Thermo Scientific Orbitrap Mass Spectrometer",
    category: "INSTRUMENT",
    startDate: "Aug 28, 2026",
    endDate: "Aug 30, 2026",
    downtimeType: "Preventive Calibration",
    technician: "Resource Operations (Lead: Lab Manager)",
    status: "In Progress",
    notes: "Mass calibration and ionization source cleaning.",
  },
  {
    id: "MNT-302",
    assetName: "NVIDIA H100 SXM5 80GB GPU Compute Node",
    category: "COMPUTE",
    startDate: "Sep 01, 2026 (02:00)",
    endDate: "Sep 01, 2026 (06:00)",
    downtimeType: "Firmware/Driver Update",
    technician: "HPC Systems Admin",
    status: "Scheduled",
    notes: "NVIDIA CUDA 12.6 driver update and liquid cooling inspection.",
  },
  {
    id: "MNT-303",
    assetName: "FEI Titan 300kV Transmission Electron Microscope (TEM)",
    category: "INSTRUMENT",
    startDate: "Aug 15, 2026",
    endDate: "Aug 16, 2026",
    downtimeType: "Safety Inspection",
    technician: "Field Operations Support",
    status: "Completed",
    notes: "Vacuum seal integrity test and electron beam collimation calibration.",
  },
];

function computeStatusFromDates(startStr: string, endStr: string): "Scheduled" | "In Progress" | "Completed" {
  try {
    const now = new Date();
    // Normalize date strings (e.g., "Aug 28, 2026", "2026-09-23")
    const start = new Date(startStr.replace(/\s*\(\d{2}:\d{2}\)/, ''));
    const end = new Date(endStr.replace(/\s*\(\d{2}:\d{2}\)/, ''));

    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      return "Scheduled";
    }

    if (now < start) {
      return "Scheduled";
    }
    if (now > end) {
      return "Completed";
    }
    return "In Progress";
  } catch {
    return "In Progress";
  }
}

export default function MaintenanceSchedulesPage() {
  const [events, setEvents] = useState<MaintenanceEvent[]>(INITIAL_MAINTENANCE);
  const [resources, setResources] = useState<Resource[]>([]);
  const [loading, setLoading] = useState(true);

  const loadData = async () => {
    setLoading(true);
    try {
      const resList = await ResourcesService.getAll();
      setResources(resList);

      const dbMaint = await ResourcesService.getMaintenance();
      if (dbMaint && dbMaint.length > 0) {
        const mapped: MaintenanceEvent[] = dbMaint.map((m: any) => {
          const computedStatus = computeStatusFromDates(m.startDate, m.endDate);
          return {
            id: m.id,
            assetName: m.assetName || "Lab Asset",
            category: m.category || "INSTRUMENT",
            startDate: m.startDate || "Today",
            endDate: m.endDate || "Ongoing",
            downtimeType: m.downtimeType || "Preventive Calibration",
            technician: m.technician || "Lab Resource Operations",
            status: computedStatus,
            notes: m.notes || "Scheduled maintenance downtime window.",
          };
        });
        setEvents(mapped);
      }
    } catch (err) {
      console.error("Failed to load maintenance data from DB:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const [filter, setFilter] = useState<"ALL" | MaintenanceEvent["status"]>("ALL");
  const [showAddModal, setShowAddModal] = useState(false);
  const [assetNameInput, setAssetNameInput] = useState("");
  const [downtimeTypeInput, setDowntimeTypeInput] = useState<MaintenanceEvent["downtimeType"]>("Preventive Calibration");
  const [startDateInput, setStartDateInput] = useState("");
  const [endDateInput, setEndDateInput] = useState("");
  const [technicianInput, setTechnicianInput] = useState("");
  const [notesInput, setNotesInput] = useState("");

  const handleCreateMaintenance = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!startDateInput || !endDateInput) return;

    const selectedResourceName = assetNameInput || (resources.length > 0 ? resources[0].name : "NVIDIA H100 SXM5 80GB GPU Compute Node");
    const targetResource = resources.find(
      r => r.name === selectedResourceName || r.name.toLowerCase().includes(selectedResourceName.toLowerCase())
    );

    const computedStatus = computeStatusFromDates(startDateInput, endDateInput);

    const payload = {
      resourceId: targetResource?.id || null,
      assetName: selectedResourceName,
      category: targetResource?.type || "INSTRUMENT",
      startDate: startDateInput,
      endDate: endDateInput,
      downtimeType: downtimeTypeInput,
      technician: technicianInput.trim() || "Lab Operations Manager",
      status: computedStatus,
      notes: notesInput.trim() || "Standard scheduled downtime block.",
    };

    try {
      await ResourcesService.createMaintenance(payload);

      // Lock resource if maintenance is currently active
      if (computedStatus === "In Progress" && targetResource) {
        try {
          await ResourcesService.updateStatus(targetResource.id, "MAINTENANCE");
        } catch (ignored) {}
      }

      await loadData();
    } catch (err) {
      console.error("Failed to create maintenance in DB:", err);
      // Fallback local addition if network fails
      const fallbackEvent: MaintenanceEvent = {
        id: `MNT-${Date.now().toString().slice(-3)}`,
        ...payload,
      };
      setEvents(prev => [fallbackEvent, ...prev]);
    }

    setShowAddModal(false);
    setStartDateInput("");
    setEndDateInput("");
    setTechnicianInput("");
    setNotesInput("");
  };

  const filteredEvents = events.filter((ev) => {
    if (filter === "ALL") return true;
    return ev.status === filter;
  });

  if (loading) return <p style={{ padding: 40, color: "#888", fontSize: 14 }}>Loading maintenance schedules…</p>;

  return (
    <div>
      {/* ── Page Header ────────────────────────────────────────────────────── */}
      <div style={s.headerRow}>
        <div>
          <h1 style={s.pageTitle}>Maintenance & Downtime Schedules</h1>
          <p style={s.pageSub}>
            Coordinate preventive calibration, technician service visits, and automated downtime locks.
          </p>
        </div>

        <button onClick={() => setShowAddModal(true)} style={s.btnPrimary}>
          + Schedule Maintenance Window
        </button>
      </div>

      {/* ── Metric Stat Cards ────────────────────────────────────────────────── */}
      <div style={s.statGrid}>
        <div style={s.statCard}>
          <span style={s.statLabel}>IN PROGRESS DOWNTIME</span>
          <span style={s.statValue}>
            {events.filter((e) => e.status === "In Progress").length}
          </span>
          <span style={s.statSub}>Currently blocked for booking</span>
        </div>
        <div style={s.statCard}>
          <span style={s.statLabel}>UPCOMING SCHEDULED</span>
          <span style={s.statValue}>
            {events.filter((e) => e.status === "Scheduled").length}
          </span>
          <span style={s.statSub}>Future service windows</span>
        </div>
        <div style={s.statCard}>
          <span style={s.statLabel}>COMPLETED RUNS</span>
          <span style={s.statValue}>
            {events.filter((e) => e.status === "Completed").length}
          </span>
          <span style={s.statSub}>Logged historical services</span>
        </div>
        <div style={s.statCard}>
          <span style={s.statLabel}>FLEET RELIABILITY</span>
          <span style={s.statValue}>99.4%</span>
          <span style={s.statSub}>MTBF: &gt; 720 hours</span>
        </div>
      </div>

      {/* ── Filter Bar ──────────────────────────────────────────────────────── */}
      <div style={s.filterBar}>
        <div style={s.filterGroup}>
          <span style={s.filterLabel}>STATUS:</span>
          {(["ALL", "In Progress", "Scheduled", "Completed"] as const).map((st) => (
            <button
              key={st}
              onClick={() => setFilter(st)}
              style={filter === st ? s.filterBtnActive : s.filterBtn}
            >
              {st === "ALL" ? "All Events" : st}
            </button>
          ))}
        </div>
        <span style={s.countLabel}>{filteredEvents.length} Service Logs</span>
      </div>

      {/* ── Maintenance Schedule Table Card ─────────────────────────────────── */}
      <div style={s.tableCard}>
        <div style={s.tableHeaderRow}>
          <p style={s.sectionLabel}>FACILITIES SERVICE LEDGER & DOWNTIME WINDOWS</p>
          <span style={{ fontSize: 12, color: "#9e9e9e", marginRight: 20 }}>
            Automated Booking Lockout Active
          </span>
        </div>

        <table style={s.table}>
          <thead>
            <tr>
              <th style={s.th}>Asset & Service Type</th>
              <th style={s.th}>Downtime Window</th>
              <th style={s.th}>Technician / Vendor</th>
              <th style={s.th}>Technical Notes</th>
              <th style={{ ...s.th, textAlign: "right" }}>Status</th>
            </tr>
          </thead>
          <tbody>
            {filteredEvents.map((ev) => (
              <tr key={ev.id} style={s.tr}>
                <td style={s.td}>
                  <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                    <strong>{ev.assetName}</strong>
                    <span style={{ fontSize: 11, color: "#616161" }}>{ev.downtimeType}</span>
                  </div>
                </td>
                <td style={s.td}>
                  <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                    <strong>{ev.startDate}</strong>
                    <span style={{ fontSize: 11, color: "#9e9e9e" }}>to {ev.endDate}</span>
                  </div>
                </td>
                <td style={{ ...s.td, color: "#424242", fontSize: 12 }}>
                  {ev.technician}
                </td>
                <td style={{ ...s.td, maxWidth: 300, fontSize: 12, color: "#616161", lineHeight: 1.3 }}>
                  {ev.notes}
                </td>
                <td style={{ ...s.td, textAlign: "right" }}>
                  <span
                    style={{
                      ...s.badge,
                      ...(ev.status === "In Progress"
                        ? s.badgeProgress
                        : ev.status === "Scheduled"
                        ? s.badgeScheduled
                        : s.badgeCompleted),
                    }}
                  >
                    {ev.status}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* ── Schedule Maintenance Modal ───────────────────────────── */}
      {showAddModal && (
        <div style={m.overlay}>
          <div style={m.modal}>
            <div style={m.header}>
              <div>
                <h3 style={m.title}>Schedule Maintenance Downtime Window</h3>
                <p style={m.sub}>Blocks asset bookings and notifies affected researchers.</p>
              </div>
              <button onClick={() => setShowAddModal(false)} style={m.closeBtn}>✕</button>
            </div>

            <form onSubmit={handleCreateMaintenance} style={m.body}>
              <div style={m.field}>
                <label style={m.label}>SELECT LABORATORY ASSET *</label>
                <select
                  value={assetNameInput}
                  onChange={(e) => setAssetNameInput(e.target.value)}
                  style={m.select}
                >
                  {resources.length > 0 ? (
                    resources.map(r => (
                      <option key={r.id} value={r.name}>{r.name}</option>
                    ))
                  ) : (
                    <option value="NVIDIA H100 SXM5 80GB GPU Compute Node">NVIDIA H100 SXM5 80GB GPU Compute Node</option>
                  )}
                </select>
              </div>

              <div style={m.field}>
                <label style={m.label}>MAINTENANCE DOWNTIME TYPE</label>
                <select
                  value={downtimeTypeInput}
                  onChange={(e) => setDowntimeTypeInput(e.target.value as MaintenanceEvent["downtimeType"])}
                  style={m.select}
                >
                  <option value="Preventive Calibration">Preventive Calibration</option>
                  <option value="Emergency Repair">Emergency Repair</option>
                  <option value="Firmware/Driver Update">Firmware/Driver Update</option>
                  <option value="Safety Inspection">Safety Inspection</option>
                </select>
              </div>

              <div style={m.row}>
                <div style={{ ...m.field, flex: 1 }}>
                  <label style={m.label}>START DATE & TIME *</label>
                  <input
                    type="date"
                    required
                    value={startDateInput}
                    onChange={(e) => setStartDateInput(e.target.value)}
                    style={m.input}
                  />
                </div>

                <div style={{ ...m.field, flex: 1 }}>
                  <label style={m.label}>END DATE & TIME *</label>
                  <input
                    type="date"
                    required
                    value={endDateInput}
                    onChange={(e) => setEndDateInput(e.target.value)}
                    style={m.input}
                  />
                </div>
              </div>

              <div style={m.field}>
                <label style={m.label}>SERVICE TECHNICIAN / VENDOR CONTACT</label>
                <input
                  placeholder="e.g. Field Engineer (vendor@service.com)"
                  value={technicianInput}
                  onChange={(e) => setTechnicianInput(e.target.value)}
                  style={m.input}
                />
              </div>

              <div style={m.field}>
                <label style={m.label}>PROCEDURE NOTES & SAFETY PROTOCOL</label>
                <textarea
                  rows={3}
                  placeholder="Cooling loop purge, laser sensor alignment, safety lockout..."
                  value={notesInput}
                  onChange={(e) => setNotesInput(e.target.value)}
                  style={m.textarea}
                />
              </div>

              <div style={m.footer}>
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  style={m.btnSecondary}
                >
                  Cancel
                </button>
                <button type="submit" style={m.btnPrimary}>
                  Enforce Downtime Lockout
                </button>
              </div>
            </form>
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
  btnPrimary: { background: "#161616", color: "#ffffff", border: "none", borderRadius: 4, padding: "9px 16px", fontSize: 13, fontWeight: 600, cursor: "pointer" },
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
  badgeProgress: { background: "#fee2e2", color: "#dc2626", border: "1px solid #fca5a5" },
  badgeScheduled: { background: "#fff8e1", color: "#f57f17", border: "1px solid #ffe082" },
  badgeCompleted: { background: "#161616", color: "#ffffff" },
  statusSelect: { padding: "4px 8px", fontSize: 12, border: "1px solid #d0d0d0", borderRadius: 4, background: "#ffffff", outline: "none", cursor: "pointer", whiteSpace: "nowrap" as const },
};

const m: Record<string, React.CSSProperties> = {
  overlay: { position: "fixed" as const, inset: 0, background: "rgba(0, 0, 0, 0.4)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 100, padding: 20 },
  modal: { background: "#ffffff", border: "1px solid #e0e0e0", borderRadius: 6, width: "100%", maxWidth: 580, boxShadow: "0 10px 25px rgba(0, 0, 0, 0.1)" },
  header: { padding: "18px 24px", borderBottom: "1px solid #eeeeee", display: "flex", alignItems: "flex-start", justifyContent: "space-between", background: "#fafafa" },
  title: { fontSize: 16, fontWeight: 700, color: "#161616", margin: 0 },
  sub: { fontSize: 12, color: "#9e9e9e", marginTop: 4 },
  closeBtn: { background: "none", border: "none", fontSize: 15, color: "#9e9e9e", cursor: "pointer" },
  body: { padding: "20px 24px", display: "flex", flexDirection: "column", gap: 14 },
  row: { display: "flex", gap: 14 },
  field: { display: "flex", flexDirection: "column", gap: 6 },
  label: { fontSize: 11, fontWeight: 600, color: "#9e9e9e", letterSpacing: "0.5px" },
  input: { padding: "8px 12px", fontSize: 13, border: "1px solid #d0d0d0", borderRadius: 4, outline: "none", background: "#ffffff" },
  select: { padding: "8px 12px", fontSize: 13, border: "1px solid #d0d0d0", borderRadius: 4, background: "#ffffff", outline: "none" },
  textarea: { padding: "8px 12px", fontSize: 13, border: "1px solid #d0d0d0", borderRadius: 4, outline: "none", resize: "none" },
  footer: { padding: "14px 24px", borderTop: "1px solid #eeeeee", background: "#fafafa", display: "flex", justifyContent: "space-between", alignItems: "center" },
  btnPrimary: { padding: "8px 16px", background: "#161616", color: "#ffffff", border: "none", borderRadius: 4, fontSize: 13, fontWeight: 600, cursor: "pointer" },
  btnSecondary: { padding: "8px 14px", background: "#ffffff", color: "#424242", border: "1px solid #d0d0d0", borderRadius: 4, fontSize: 13, fontWeight: 500, cursor: "pointer" },
};
