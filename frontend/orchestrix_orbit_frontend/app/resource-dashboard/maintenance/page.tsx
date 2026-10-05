"use client";

import React, { useState, useEffect } from "react";
import { CheckCircle, Edit2, Trash2 } from "lucide-react";
import { ResourcesService, type Resource } from "@/lib/services/resources";
import LoadingState from "@/components/ui/LoadingState";
import { PremiumDateTimePicker } from "@/components/ui/PremiumDateTimePicker";
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
  const [isAssetDropdownOpen, setIsAssetDropdownOpen] = useState(false);
  const [assetSearchQuery, setAssetSearchQuery] = useState("");
  const [isTypeDropdownOpen, setIsTypeDropdownOpen] = useState(false);
  const [isTechDropdownOpen, setIsTechDropdownOpen] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [confirmEvent, setConfirmEvent] = useState<MaintenanceEvent | null>(null);
  const [isActivating, setIsActivating] = useState(false);

  // Edit maintenance state
  const [editEvent, setEditEvent] = useState<MaintenanceEvent | null>(null);
  const [isEditAssetDropdownOpen, setIsEditAssetDropdownOpen] = useState(false);
  const [editAssetSearchQuery, setEditAssetSearchQuery] = useState("");
  const [isEditTypeDropdownOpen, setIsEditTypeDropdownOpen] = useState(false);
  const [isEditTechDropdownOpen, setIsEditTechDropdownOpen] = useState(false);
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

    // assetNameInput holds the resource UUID (from the select's value={r.id})
    const selectedResourceId = assetNameInput || (resources.length > 0 ? resources[0].id : "");
    const targetResource = resources.find(r => r.id === selectedResourceId);

    if (!targetResource) {
      setCreateError("Please select a valid lab asset.");
      return;
    }

    // Conflict check: Prevent double maintenance for same asset
    const conflict = checkMaintenanceConflict(
      targetResource.name,
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
      resourceId: targetResource.id,
      assetName: targetResource.name,
      category: targetResource.type || "INSTRUMENT",
      startDate: new Date(startDateInput).toISOString(),
      endDate: new Date(endDateInput).toISOString(),
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
    let nextMinutes = Math.ceil(now.getMinutes() / 15) * 15;
    if (nextMinutes === 60) {
      now.setHours(now.getHours() + 1);
      nextMinutes = 0;
    }
    now.setMinutes(nextMinutes);
    now.setSeconds(0);
    now.setMilliseconds(0);

    const pad = (n: number) => String(n).padStart(2, "0");
    const localNow = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}T${pad(now.getHours())}:${pad(now.getMinutes())}`;
    const end = new Date(now.getTime() + 4 * 3600000);
    const localEnd = `${end.getFullYear()}-${pad(end.getMonth() + 1)}-${pad(end.getDate())}T${pad(end.getHours())}:${pad(end.getMinutes())}`;

    if (resources.length > 0) {
      setAssetNameInput(resources[0].id);
    }
    setStartDateInput(localNow);
    setEndDateInput(localEnd);
    setShowAddModal(true);
  };

  const filteredEvents = events.filter((ev) => {
    if (filter === "ALL") return true;
    return ev.status === filter;
  });

  const standardTechnicians = [
    "Lab Operations Manager",
    "NVIDIA Field Engineer",
    "Illumina Service Rep",
    "Facilities HVAC Team",
    "Internal IT Support",
    "Bio-safety Inspector",
    "External Vendor Contractor"
  ];

  const uniqueTechnicians = Array.from(new Set([
    ...events.map(ev => ev.technician).filter(t => t && t.trim() !== ""),
    ...standardTechnicians
  ]));

  if (loading) return <LoadingState variant="manager-maintenance" />;

  return (
    <>
      <style>{`
        .table-row { transition: all 0.2s ease; border-bottom: 1px solid rgba(0,0,0,0.04); }
        .table-row:hover { background: #f8fafc; }
        .table-row:last-child { border-bottom: none; }
        .filter-btn { padding: 8px 16px; font-size: 13px; font-weight: 600; border-radius: 8px; cursor: pointer; transition: all 0.2s; border: none; }
        .filter-btn.active { background: #0f172a; color: white; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1); }
        .filter-btn.inactive { background: transparent; color: #64748b; }
        .filter-btn.inactive:hover { background: #f1f5f9; color: #334155; }
        .action-btn { padding: 6px 12px; font-size: 12px; font-weight: 600; border-radius: 6px; cursor: pointer; transition: all 0.2s; display: inline-flex; align-items: center; justify-content: center; gap: 4px; border: 1px solid transparent; }
        .action-btn:disabled { opacity: 0.5; cursor: not-allowed; }
        .bento-hover { transition: transform 0.2s cubic-bezier(0.4, 0, 0.2, 1), box-shadow 0.2s cubic-bezier(0.4, 0, 0.2, 1); cursor: default; }
        .bento-hover:hover { transform: translateY(-4px); box-shadow: 0 12px 20px -8px rgba(0,0,0,0.08), 0 4px 6px -4px rgba(0,0,0,0.04); border-color: rgba(0,0,0,0.1); }
        .table-card-hover { transition: box-shadow 0.2s ease, border-color 0.2s ease; }
        .table-card-hover:hover { box-shadow: 0 10px 15px -3px rgba(0,0,0,0.05), 0 4px 6px -4px rgba(0,0,0,0.03); border-color: rgba(0,0,0,0.08); }
        
        /* Modifying action buttons */
        .btn-modify { background: #f8fafc; color: #334155; border-color: #e2e8f0; }
        .btn-modify:hover { background: #f1f5f9; box-shadow: 0 2px 4px rgba(0,0,0,0.05); }
        .btn-remove { background: #fef2f2; color: #e11d48; border-color: #fecdd3; }
        .btn-remove:hover { background: #ffe4e6; box-shadow: 0 2px 4px rgba(225,29,72,0.1); }
        
        /* Main Action Buttons */
        .btn-primary { padding: 10px 18px; background: #0f172a; color: #ffffff; border: none; border-radius: 8px; font-size: 13px; font-weight: 600; cursor: pointer; transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1); }
        .btn-primary:hover:not(:disabled) { background: #1e293b; box-shadow: 0 6px 12px -2px rgba(15, 23, 42, 0.3), 0 3px 7px -3px rgba(15, 23, 42, 0.2); transform: translateY(-1px); }
        .btn-primary:disabled { background: #64748b; opacity: 0.7; cursor: not-allowed; }

        .btn-secondary { padding: 10px 18px; background: #ffffff; color: #475569; border: 1px solid #cbd5e1; border-radius: 8px; font-size: 13px; font-weight: 600; cursor: pointer; transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1); }
        .btn-secondary:hover:not(:disabled) { background: #f8fafc; color: #0f172a; border-color: #94a3b8; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05); transform: translateY(-1px); }
        .btn-secondary:disabled { opacity: 0.7; cursor: not-allowed; }
        
        .btn-success { padding: 10px 18px; background: #059669; color: #ffffff; border: none; border-radius: 8px; font-size: 13px; font-weight: 600; cursor: pointer; transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1); }
        .btn-success:hover:not(:disabled) { background: #047857; box-shadow: 0 6px 12px -2px rgba(5, 150, 105, 0.3); transform: translateY(-1px); }
        .btn-success:disabled { opacity: 0.7; cursor: not-allowed; }
        
        .btn-danger { padding: 10px 18px; background: #dc2626; color: #ffffff; border: none; border-radius: 8px; font-size: 13px; font-weight: 600; cursor: pointer; transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1); }
        .btn-danger:hover:not(:disabled) { background: #b91c1c; box-shadow: 0 6px 12px -2px rgba(220, 38, 38, 0.3); transform: translateY(-1px); }
        .btn-danger:disabled { opacity: 0.7; cursor: not-allowed; }

        /* Premium Form Controls */
        .premium-input {
          padding: 10px 14px;
          font-size: 13px;
          border: 1px solid #cbd5e1;
          border-radius: 8px;
          outline: none;
          background: #ffffff;
          color: #0f172a;
          transition: all 0.2s ease;
          width: 100%;
          box-sizing: border-box;
        }
        .premium-input:hover { border-color: #94a3b8; }
        .premium-input:focus { border-color: #0f172a; box-shadow: 0 0 0 1px #0f172a; }
        
        .premium-select {
          appearance: none;
          background-image: url("data:image/svg+xml;charset=US-ASCII,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%22292.4%22%20height%3D%22292.4%22%3E%3Cpath%20fill%3D%22%2394a3b8%22%20d%3D%22M287%2069.4a17.6%2017.6%200%200%200-13-5.4H18.4c-5%200-9.3%201.8-12.9%205.4A17.6%2017.6%200%200%200%200%2082.2c0%205%201.8%209.3%205.4%2012.9l128%20127.9c3.6%203.6%207.8%205.4%2012.8%205.4s9.2-1.8%2012.8-5.4L287%2095c3.5-3.5%205.4-7.8%205.4-12.8%200-5-1.9-9.2-5.5-12.8z%22%2F%3E%3C%2Fsvg%3E");
          background-repeat: no-repeat;
          background-position: right 14px top 50%;
          background-size: 10px auto;
          padding-right: 36px;
          cursor: pointer;
        }
      `}</style>
      <div style={{ display: "flex", flexDirection: "column", gap: 24, padding: "8px 0 32px 0" }}>
      {/* ── Page Header ────────────────────────────────────────────────────── */}
      <div style={s.headerRow}>
        <div>
          <h1 style={s.pageTitle}>Maintenance & Downtime Schedules</h1>
          <p style={s.pageSub}>
            Coordinate preventive calibration, technician service visits, and automated downtime locks.
          </p>
        </div>

        <button onClick={openAddModal} className="btn-primary">
          + Schedule Maintenance Window
        </button>
      </div>

      {/* ── Metric Stat Cards ────────────────────────────────────────────────── */}
      <div style={s.statGrid}>
        <div style={s.statCard} className="bento-hover">
          <span style={s.statLabel}>IN PROGRESS DOWNTIME</span>
          <span style={{...s.statValue, color: events.filter((e) => e.status === "In Progress").length > 0 ? "#e11d48" : "#0f172a"}}>
            {events.filter((e) => e.status === "In Progress").length}
          </span>
          <span style={s.statSub}>Currently blocked for booking</span>
        </div>
        <div style={s.statCard} className="bento-hover">
          <span style={s.statLabel}>UPCOMING SCHEDULED</span>
          <span style={{...s.statValue, color: events.filter((e) => e.status === "Scheduled").length > 0 ? "#d97706" : "#0f172a"}}>
            {events.filter((e) => e.status === "Scheduled").length}
          </span>
          <span style={s.statSub}>Future service windows</span>
        </div>
        <div style={s.statCard} className="bento-hover">
          <span style={s.statLabel}>COMPLETED RUNS</span>
          <span style={s.statValue}>
            {events.filter((e) => e.status === "Completed").length}
          </span>
          <span style={s.statSub}>Logged historical services</span>
        </div>
      </div>

      {/* ── Maintenance Schedule Table Card ─────────────────────────────────── */}
      <div className="table-card-hover" style={s.tableCard}>
        <div style={s.tableHeaderRow}>
          <h2 style={s.sectionLabel}>FACILITIES SERVICE LEDGER & DOWNTIME WINDOWS</h2>
          
          <div style={{ display: "flex", gap: 4, background: "#f8fafc", padding: 4, borderRadius: 10, border: "1px solid rgba(0,0,0,0.04)" }}>
            {(["ALL", "In Progress", "Scheduled", "Completed"] as const).map((st) => (
              <button
                key={st}
                onClick={() => setFilter(st)}
                className={`filter-btn ${filter === st ? "active" : "inactive"}`}
              >
                {st === "ALL" ? "All Events" : st}
              </button>
            ))}
          </div>
        </div>

        <div style={{ overflowX: "auto" }}>
          <table style={s.table}>
            <thead>
              <tr>
                <th style={s.th}>Asset & Service Type</th>
                <th style={s.th}>Downtime Window</th>
                <th style={s.th}>Technician / Vendor</th>
                <th style={s.th}>Technical Notes</th>
                <th style={s.th}>Status</th>
                <th style={s.th}>Actions</th>
              </tr>
            </thead>
          <tbody>
            {filteredEvents.map((ev) => (
              <tr key={ev.id} className="table-row">
                <td style={s.td}>
                  <div style={{ fontWeight: 600, color: "#0f172a", fontSize: 14, marginBottom: 4 }}>{ev.assetName}</div>
                  <div style={{ fontSize: 12, color: "#64748b", display: "flex", gap: 8, alignItems: "center" }}>
                    <span style={{ background: "#f1f5f9", padding: "2px 6px", borderRadius: 4, fontWeight: 500 }}>{ev.downtimeType}</span>
                  </div>
                </td>
                <td style={s.td}>
                  <div style={{ fontSize: 13, color: "#0f172a", fontWeight: 500, marginBottom: 2 }}>{formatDisplayDate(ev.startDate)}</div>
                  <div style={{ fontSize: 12, color: "#64748b" }}>to {formatDisplayDate(ev.endDate)}</div>
                </td>
                <td style={s.td}>
                  <div style={{ fontWeight: 500, color: "#334155", fontSize: 13 }}>{ev.technician}</div>
                </td>
                <td style={s.td}>
                  <div style={{ fontSize: 12, color: "#64748b", maxWidth: 280, fontStyle: "italic" }}>{ev.notes}</div>
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
                <td style={s.td}>
                  <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                    {ev.status === "In Progress" && (
                      <button
                        onClick={() => setConfirmEvent(ev)}
                        className="action-btn" style={{ background: "#ecfdf5", color: "#059669", borderColor: "#a7f3d0" }}
                      >
                        <CheckCircle size={14} /> Make Active
                      </button>
                    )}
                    {ev.status !== "Completed" && (
                      <button onClick={() => openEditModal(ev)} className="action-btn btn-modify">
                        <Edit2 size={14} /> Modify
                      </button>
                    )}
                    <button onClick={() => setDeleteEvent(ev)} className="action-btn btn-remove">
                      <Trash2 size={14} /> Remove
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
          </table>
        </div>
      </div>

      {/* ── Schedule Maintenance Modal ───────────────────────────── */}
      {showAddModal && (
        <div style={m.overlay} onClick={() => { setShowAddModal(false); setIsAssetDropdownOpen(false); setIsTypeDropdownOpen(false); }}>
          <div style={m.modal} onClick={(e) => { e.stopPropagation(); setIsAssetDropdownOpen(false); setIsTypeDropdownOpen(false); setIsTechDropdownOpen(false); }}>
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
              <div style={{ ...m.field, zIndex: 30 }}>
                <label style={m.label}>SELECT LABORATORY ASSET *</label>
                <div style={{ position: "relative" }}>
                  <div
                    style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 12px", border: "1px solid #cbd5e1", borderRadius: 8, background: "#ffffff", cursor: "text" }}
                    onClick={(e) => {
                      e.stopPropagation();
                      setIsAssetDropdownOpen(true);
                    }}
                  >
                    <input 
                      type="text" 
                      placeholder="Search for a resource..."
                      value={isAssetDropdownOpen ? assetSearchQuery : (resources.find(r => String(r.id) === String(assetNameInput))?.name || "")}
                      onChange={(e) => {
                        setAssetSearchQuery(e.target.value);
                        if (!isAssetDropdownOpen) setIsAssetDropdownOpen(true);
                      }}
                      onFocus={() => setIsAssetDropdownOpen(true)}
                      style={{ flex: 1, border: "none", outline: "none", background: "transparent", fontSize: 13, color: "#111827", boxShadow: "none", padding: 0, margin: 0, appearance: "none", WebkitAppearance: "none" }}
                    />
                    <span 
                      onClick={(e) => { 
                        e.stopPropagation(); 
                        setIsAssetDropdownOpen(!isAssetDropdownOpen);
                      }}
                      style={{ color: "#9ca3af", fontSize: 10, cursor: "pointer", padding: "0 4px", flexShrink: 0 }}
                    >{isAssetDropdownOpen ? "▲" : "▼"}</span>
                  </div>
                  {isAssetDropdownOpen && (
                    <div 
                      onClick={(e) => e.stopPropagation()}
                      style={{ position: "absolute", top: "100%", left: 0, right: 0, background: "#fff", border: "1px solid #e5e7eb", borderRadius: 6, maxHeight: 250, overflowY: "auto", zIndex: 10, boxShadow: "0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)", marginTop: 4 }}
                    >
                      {resources.filter(r => r.name.toLowerCase().includes(assetSearchQuery.toLowerCase())).map(r => (
                        <div 
                          key={r.id} 
                          onClick={() => {
                            setAssetNameInput(r.id);
                            setAssetSearchQuery("");
                            setIsAssetDropdownOpen(false);
                          }}
                          style={{ 
                            padding: "10px 14px", 
                            borderBottom: "1px solid #f3f4f6", 
                            cursor: "pointer",
                            background: assetNameInput === r.id ? "#f9fafb" : "#fff",
                            fontSize: 13,
                            color: "#111827"
                          }}
                          onMouseEnter={(e) => e.currentTarget.style.background = "#f9fafb"}
                          onMouseLeave={(e) => { if (assetNameInput !== r.id) e.currentTarget.style.background = "#fff" }}
                        >
                          <div>{r.name}</div>
                          <div style={{ fontSize: 11, color: "#6b7280", marginTop: 2 }}>
                            {r.location ? `(${r.location})` : `(ID: ${r.id.substring(0, 8)})`}
                          </div>
                        </div>
                      ))}
                      {resources.filter(r => r.name.toLowerCase().includes(assetSearchQuery.toLowerCase())).length === 0 && (
                        <div style={{ padding: "10px 14px", fontSize: 13, color: "#6b7280", textAlign: "center" }}>No matching resources found.</div>
                      )}
                    </div>
                  )}
                </div>
              </div>

              <div style={{ ...m.field, zIndex: 20 }}>
                <label style={m.label}>MAINTENANCE DOWNTIME TYPE</label>
                <div style={{ position: "relative" }}>
                  <div
                    style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 12px", border: "1px solid #cbd5e1", borderRadius: 8, background: "#ffffff", cursor: "pointer" }}
                    onClick={(e) => {
                      e.stopPropagation();
                      setIsTypeDropdownOpen(!isTypeDropdownOpen);
                      setIsAssetDropdownOpen(false);
                    }}
                  >
                    <span style={{ fontSize: 13, color: "#111827" }}>{downtimeTypeInput}</span>
                    <span style={{ color: "#9ca3af", fontSize: 10 }}>{isTypeDropdownOpen ? "▲" : "▼"}</span>
                  </div>
                  {isTypeDropdownOpen && (
                    <div 
                      onClick={(e) => e.stopPropagation()}
                      style={{ position: "absolute", top: "100%", left: 0, right: 0, background: "#fff", border: "1px solid #e5e7eb", borderRadius: 6, maxHeight: 250, overflowY: "auto", zIndex: 10, boxShadow: "0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)", marginTop: 4 }}
                    >
                      {["Preventive Calibration", "Emergency Repair", "Firmware/Driver Update", "Safety Inspection"].map(type => (
                        <div 
                          key={type} 
                          onClick={() => {
                            setDowntimeTypeInput(type as any);
                            setIsTypeDropdownOpen(false);
                          }}
                          style={{ 
                            padding: "10px 14px", 
                            borderBottom: "1px solid #f3f4f6", 
                            cursor: "pointer",
                            background: downtimeTypeInput === type ? "#f9fafb" : "#fff",
                            fontSize: 13,
                            color: "#111827"
                          }}
                          onMouseEnter={(e) => e.currentTarget.style.background = "#f9fafb"}
                          onMouseLeave={(e) => { if (downtimeTypeInput !== type) e.currentTarget.style.background = "#fff" }}
                        >
                          {type}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <div style={{ ...m.row, position: "relative", zIndex: 10 }}>
                <div style={{ flex: 1 }}>
                  <PremiumDateTimePicker
                    label="START DATE & TIME *"
                    value={startDateInput}
                    onChange={setStartDateInput}
                    required
                  />
                </div>

                <div style={{ flex: 1 }}>
                  <PremiumDateTimePicker
                    label="END DATE & TIME *"
                    value={endDateInput}
                    onChange={setEndDateInput}
                    required
                  />
                </div>
              </div>

              <div style={{ ...m.field, zIndex: 15 }}>
                <label style={m.label}>SERVICE TECHNICIAN / VENDOR CONTACT</label>
                <div style={{ position: "relative" }}>
                  <div
                    style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 12px", border: "1px solid #cbd5e1", borderRadius: 8, background: "#ffffff", cursor: "text" }}
                    onClick={(e) => {
                      e.stopPropagation();
                      setIsTechDropdownOpen(true);
                      setIsAssetDropdownOpen(false);
                      setIsTypeDropdownOpen(false);
                    }}
                  >
                    <input
                      type="text"
                      placeholder="e.g. Field Engineer (vendor@service.com)"
                      value={technicianInput}
                      onChange={(e) => {
                        setTechnicianInput(e.target.value);
                        if (!isTechDropdownOpen) setIsTechDropdownOpen(true);
                      }}
                      onFocus={() => setIsTechDropdownOpen(true)}
                      style={{ flex: 1, border: "none", outline: "none", background: "transparent", fontSize: 13, color: "#111827", boxShadow: "none", padding: 0, margin: 0, appearance: "none", WebkitAppearance: "none" }}
                    />
                    <span 
                      onClick={(e) => { 
                        e.stopPropagation(); 
                        setIsTechDropdownOpen(!isTechDropdownOpen);
                      }}
                      style={{ color: "#9ca3af", fontSize: 10, cursor: "pointer", paddingLeft: 8 }}
                    >
                      {isTechDropdownOpen ? "▲" : "▼"}
                    </span>
                  </div>
                  {isTechDropdownOpen && (
                    <div 
                      onClick={(e) => e.stopPropagation()}
                      style={{ position: "absolute", top: "100%", left: 0, right: 0, background: "#fff", border: "1px solid #e5e7eb", borderRadius: 6, maxHeight: 200, overflowY: "auto", zIndex: 15, boxShadow: "0 10px 15px -3px rgba(0, 0, 0, 0.1)", marginTop: 4 }}
                    >
                      {uniqueTechnicians.filter(t => t.toLowerCase().includes(technicianInput.toLowerCase())).map(t => (
                        <div 
                          key={t} 
                          onClick={() => {
                            setTechnicianInput(t);
                            setIsTechDropdownOpen(false);
                          }}
                          style={{ padding: "10px 14px", borderBottom: "1px solid #f3f4f6", cursor: "pointer", fontSize: 13, color: "#111827", background: "#fff" }}
                          onMouseEnter={(e) => e.currentTarget.style.background = "#f9fafb"}
                          onMouseLeave={(e) => e.currentTarget.style.background = "#fff"}
                        >
                          {t}
                        </div>
                      ))}
                      {technicianInput && !uniqueTechnicians.some(t => t.toLowerCase() === technicianInput.toLowerCase()) && (
                        <div 
                          onClick={() => setIsTechDropdownOpen(false)}
                          style={{ padding: "10px 14px", cursor: "pointer", fontSize: 13, color: "#2563eb", fontWeight: 500, background: "#f8fafc", borderTop: "1px solid #e2e8f0" }}
                          onMouseEnter={(e) => e.currentTarget.style.background = "#f1f5f9"}
                          onMouseLeave={(e) => e.currentTarget.style.background = "#f8fafc"}
                        >
                          + Add manually: "{technicianInput}"
                        </div>
                      )}
                      {!technicianInput && uniqueTechnicians.length === 0 && (
                        <div style={{ padding: "10px 14px", fontSize: 13, color: "#6b7280", textAlign: "center" }}>No previous technicians. Type to add one.</div>
                      )}
                    </div>
                  )}
                </div>
              </div>

              <div style={m.field}>
                <label style={m.label}>PROCEDURE NOTES & SAFETY PROTOCOL</label>
                <textarea
                  rows={3}
                  placeholder="Cooling loop purge, laser sensor alignment, safety lockout..."
                  value={notesInput}
                  onChange={(e) => setNotesInput(e.target.value)}
                  className="premium-input"
                />
              </div>

              <div style={m.footer}>
                {(() => {
                  const isAddValid = assetNameInput.trim() !== "" && startDateInput.trim() !== "" && endDateInput.trim() !== "" && (new Date(startDateInput) < new Date(endDateInput));
                  return (
                    <>
                      <button
                        type="button"
                        onClick={() => setShowAddModal(false)}
                        disabled={isCreating}
                        className="btn-secondary"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        disabled={isCreating || !isAddValid}
                        className="btn-primary"
                      >
                        {isCreating ? "Enforcing Downtime Lockout..." : "Enforce Downtime Lockout"}
                      </button>
                    </>
                  );
                })()}
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

              <div style={{ background: "#f9fafb", border: "1px solid #f3f4f6", borderRadius: 6, padding: "12px 14px", display: "flex", flexDirection: "column", gap: 8, fontSize: 12 }}>
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
                className="btn-secondary"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmMakeActive}
                disabled={isActivating}
                className="btn-success"
              >
                {isActivating ? "Reactivating..." : "Yes, Make Active"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Edit Maintenance Modal ─────────────────────────────── */}
      {editEvent && (
        <div style={m.overlay} onClick={() => { if (!isUpdating) { setEditEvent(null); setIsEditAssetDropdownOpen(false); setIsEditTypeDropdownOpen(false); } }}>
          <div style={m.modal} onClick={(e) => { e.stopPropagation(); setIsEditAssetDropdownOpen(false); setIsEditTypeDropdownOpen(false); setIsEditTechDropdownOpen(false); }}>
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
              <div style={{ ...m.field, zIndex: 30 }}>
                <label style={m.label}>LABORATORY ASSET *</label>
                <div style={{ position: "relative" }}>
                  <div
                    style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 12px", border: "1px solid #cbd5e1", borderRadius: 8, background: "#ffffff", cursor: "text" }}
                    onClick={(e) => {
                      e.stopPropagation();
                      setIsEditAssetDropdownOpen(true);
                    }}
                  >
                    <input 
                      type="text" 
                      placeholder="Search for a resource..."
                      value={isEditAssetDropdownOpen ? editAssetSearchQuery : (editAssetName || "")}
                      onChange={(e) => {
                        setEditAssetSearchQuery(e.target.value);
                        if (!isEditAssetDropdownOpen) setIsEditAssetDropdownOpen(true);
                      }}
                      onFocus={() => setIsEditAssetDropdownOpen(true)}
                      style={{ flex: 1, border: "none", outline: "none", background: "transparent", fontSize: 13, color: "#111827", boxShadow: "none", padding: 0, margin: 0, appearance: "none", WebkitAppearance: "none" }}
                    />
                    <span 
                      onClick={(e) => { 
                        e.stopPropagation(); 
                        setIsEditAssetDropdownOpen(!isEditAssetDropdownOpen);
                      }}
                      style={{ color: "#9ca3af", fontSize: 10, cursor: "pointer", padding: "0 4px", flexShrink: 0 }}
                    >{isEditAssetDropdownOpen ? "▲" : "▼"}</span>
                  </div>
                  {isEditAssetDropdownOpen && (
                    <div 
                      onClick={(e) => e.stopPropagation()}
                      style={{ position: "absolute", top: "100%", left: 0, right: 0, background: "#fff", border: "1px solid #e5e7eb", borderRadius: 6, maxHeight: 250, overflowY: "auto", zIndex: 10, boxShadow: "0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)", marginTop: 4 }}
                    >
                      {resources.filter(r => r.name.toLowerCase().includes(editAssetSearchQuery.toLowerCase())).map(r => (
                        <div 
                          key={r.id} 
                          onClick={() => {
                            setEditAssetName(r.name);
                            setEditAssetSearchQuery("");
                            setIsEditAssetDropdownOpen(false);
                          }}
                          style={{ 
                            padding: "10px 14px", 
                            borderBottom: "1px solid #f3f4f6", 
                            cursor: "pointer",
                            background: editAssetName === r.name ? "#f9fafb" : "#fff",
                            fontSize: 13,
                            color: "#111827"
                          }}
                          onMouseEnter={(e) => e.currentTarget.style.background = "#f9fafb"}
                          onMouseLeave={(e) => { if (editAssetName !== r.name) e.currentTarget.style.background = "#fff" }}
                        >
                          {r.name}
                        </div>
                      ))}
                      {resources.length === 0 && (
                        <div 
                          onClick={() => {
                            setIsEditAssetDropdownOpen(false);
                          }}
                          style={{ padding: "10px 14px", fontSize: 13, color: "#111827", cursor: "pointer" }}
                        >
                          {editAssetName}
                        </div>
                      )}
                      {resources.length > 0 && resources.filter(r => r.name.toLowerCase().includes(editAssetSearchQuery.toLowerCase())).length === 0 && (
                        <div style={{ padding: "10px 14px", fontSize: 13, color: "#6b7280", textAlign: "center" }}>No matching resources found.</div>
                      )}
                    </div>
                  )}
                </div>
              </div>

              <div style={{ ...m.field, zIndex: 20 }}>
                <label style={m.label}>MAINTENANCE DOWNTIME TYPE</label>
                <div style={{ position: "relative" }}>
                  <div
                    style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 12px", border: "1px solid #cbd5e1", borderRadius: 8, background: "#ffffff", cursor: "pointer" }}
                    onClick={(e) => {
                      e.stopPropagation();
                      setIsEditTypeDropdownOpen(!isEditTypeDropdownOpen);
                      setIsEditAssetDropdownOpen(false);
                    }}
                  >
                    <span style={{ fontSize: 13, color: "#111827" }}>{editDowntimeType}</span>
                    <span style={{ color: "#9ca3af", fontSize: 10 }}>{isEditTypeDropdownOpen ? "▲" : "▼"}</span>
                  </div>
                  {isEditTypeDropdownOpen && (
                    <div 
                      onClick={(e) => e.stopPropagation()}
                      style={{ position: "absolute", top: "100%", left: 0, right: 0, background: "#fff", border: "1px solid #e5e7eb", borderRadius: 6, maxHeight: 250, overflowY: "auto", zIndex: 10, boxShadow: "0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)", marginTop: 4 }}
                    >
                      {["Preventive Calibration", "Emergency Repair", "Firmware/Driver Update", "Safety Inspection"].map(type => (
                        <div 
                          key={type} 
                          onClick={() => {
                            setEditDowntimeType(type as any);
                            setIsEditTypeDropdownOpen(false);
                          }}
                          style={{ 
                            padding: "10px 14px", 
                            borderBottom: "1px solid #f3f4f6", 
                            cursor: "pointer",
                            background: editDowntimeType === type ? "#f9fafb" : "#fff",
                            fontSize: 13,
                            color: "#111827"
                          }}
                          onMouseEnter={(e) => e.currentTarget.style.background = "#f9fafb"}
                          onMouseLeave={(e) => { if (editDowntimeType !== type) e.currentTarget.style.background = "#fff" }}
                        >
                          {type}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <div style={{ ...m.row, position: "relative", zIndex: 10 }}>
                <div style={{ flex: 1 }}>
                  <PremiumDateTimePicker
                    label="START DATE & TIME *"
                    value={editStartDate}
                    onChange={setEditStartDate}
                    required
                  />
                </div>

                <div style={{ flex: 1 }}>
                  <PremiumDateTimePicker
                    label="END DATE & TIME *"
                    value={editEndDate}
                    onChange={setEditEndDate}
                    required
                  />
                </div>
              </div>

              <div style={{ ...m.field, zIndex: 15 }}>
                <label style={m.label}>SERVICE TECHNICIAN / VENDOR CONTACT</label>
                <div style={{ position: "relative" }}>
                  <div
                    style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 12px", border: "1px solid #cbd5e1", borderRadius: 8, background: "#ffffff", cursor: "text" }}
                    onClick={(e) => {
                      e.stopPropagation();
                      setIsEditTechDropdownOpen(true);
                      setIsEditAssetDropdownOpen(false);
                      setIsEditTypeDropdownOpen(false);
                    }}
                  >
                    <input
                      type="text"
                      placeholder="e.g. Field Engineer (vendor@service.com)"
                      value={editTechnician}
                      onChange={(e) => {
                        setEditTechnician(e.target.value);
                        if (!isEditTechDropdownOpen) setIsEditTechDropdownOpen(true);
                      }}
                      onFocus={() => setIsEditTechDropdownOpen(true)}
                      style={{ flex: 1, border: "none", outline: "none", background: "transparent", fontSize: 13, color: "#111827", boxShadow: "none", padding: 0, margin: 0, appearance: "none", WebkitAppearance: "none" }}
                    />
                    <span 
                      onClick={(e) => { 
                        e.stopPropagation(); 
                        setIsEditTechDropdownOpen(!isEditTechDropdownOpen);
                      }}
                      style={{ color: "#9ca3af", fontSize: 10, cursor: "pointer", paddingLeft: 8 }}
                    >
                      {isEditTechDropdownOpen ? "▲" : "▼"}
                    </span>
                  </div>
                  {isEditTechDropdownOpen && (
                    <div 
                      onClick={(e) => e.stopPropagation()}
                      style={{ position: "absolute", top: "100%", left: 0, right: 0, background: "#fff", border: "1px solid #e5e7eb", borderRadius: 6, maxHeight: 200, overflowY: "auto", zIndex: 15, boxShadow: "0 10px 15px -3px rgba(0, 0, 0, 0.1)", marginTop: 4 }}
                    >
                      {uniqueTechnicians.filter(t => t.toLowerCase().includes(editTechnician.toLowerCase())).map(t => (
                        <div 
                          key={t} 
                          onClick={() => {
                            setEditTechnician(t);
                            setIsEditTechDropdownOpen(false);
                          }}
                          style={{ padding: "10px 14px", borderBottom: "1px solid #f3f4f6", cursor: "pointer", fontSize: 13, color: "#111827", background: "#fff" }}
                          onMouseEnter={(e) => e.currentTarget.style.background = "#f9fafb"}
                          onMouseLeave={(e) => e.currentTarget.style.background = "#fff"}
                        >
                          {t}
                        </div>
                      ))}
                      {editTechnician && !uniqueTechnicians.some(t => t.toLowerCase() === editTechnician.toLowerCase()) && (
                        <div 
                          onClick={() => setIsEditTechDropdownOpen(false)}
                          style={{ padding: "10px 14px", cursor: "pointer", fontSize: 13, color: "#2563eb", fontWeight: 500, background: "#f8fafc", borderTop: "1px solid #e2e8f0" }}
                          onMouseEnter={(e) => e.currentTarget.style.background = "#f1f5f9"}
                          onMouseLeave={(e) => e.currentTarget.style.background = "#f8fafc"}
                        >
                          + Add manually: "{editTechnician}"
                        </div>
                      )}
                      {!editTechnician && uniqueTechnicians.length === 0 && (
                        <div style={{ padding: "10px 14px", fontSize: 13, color: "#6b7280", textAlign: "center" }}>No previous technicians. Type to add one.</div>
                      )}
                    </div>
                  )}
                </div>
              </div>

              <div style={m.field}>
                <label style={m.label}>PROCEDURE NOTES & SAFETY PROTOCOL</label>
                <textarea
                  rows={3}
                  placeholder="Cooling loop purge, laser sensor alignment, safety lockout..."
                  value={editNotes}
                  onChange={(e) => setEditNotes(e.target.value)}
                  className="premium-input"
                />
              </div>

              <div style={m.footer}>
                {(() => {
                  const isEditValid = editAssetName.trim() !== "" && editStartDate.trim() !== "" && editEndDate.trim() !== "" && (new Date(editStartDate) < new Date(editEndDate));
                  return (
                    <>
                      <button
                        type="button"
                        onClick={() => setEditEvent(null)}
                        disabled={isUpdating}
                        className="btn-secondary"
                      >
                        Cancel
                      </button>
                      <button 
                        type="submit" 
                        disabled={isUpdating || !isEditValid} 
                        className="btn-primary"
                      >
                        {isUpdating ? "Saving..." : "Save Changes"}
                      </button>
                    </>
                  );
                })()}
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

              <div style={{ background: "#f9fafb", border: "1px solid #f3f4f6", borderRadius: 6, padding: "12px 14px", display: "flex", flexDirection: "column", gap: 8, fontSize: 12 }}>
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
                className="btn-secondary"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                disabled={isDeleting}
                className="btn-danger"
              >
                {isDeleting ? "Removing..." : "Yes, Remove"}
              </button>
            </div>
          </div>
        </div>
      )}
      </div>
    </>
  );
}

const s: Record<string, React.CSSProperties> = {
  headerRow: { display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: 8 },
  pageTitle: { fontSize: 28, fontWeight: 800, color: "#0f172a", letterSpacing: "-0.5px", marginBottom: 8 },
  pageSub: { fontSize: 15, color: "#64748b", margin: 0 },
  btnPrimary: { background: "#0f172a", color: "#ffffff", border: "none", borderRadius: 8, padding: "10px 18px", fontSize: 14, fontWeight: 600, cursor: "pointer", transition: "all 0.2s" },
  statGrid: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 20 },
  statCard: { background: "#fff", padding: "24px", borderRadius: 16, border: "1px solid rgba(0,0,0,0.06)", boxShadow: "0 4px 6px -1px rgba(0,0,0,0.02)", display: "flex", flexDirection: "column" },
  statLabel: { fontSize: 11, fontWeight: 700, color: "#64748b", letterSpacing: "0.5px", textTransform: "uppercase", marginBottom: 12 },
  statValue: { fontSize: 36, fontWeight: 800, color: "#0f172a", marginBottom: 4, letterSpacing: "-1px", lineHeight: 1 },
  statSub: { fontSize: 13, color: "#94a3b8", fontWeight: 500 },
  tableCard: { background: "#fff", borderRadius: 16, border: "1px solid rgba(0,0,0,0.06)", boxShadow: "0 4px 6px -1px rgba(0,0,0,0.02), 0 2px 4px -2px rgba(0,0,0,0.02)", overflow: "hidden" },
  tableHeaderRow: { display: "flex", justifyContent: "space-between", alignItems: "center", padding: "20px 24px", borderBottom: "1px solid rgba(0,0,0,0.06)", background: "#fcfcfd" },
  sectionLabel: { fontSize: 13, fontWeight: 700, color: "#475569", letterSpacing: "0.5px", margin: 0, textTransform: "uppercase" },
  table: { width: "100%", borderCollapse: "collapse", textAlign: "left" },
  th: { padding: "16px 24px", fontSize: 11, fontWeight: 700, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.5px", borderBottom: "1px solid rgba(0,0,0,0.06)" },
  td: { padding: "16px 24px", verticalAlign: "middle" },
  badge: { fontSize: 11, fontWeight: 700, padding: "4px 10px", borderRadius: 999, letterSpacing: "0.4px", whiteSpace: "nowrap", display: "inline-block" },
  badgeProgress: { background: "#fef2f2", color: "#e11d48", border: "1px solid #fecdd3" },
  badgeScheduled: { background: "#fffbeb", color: "#d97706", border: "1px solid #fde68a" },
  badgeCompleted: { background: "#f8fafc", color: "#64748b", border: "1px solid #e2e8f0" },
  btnModify: { padding: "6px 12px", fontSize: 12, fontWeight: 600, borderRadius: 6, cursor: "pointer" }
};

const m: Record<string, React.CSSProperties> = {
  overlay: { position: "fixed", top: 0, left: 0, right: 0, bottom: 0, background: "rgba(15, 23, 42, 0.4)", backdropFilter: "blur(6px)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", animation: "modalFadeIn 0.15s ease-out" },
  modal: { background: "#fff", width: 540, maxWidth: "90%", borderRadius: 24, overflow: "visible", boxShadow: "0 25px 50px -12px rgba(0,0,0,0.25)", animation: "modalSlideUp 0.25s cubic-bezier(0.16, 1, 0.3, 1)" },
  header: { display: "flex", justifyContent: "space-between", alignItems: "flex-start", padding: "24px 32px 20px", borderBottom: "1px solid #f1f5f9", borderTopLeftRadius: 24, borderTopRightRadius: 24 },
  title: { margin: 0, fontSize: 18, fontWeight: 700, color: "#0f172a", marginBottom: 4 },
  sub: { fontSize: 13, color: "#64748b", margin: 0 },
  closeBtn: { background: "transparent", border: "none", cursor: "pointer", color: "#94a3b8", padding: 8, margin: -8, borderRadius: "50%", transition: "all 0.2s", display: "flex" },
  body: { padding: "24px 32px 32px", display: "flex", flexDirection: "column", gap: 20 },
  row: { display: "flex", gap: 14 },
  field: { display: "flex", flexDirection: "column", gap: 6 },
  label: { fontSize: 11, fontWeight: 700, color: "#64748b", letterSpacing: "0.5px", textTransform: "uppercase" },
  footer: { padding: "16px 32px", borderTop: "1px solid #f1f5f9", background: "#f8fafc", display: "flex", justifyContent: "flex-end", gap: 12, borderBottomLeftRadius: 24, borderBottomRightRadius: 24 },
  btnPrimary: { padding: "10px 18px", background: "#0f172a", color: "#ffffff", border: "none", borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: "pointer", transition: "all 0.2s" },
  btnSecondary: { padding: "10px 18px", background: "#ffffff", color: "#475569", border: "1px solid #cbd5e1", borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: "pointer", transition: "all 0.2s" },
  errorAlert: { background: "#fef2f2", border: "1px solid #fecdd3", borderRadius: 8, padding: "12px 16px", color: "#e11d48", fontSize: 13, display: "flex", alignItems: "center", gap: 8 },
};
