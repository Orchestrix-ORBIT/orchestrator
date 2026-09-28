"use client";

import React, { useState, useEffect } from "react";
import { ResourcesService, type Resource } from "@/lib/services/resources";

interface MaintenanceEvent {
  id: string;
  resourceId?: string;
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
    status: "Completed",
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
    status: "Completed",
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

    const cleanStart = (startStr || "").replace(/\s*\(\d{2}:\d{2}\)/, '').trim();
    const cleanEnd = (endStr || "").replace(/\s*\(\d{2}:\d{2}\)/, '').trim();

    let start = new Date(cleanStart);
    let end = new Date(cleanEnd);

    if (isNaN(start.getTime())) start = new Date(startStr);
    if (isNaN(end.getTime())) end = new Date(endStr);

    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      return "Scheduled";
    }

    // Set end-of-day if no explicit time is specified
    if (!cleanEnd.includes(":") && !endStr.includes("T")) {
      end.setHours(23, 59, 59, 999);
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

function formatDisplayDate(dateStr: string): string {
  if (!dateStr) return "—";
  try {
    const clean = dateStr.replace(/\s*\(\d{2}:\d{2}\)/, '').trim();
    if (/^\d{4}-\d{2}-\d{2}/.test(clean)) {
      const d = new Date(clean);
      if (!isNaN(d.getTime())) {
        const hasTime = clean.includes("T") || clean.includes(":");
        return d.toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
          year: "numeric",
          ...(hasTime ? { hour: "numeric", minute: "2-digit" } : {}),
        });
      }
    }
  } catch (ignored) {}
  return dateStr;
}

function toDatetimeLocalValue(dateStr: string): string {
  if (!dateStr) return "";
  const clean = dateStr.replace(/\s*\(\d{2}:\d{2}\)/, '').trim();
  if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(clean)) {
    return clean.slice(0, 16);
  }
  if (/^\d{4}-\d{2}-\d{2}$/.test(clean)) {
    return `${clean}T09:00`;
  }
  try {
    const d = new Date(clean);
    if (!isNaN(d.getTime())) {
      const pad = (n: number) => String(n).padStart(2, "0");
      const year = d.getFullYear();
      const month = pad(d.getMonth() + 1);
      const day = pad(d.getDate());
      const hours = pad(d.getHours());
      const mins = pad(d.getMinutes());
      return `${year}-${month}-${day}T${hours}:${mins}`;
    }
  } catch (ignored) {}
  const now = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}T${pad(now.getHours())}:${pad(now.getMinutes())}`;
}
function checkMaintenanceConflict(
  assetName: string,
  resourceId: string | null | undefined,
  newStartStr: string,
  newEndStr: string,
  allEvents: MaintenanceEvent[],
  excludeEventId?: string
): string | null {
  const newStart = new Date(newStartStr).getTime();
  const newEnd = new Date(newEndStr).getTime();

  if (isNaN(newStart) || isNaN(newEnd)) {
    return "Please specify valid start and end dates.";
  }
  if (newEnd <= newStart) {
    return "End date & time must be strictly after the start date & time.";
  }

  for (const ev of allEvents) {
    if (excludeEventId && ev.id === excludeEventId) continue;
    if (ev.status === "Completed") continue;

    const isSame = (resourceId && ev.resourceId === resourceId) ||
      ev.assetName.toLowerCase().trim() === assetName.toLowerCase().trim();

    if (isSame) {
      const newStatus = computeStatusFromDates(newStartStr, newEndStr);
      if (ev.status === "In Progress" && newStatus === "In Progress") {
        return `Asset "${assetName}" already has an active maintenance downtime in progress (${ev.downtimeType}).`;
      }

      const cleanEvStart = (ev.startDate || "").replace(/\s*\(\d{2}:\d{2}\)/, '').trim();
      const cleanEvEnd = (ev.endDate || "").replace(/\s*\(\d{2}:\d{2}\)/, '').trim();
      let evStart = new Date(cleanEvStart).getTime();
      let evEnd = new Date(cleanEvEnd).getTime();
      if (isNaN(evStart)) evStart = new Date(ev.startDate).getTime();
      if (isNaN(evEnd)) evEnd = new Date(ev.endDate).getTime();

      if (!isNaN(evStart) && !isNaN(evEnd)) {
        if (newStart < evEnd && newEnd > evStart) {
          return `A conflicting maintenance window is already scheduled for "${assetName}" (${formatDisplayDate(ev.startDate)} to ${formatDisplayDate(ev.endDate)}).`;
        }
      } else {
        return `A maintenance window is already active or scheduled for "${assetName}".`;
      }
    }
  }
  return null;
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
      if (Array.isArray(dbMaint)) {
        if (dbMaint.length > 0) {
          const mapped: MaintenanceEvent[] = dbMaint.map((m: any) => {
            const computedStatus = (m.status === "Completed")
              ? "Completed"
              : computeStatusFromDates(m.startDate, m.endDate);
            return {
              id: m.id,
              resourceId: m.resourceId,
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
        } else {
          setEvents([]);
        }
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
  const [isCreating, setIsCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [confirmEvent, setConfirmEvent] = useState<MaintenanceEvent | null>(null);
  const [isActivating, setIsActivating] = useState(false);

  // Edit maintenance state
  const [editEvent, setEditEvent] = useState<MaintenanceEvent | null>(null);
  const [editAssetName, setEditAssetName] = useState("");
  const [editDowntimeType, setEditDowntimeType] = useState<MaintenanceEvent["downtimeType"]>("Preventive Calibration");
  const [editStartDate, setEditStartDate] = useState("");
  const [editEndDate, setEditEndDate] = useState("");
  const [editTechnician, setEditTechnician] = useState("");
  const [editNotes, setEditNotes] = useState("");
  const [isUpdating, setIsUpdating] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);

  // Delete/Cancel maintenance state
  const [deleteEvent, setDeleteEvent] = useState<MaintenanceEvent | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [assetNameInput, setAssetNameInput] = useState("");
  const [downtimeTypeInput, setDowntimeTypeInput] = useState<MaintenanceEvent["downtimeType"]>("Preventive Calibration");
  const [startDateInput, setStartDateInput] = useState("");
  const [endDateInput, setEndDateInput] = useState("");
  const [technicianInput, setTechnicianInput] = useState("");
  const [notesInput, setNotesInput] = useState("");

  const handleCreateMaintenance = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isCreating) return;
    if (!startDateInput || !endDateInput) return;

    const selectedResourceName = assetNameInput || (resources.length > 0 ? resources[0].name : "NVIDIA H100 SXM5 80GB GPU Compute Node");
    const targetResource = resources.find(
      r => r.name === selectedResourceName || r.name.toLowerCase().includes(selectedResourceName.toLowerCase())
    );

    // Conflict check: Prevent double maintenance for same asset
    const conflict = checkMaintenanceConflict(
      selectedResourceName,
      targetResource?.id,
      startDateInput,
      endDateInput,
      events
    );
    if (conflict) {
      setCreateError(conflict);
      return;
    }

    setCreateError(null);
    setIsCreating(true);

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
      setShowAddModal(false);
      setStartDateInput("");
      setEndDateInput("");
      setTechnicianInput("");
      setNotesInput("");
    } catch (err: any) {
      console.error("Failed to create maintenance in DB:", err);
      setCreateError(err?.message || "Failed to create maintenance schedule. Please check for conflicting schedules.");
    } finally {
      setIsCreating(false);
    }
  };

  const handleMakeActive = async (ev: MaintenanceEvent) => {
    const now = new Date();
    const pad = (n: number) => String(n).padStart(2, "0");
    const localNow = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}T${pad(now.getHours())}:${pad(now.getMinutes())}`;

    // Optimistically update local UI immediately
    setEvents(prev => prev.map(p => {
      if (p.id === ev.id) {
        return { ...p, endDate: localNow, status: "Completed" };
      }
      return p;
    }));

    try {
      if (ev.resourceId) {
        await ResourcesService.updateStatus(ev.resourceId, "AVAILABLE");
      }
      if (!ev.id.startsWith("MNT-")) {
        await ResourcesService.updateMaintenance(ev.id, { endDate: localNow, status: "Completed" });
      }
      await loadData();
    } catch (e) {
      console.warn("Could not update backend, applying local fallback.", e);
    }
  };

  const handleConfirmMakeActive = async () => {
    if (!confirmEvent) return;
    setIsActivating(true);
    try {
      await handleMakeActive(confirmEvent);
      setConfirmEvent(null);
    } finally {
      setIsActivating(false);
    }
  };

  const openEditModal = (ev: MaintenanceEvent) => {
    setEditError(null);
    setEditEvent(ev);
    setEditAssetName(ev.assetName);
    setEditDowntimeType(ev.downtimeType);
    setEditStartDate(toDatetimeLocalValue(ev.startDate));
    setEditEndDate(toDatetimeLocalValue(ev.endDate));
    setEditTechnician(ev.technician || "");
    setEditNotes(ev.notes || "");
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editEvent || !editStartDate || !editEndDate) return;

    const targetResource = resources.find(
      r => r.name === editAssetName || r.name.toLowerCase().includes(editAssetName.toLowerCase())
    );

    const conflict = checkMaintenanceConflict(
      editAssetName,
      targetResource?.id || editEvent.resourceId,
      editStartDate,
      editEndDate,
      events,
      editEvent.id
    );
    if (conflict) {
      setEditError(conflict);
      return;
    }

    setEditError(null);
    setIsUpdating(true);

    const computedStatus = computeStatusFromDates(editStartDate, editEndDate);

    const payload = {
      resourceId: targetResource?.id || editEvent.resourceId || null,
      assetName: editAssetName,
      category: targetResource?.type || editEvent.category,
      startDate: editStartDate,
      endDate: editEndDate,
      downtimeType: editDowntimeType,
      technician: editTechnician.trim() || "Lab Operations Manager",
      status: computedStatus,
      notes: editNotes.trim() || "Scheduled downtime block.",
    };

    // Optimistically update local state immediately
    setEvents(prev => prev.map(p => {
      if (p.id === editEvent.id) {
        return {
          ...p,
          ...payload,
          resourceId: payload.resourceId || undefined,
          id: editEvent.id,
        };
      }
      return p;
    }));

    try {
      if (!editEvent.id.startsWith("MNT-")) {
        await ResourcesService.updateMaintenance(editEvent.id, payload);
      }
      await loadData();
      setEditEvent(null);
    } catch (err: any) {
      console.warn("Failed to update maintenance on backend:", err);
      setEditError(err?.message || "Failed to update maintenance schedule.");
    } finally {
      setIsUpdating(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!deleteEvent) return;
    setIsDeleting(true);

    // Optimistically remove from UI immediately
    setEvents(prev => prev.filter(p => p.id !== deleteEvent.id));

    try {
      if (!deleteEvent.id.startsWith("MNT-")) {
        await ResourcesService.deleteMaintenance(deleteEvent.id);
      }
      await loadData();
    } catch (err) {
      console.warn("Failed to delete maintenance on backend, keeping local state:", err);
    } finally {
      setIsDeleting(false);
      setDeleteEvent(null);
    }
  };

  const openAddModal = () => {
    setCreateError(null);
    setIsCreating(false);
    const now = new Date();
    const pad = (n: number) => String(n).padStart(2, "0");
    const localNow = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}T${pad(now.getHours())}:${pad(now.getMinutes())}`;
    const end = new Date(now.getTime() + 4 * 3600000);
    const localEnd = `${end.getFullYear()}-${pad(end.getMonth() + 1)}-${pad(end.getDate())}T${pad(end.getHours())}:${pad(end.getMinutes())}`;

    if (resources.length > 0) {
      setAssetNameInput(resources[0].name);
    }
    setStartDateInput(localNow);
    setEndDateInput(localEnd);
    setShowAddModal(true);
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

        <button onClick={openAddModal} style={s.btnPrimary}>
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
              <th style={s.th}>Status</th>
              <th style={{ ...s.th, textAlign: "right" }}>Actions</th>
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
                    <strong>{formatDisplayDate(ev.startDate)}</strong>
                    <span style={{ fontSize: 11, color: "#9e9e9e" }}>to {formatDisplayDate(ev.endDate)}</span>
                  </div>
                </td>
                <td style={{ ...s.td, color: "#424242", fontSize: 12 }}>
                  {ev.technician}
                </td>
                <td style={{ ...s.td, maxWidth: 300, fontSize: 12, color: "#616161", lineHeight: 1.3 }}>
                  {ev.notes}
                </td>
                <td style={s.td}>
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
                <td style={{ ...s.td, textAlign: "right" }}>
                  <div style={{ display: "flex", gap: 6, justifyContent: "flex-end", alignItems: "center" }}>
                    {ev.status === "In Progress" && (
                      <button
                        onClick={() => setConfirmEvent(ev)}
                        style={{
                          ...s.btnPrimary,
                          padding: "4px 8px",
                          fontSize: 11,
                          background: "#059669",
                        }}
                      >
                        Make Active
                      </button>
                    )}
                    {ev.status !== "Completed" && (
                      <button
                        onClick={() => openEditModal(ev)}
                        style={s.btnModify}
                      >
                        Modify
                      </button>
                    )}
                    <button
                      onClick={() => setDeleteEvent(ev)}
                      style={s.btnRemove}
                    >
                      Remove
                    </button>
                  </div>
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
              {createError && (
                <div style={m.errorAlert}>
                  <span>⚠️</span>
                  <span>{createError}</span>
                </div>
              )}
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
                    type="datetime-local"
                    required
                    value={startDateInput}
                    onChange={(e) => setStartDateInput(e.target.value)}
                    style={m.input}
                  />
                </div>

                <div style={{ ...m.field, flex: 1 }}>
                  <label style={m.label}>END DATE & TIME *</label>
                  <input
                    type="datetime-local"
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
                  disabled={isCreating}
                  style={m.btnSecondary}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isCreating}
                  style={{
                    ...m.btnPrimary,
                    opacity: isCreating ? 0.7 : 1,
                    cursor: isCreating ? "not-allowed" : "pointer",
                  }}
                >
                  {isCreating ? "Enforcing Downtime Lockout..." : "Enforce Downtime Lockout"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Confirm Make Active Modal ────────────────────────────── */}
      {confirmEvent && (
        <div style={m.overlay}>
          <div style={{ ...m.modal, maxWidth: 480 }}>
            <div style={m.header}>
              <div>
                <h3 style={m.title}>Confirm Asset Reactivation</h3>
                <p style={m.sub}>Prematurely complete maintenance downtime.</p>
              </div>
              <button onClick={() => !isActivating && setConfirmEvent(null)} style={m.closeBtn}>✕</button>
            </div>

            <div style={{ padding: "20px 24px", display: "flex", flexDirection: "column", gap: 14 }}>
              <p style={{ fontSize: 13, color: "#374151", margin: 0, lineHeight: 1.5 }}>
                Are you sure maintenance for <strong>{confirmEvent.assetName}</strong> is completed early and the resource is ready for use?
              </p>

              <div style={{ background: "#f9fafb", border: "1px solid #e5e7eb", borderRadius: 6, padding: "12px 14px", display: "flex", flexDirection: "column", gap: 8, fontSize: 12 }}>
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span style={{ color: "#6b7280" }}>Maintenance Type:</span>
                  <span style={{ fontWeight: 600, color: "#111827" }}>{confirmEvent.downtimeType}</span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span style={{ color: "#6b7280" }}>Scheduled End:</span>
                  <span style={{ fontWeight: 500, color: "#111827" }}>{confirmEvent.endDate}</span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span style={{ color: "#6b7280" }}>Updated Status:</span>
                  <span style={{ fontWeight: 600, color: "#059669" }}>Completed (Available for Booking)</span>
                </div>
              </div>

              <p style={{ fontSize: 12, color: "#6b7280", margin: 0, lineHeight: 1.4 }}>
                This will immediately unlock the asset and release the downtime lockout so researchers can book it again.
              </p>
            </div>

            <div style={m.footer}>
              <button
                type="button"
                onClick={() => setConfirmEvent(null)}
                disabled={isActivating}
                style={m.btnSecondary}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmMakeActive}
                disabled={isActivating}
                style={{
                  ...m.btnPrimary,
                  background: "#059669",
                  opacity: isActivating ? 0.7 : 1,
                  cursor: isActivating ? "not-allowed" : "pointer",
                }}
              >
                {isActivating ? "Reactivating..." : "Yes, Make Active"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Edit Maintenance Modal ─────────────────────────────── */}
      {editEvent && (
        <div style={m.overlay}>
          <div style={m.modal}>
            <div style={m.header}>
              <div>
                <h3 style={m.title}>Modify Maintenance Schedule</h3>
                <p style={m.sub}>Adjust downtime dates, service technician, or technical notes.</p>
              </div>
              <button onClick={() => !isUpdating && setEditEvent(null)} style={m.closeBtn}>✕</button>
            </div>

            <form onSubmit={handleSaveEdit} style={m.body}>
              {editError && (
                <div style={m.errorAlert}>
                  <span>⚠️</span>
                  <span>{editError}</span>
                </div>
              )}
              <div style={m.field}>
                <label style={m.label}>LABORATORY ASSET *</label>
                <select
                  value={editAssetName}
                  onChange={(e) => setEditAssetName(e.target.value)}
                  style={m.select}
                >
                  {resources.length > 0 ? (
                    resources.map(r => (
                      <option key={r.id} value={r.name}>{r.name}</option>
                    ))
                  ) : (
                    <option value={editAssetName}>{editAssetName}</option>
                  )}
                </select>
              </div>

              <div style={m.field}>
                <label style={m.label}>MAINTENANCE DOWNTIME TYPE</label>
                <select
                  value={editDowntimeType}
                  onChange={(e) => setEditDowntimeType(e.target.value as MaintenanceEvent["downtimeType"])}
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
                    type="datetime-local"
                    required
                    value={editStartDate}
                    onChange={(e) => setEditStartDate(e.target.value)}
                    style={m.input}
                  />
                </div>

                <div style={{ ...m.field, flex: 1 }}>
                  <label style={m.label}>END DATE & TIME *</label>
                  <input
                    type="datetime-local"
                    required
                    value={editEndDate}
                    onChange={(e) => setEditEndDate(e.target.value)}
                    style={m.input}
                  />
                </div>
              </div>

              <div style={m.field}>
                <label style={m.label}>SERVICE TECHNICIAN / VENDOR CONTACT</label>
                <input
                  placeholder="e.g. Field Engineer (vendor@service.com)"
                  value={editTechnician}
                  onChange={(e) => setEditTechnician(e.target.value)}
                  style={m.input}
                />
              </div>

              <div style={m.field}>
                <label style={m.label}>PROCEDURE NOTES & SAFETY PROTOCOL</label>
                <textarea
                  rows={3}
                  placeholder="Cooling loop purge, laser sensor alignment, safety lockout..."
                  value={editNotes}
                  onChange={(e) => setEditNotes(e.target.value)}
                  style={m.textarea}
                />
              </div>

              <div style={m.footer}>
                <button
                  type="button"
                  onClick={() => setEditEvent(null)}
                  disabled={isUpdating}
                  style={m.btnSecondary}
                >
                  Cancel
                </button>
                <button type="submit" disabled={isUpdating} style={m.btnPrimary}>
                  {isUpdating ? "Saving..." : "Save Changes"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Confirm Delete / Remove Maintenance Modal ────────────── */}
      {deleteEvent && (
        <div style={m.overlay}>
          <div style={{ ...m.modal, maxWidth: 480 }}>
            <div style={m.header}>
              <div>
                <h3 style={m.title}>Remove Maintenance Schedule</h3>
                <p style={m.sub}>Permanently remove this maintenance event.</p>
              </div>
              <button onClick={() => !isDeleting && setDeleteEvent(null)} style={m.closeBtn}>✕</button>
            </div>

            <div style={{ padding: "20px 24px", display: "flex", flexDirection: "column", gap: 14 }}>
              <p style={{ fontSize: 13, color: "#374151", margin: 0, lineHeight: 1.5 }}>
                {deleteEvent.status === "Completed" ? (
                  <>Are you sure you want to remove this completed maintenance record for <strong>{deleteEvent.assetName}</strong>?</>
                ) : (
                  <>Are you sure you want to remove the scheduled maintenance for <strong>{deleteEvent.assetName}</strong>?</>
                )}
              </p>

              <div style={{ background: "#f9fafb", border: "1px solid #e5e7eb", borderRadius: 6, padding: "12px 14px", display: "flex", flexDirection: "column", gap: 8, fontSize: 12 }}>
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span style={{ color: "#6b7280" }}>Maintenance Type:</span>
                  <span style={{ fontWeight: 600, color: "#111827" }}>{deleteEvent.downtimeType}</span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span style={{ color: "#6b7280" }}>Downtime Window:</span>
                  <span style={{ fontWeight: 500, color: "#111827" }}>{deleteEvent.startDate} to {deleteEvent.endDate}</span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span style={{ color: "#6b7280" }}>Current Status:</span>
                  <span style={{ fontWeight: 600, color: deleteEvent.status === "In Progress" ? "#dc2626" : deleteEvent.status === "Scheduled" ? "#d97706" : "#374151" }}>
                    {deleteEvent.status}
                  </span>
                </div>
              </div>

              <p style={{ fontSize: 12, color: "#ef4444", margin: 0, lineHeight: 1.4 }}>
                {deleteEvent.status === "Completed"
                  ? "This record will be permanently deleted from the facilities ledger."
                  : "This record will be permanently deleted from the facilities ledger. If the asset was currently locked under maintenance, it will be released immediately."}
              </p>
            </div>

            <div style={m.footer}>
              <button
                type="button"
                onClick={() => setDeleteEvent(null)}
                disabled={isDeleting}
                style={m.btnSecondary}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                disabled={isDeleting}
                style={{
                  ...m.btnPrimary,
                  background: "#dc2626",
                  opacity: isDeleting ? 0.7 : 1,
                  cursor: isDeleting ? "not-allowed" : "pointer",
                }}
              >
                {isDeleting ? "Removing..." : "Yes, Remove"}
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
  btnPrimary: { background: "#161616", color: "#ffffff", border: "none", borderRadius: 4, padding: "9px 16px", fontSize: 13, fontWeight: 600, cursor: "pointer" },
  statGrid: { display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16, marginBottom: 32 },
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
  btnModify: {
    background: "#ffffff",
    border: "1px solid #d0d0d0",
    color: "#374151",
    borderRadius: 4,
    padding: "4px 9px",
    fontSize: 11,
    fontWeight: 600,
    cursor: "pointer",
  },
  btnRemove: {
    background: "#fff1f2",
    border: "1px solid #fecdd3",
    color: "#e11d48",
    borderRadius: 4,
    padding: "4px 9px",
    fontSize: 11,
    fontWeight: 600,
    cursor: "pointer",
  },
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
  errorAlert: {
    background: "#fef2f2",
    border: "1px solid #fecaca",
    borderRadius: 4,
    padding: "10px 14px",
    color: "#b91c1c",
    fontSize: 12,
    lineHeight: 1.4,
    display: "flex",
    alignItems: "center",
    gap: 8,
  },
};
