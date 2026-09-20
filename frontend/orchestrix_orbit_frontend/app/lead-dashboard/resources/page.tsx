"use client";

import React, { useState, useEffect } from "react";
import { ResourcesService, type Resource } from "@/lib/services/resources";
import { ProjectsService, type Project } from "@/lib/services/projects";

interface ResourceItem {
  id: string;
  name: string;
  type: string;
  status: "In Use" | "Reserved" | "Available" | "Under Maintenance";
  bookedBy: string;
  project: string;
  availableSlot: string;
}

function parseMaintenanceDates(maint: any) {
  if (!maint) return null;
  const sRaw = maint.startDate || "";
  const eRaw = maint.endDate || "";
  if (!sRaw && !eRaw) return null;

  const cleanStart = sRaw.replace(/\((\d{2}:\d{2})\)/, "$1").trim();
  const cleanEnd = eRaw.replace(/\((\d{2}:\d{2})\)/, "$1").trim();

  let dStart = new Date(cleanStart);
  let dEnd = new Date(cleanEnd);

  if (isNaN(dStart.getTime())) dStart = new Date(sRaw);
  if (isNaN(dEnd.getTime())) dEnd = new Date(eRaw);

  if (!isNaN(dEnd.getTime())) {
    if (!cleanEnd.includes(":")) {
      dEnd.setHours(23, 59, 59, 999);
    }
  }

  return {
    start: !isNaN(dStart.getTime()) ? dStart : null,
    end: !isNaN(dEnd.getTime()) ? dEnd : null,
  };
}

function computeDynamicStatus(resource: any, allBookings: any[], maintenanceLogs: any[] = []) {
  const now = new Date();

  // Filter ALL maintenance logs for this resource
  const assetLogs = (maintenanceLogs || []).filter((m) => {
    const isIdMatch = m.resourceId && resource.id && String(m.resourceId) === String(resource.id);
    const isNameMatch = m.assetName && resource.name && String(m.assetName).trim().toLowerCase() === String(resource.name).trim().toLowerCase();
    return isIdMatch || isNameMatch;
  });

  let activeMaintenance = false;
  let maintEndDate: Date | null = null;

  // 1. Check if ANY maintenance log is currently active (start <= now <= end)
  const activeLog = assetLogs.find((m) => {
    const dates = parseMaintenanceDates(m);
    if (!dates || !dates.end) return false;
    if (dates.start && dates.end) {
      return now >= dates.start && now <= dates.end;
    }
    return now <= dates.end;
  });

  if (activeLog) {
    activeMaintenance = true;
    const dates = parseMaintenanceDates(activeLog);
    maintEndDate = dates?.end || null;
  } else if (resource.status === "MAINTENANCE" || resource.status === "Under Maintenance") {
    // If DB statically says MAINTENANCE but all logs are either past or future, treat as expired
    const hasActiveOrUpcoming = assetLogs.some((m) => {
      const dates = parseMaintenanceDates(m);
      return dates?.end && now <= dates.end;
    });
    activeMaintenance = hasActiveOrUpcoming;
  }

  if (activeMaintenance) {
    const nextAvailDate = maintEndDate ? new Date(maintEndDate.getTime() + 60000) : new Date(now.getTime() + 86400000);
    const availStr = nextAvailDate.toLocaleDateString(undefined, { month: "short", day: "numeric" });
    const availTimeStr = nextAvailDate.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    return {
      status: "Under Maintenance" as const,
      availableSlot: `Available ${availStr} from ${availTimeStr}`,
      bookedBy: "Facility Operations",
      project: "Core Maintenance",
    };
  }

  // 1. Check if currently in use (startTime <= now <= endTime)
  const resBookings = (allBookings || []).filter((b) => {
    const isIdMatch = String(b.resourceId) === String(resource.id);
    const isNameMatch = b.resourceName && resource.name && String(b.resourceName).trim().toLowerCase() === String(resource.name).trim().toLowerCase();
    return (isIdMatch || isNameMatch) && b.status !== "CANCELLED" && b.status !== "REJECTED";
  });

  const activeBooking = resBookings.find((b) => {
    const start = new Date(b.startTime);
    const end = new Date(b.endTime);
    return now >= start && now <= end;
  });

  if (activeBooking) {
    const endTimeObj = new Date(activeBooking.endTime);
    const isToday = endTimeObj.toDateString() === now.toDateString();
    const timeLabel = endTimeObj.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    const dateLabel = isToday ? "Today" : endTimeObj.toLocaleDateString();

    return {
      status: "In Use" as const,
      availableSlot: `Available ${dateLabel} from ${timeLabel}`,
      bookedBy: activeBooking.bookedBy || activeBooking.userName || "Lab Researcher",
      project: activeBooking.project || activeBooking.projectName || "Active Project",
    };
  }

  // 2. Check if reserved for future time (startTime > now)
  const upcomingBooking = resBookings
    .filter((b) => new Date(b.startTime) > now)
    .sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime())[0];

  if (upcomingBooking) {
    const startDate = new Date(upcomingBooking.startTime);
    const isToday = startDate.toDateString() === now.toDateString();
    const dateLabel = isToday ? "Today" : startDate.toLocaleDateString();
    const timeLabel = startDate.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

    return {
      status: "Reserved" as const,
      availableSlot: `Available Now (Reserved ${dateLabel} at ${timeLabel})`,
      bookedBy: upcomingBooking.bookedBy || upcomingBooking.userName || "Lab Researcher",
      project: upcomingBooking.project || upcomingBooking.projectName || "Scheduled Project",
    };
  }

  // 3. Otherwise Available
  return {
    status: "Available" as const,
    availableSlot: "Available Now",
    bookedBy: "-",
    project: "-",
  };
}

function getSlotStartEndDates(dateStr: string, startTimeStr: string, durationHours: string | number) {
  const dateVal = dateStr || "2026-09-02";
  const [hStr, mStr] = (startTimeStr || "14:00").split(":");
  let startH = parseInt(hStr || "14", 10);
  let startM = parseInt(mStr || "0", 10);
  let durH = parseFloat(String(durationHours) || "3");

  if (isNaN(startH)) startH = 14;
  if (isNaN(startM)) startM = 0;
  if (isNaN(durH) || durH <= 0) durH = 1;

  const slotStart = new Date(`${dateVal}T${String(startH).padStart(2, "0")}:${String(startM).padStart(2, "0")}:00Z`);
  const slotEnd = new Date(slotStart.getTime() + Math.round(durH * 60 * 60 * 1000));

  return { slotStart, slotEnd };
}

function checkResourceSlotStatus(resource: any, dateStr: string, startTimeStr: string, durationHours: string | number, allBookings: any[], maintenanceLogs: any[] = []) {
  const { slotStart, slotEnd } = getSlotStartEndDates(dateStr, startTimeStr, durationHours);

  const assetLogs = (maintenanceLogs || []).filter((m) => {
    const isIdMatch = m.resourceId && resource.id && String(m.resourceId) === String(resource.id);
    const isNameMatch = m.assetName && resource.name && String(m.assetName).trim().toLowerCase() === String(resource.name).trim().toLowerCase();
    return isIdMatch || isNameMatch;
  });

  for (const m of assetLogs) {
    const dates = parseMaintenanceDates(m);
    if (dates && dates.start && dates.end) {
      if (slotStart < dates.end && slotEnd > dates.start) {
        return {
          isBookable: false,
          label: "Scheduled Maintenance Slot",
          reason: `Scheduled maintenance window (${dates.start.toLocaleDateString()} – ${dates.end.toLocaleDateString()})`,
        };
      }
    }
  }

  const resBookings = (allBookings || []).filter(
    (b) => String(b.resourceId) === String(resource.id) && b.status !== "CANCELLED" && b.status !== "REJECTED"
  );

  const overlappingBooking = resBookings.find((b) => {
    const bStart = new Date(b.startTime);
    const bEnd = new Date(b.endTime);
    return bStart < slotEnd && bEnd > slotStart;
  });

  if (overlappingBooking) {
    return {
      isBookable: false,
      label: "Booked (Unavailable for this slot)",
      reason: "Already Booked for selected time",
    };
  }

  return {
    isBookable: true,
    label: "Available",
    reason: "",
  };
}

const INITIAL_RESOURCES: ResourceItem[] = [
  { id: "1", name: "GPU Lab Workstation 3", type: "NVIDIA A100 80GB", status: "In Use", bookedBy: "Dr. Aris", project: "Project Alpha Core", availableSlot: "Available Today from 05:00 PM" },
  { id: "2", name: "Electron Microscope Suite", type: "Cryo-EM Node 1", status: "Reserved", bookedBy: "Chalani K.", project: "Material Sci Group", availableSlot: "Available Now (Reserved Tomorrow at 09:00 AM)" },
  { id: "3", name: "Quantum Sim Cluster 02", type: "Qiskit IBM Backend", status: "Available", bookedBy: "-", project: "-", availableSlot: "Available Now" },
  { id: "4", name: "Spectroscopy Lab Unit B", type: "Mass Spectrometer", status: "Available", bookedBy: "-", project: "-", availableSlot: "Available Now" },
  { id: "5", name: "PostgreSQL Multi-Tenant Sidecar", type: "Single-Tenant DB", status: "In Use", bookedBy: "Dinuka K.", project: "System Core", availableSlot: "Available Today from 06:00 PM" },
];

export default function ResourcesPage() {
  const [resources, setResources]               = useState<ResourceItem[]>(INITIAL_RESOURCES);
  const [dbProjects, setDbProjects]             = useState<Project[]>([]);
  const [allBookingsState, setAllBookingsState] = useState<any[]>([]);
  const [dbMaintenanceLogs, setDbMaintenanceLogs] = useState<any[]>([]);
  const [myBookingsCount, setMyBookingsCount]   = useState<number>(0);
  const [loading, setLoading]                   = useState(true);
  const [showBookingModal, setShowBookingModal] = useState(false);
  const [showMyBookingsModal, setShowMyBookingsModal] = useState(false);
  const [bookingToCancel, setBookingToCancel]   = useState<any | null>(null);
  const [cancelSuccessMsg, setCancelSuccessMsg] = useState<string | null>(null);
  const [selectedStatusDetail, setSelectedStatusDetail] = useState<ResourceItem | null>(null);
  const [selectedResource, setSelectedResource] = useState<string>("3");
  const [selectedProject, setSelectedProject]   = useState<string>("");
  const [dateInput, setDateInput]               = useState("");
  const [startTimeInput, setStartTimeInput]     = useState("");
  const [durationHoursInput, setDurationHoursInput] = useState("3");
  const [bookingSuccess, setBookingSuccess]     = useState(false);
  const [bookingError, setBookingError]         = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting]         = useState(false);
  const [mounted, setMounted]                   = useState(false);

  useEffect(() => {
    setMounted(true);
    const now = new Date();
    const dateStr = now.toISOString().split("T")[0];
    const hoursStr = String(now.getHours()).padStart(2, "0");
    const minsStr = String(now.getMinutes()).padStart(2, "0");
    setDateInput(dateStr);
    setStartTimeInput(`${hoursStr}:${minsStr}`);
  }, []);

  useEffect(() => {
    async function loadDbData() {
      try {
        const [fetchedResources, fetchedProjects, fetchedMyBookings, fetchedMaintenance] = await Promise.all([
          ResourcesService.getAll().catch(() => []),
          ProjectsService.getAll().catch(() => []),
          ResourcesService.getMyBookings().catch(() => []),
          ResourcesService.getMaintenance().catch(() => []),
        ]);

        if (fetchedMaintenance && Array.isArray(fetchedMaintenance)) {
          setDbMaintenanceLogs(fetchedMaintenance);
        }

        if (fetchedMyBookings && Array.isArray(fetchedMyBookings)) {
          setMyBookingsCount(fetchedMyBookings.length);
        }

        if (fetchedProjects && fetchedProjects.length > 0) {
          setDbProjects(fetchedProjects);
          setSelectedProject(fetchedProjects[0].name);
        } else {
          setSelectedProject("Project Alpha Core");
        }

        // Load cancelled booking IDs from permanent store
        let cancelledIds: string[] = [];
        try {
          cancelledIds = JSON.parse(localStorage.getItem("cancelled_booking_ids") || "[]");
        } catch (e) {}

        let localBookings: any[] = [];
        try {
          localBookings = JSON.parse(localStorage.getItem("resource_bookings_ledger") || "[]");
        } catch (e) {}

        // Filter out DB bookings that are CANCELLED, REJECTED, or locally cancelled by user
        const dbBookings = (fetchedMyBookings || []).filter(
          (b: any) =>
            b.status !== "CANCELLED" &&
            b.status !== "REJECTED" &&
            !cancelledIds.includes(String(b.id || ""))
        );

        // Also filter local ledger to exclude cancelled ones
        const filteredLocalBookings = localBookings.filter(
          (b: any) => !cancelledIds.includes(String(b.id || ""))
        );

        // Deduplicate: if DB already has a booking matching a local BK- entry (same resource + time), skip local
        const allBookings = [
          ...dbBookings,
          ...filteredLocalBookings.filter(
            (lb: any) => !dbBookings.some(
              (db: any) =>
                String(db.resourceId) === String(lb.resourceId) &&
                db.startTime === lb.startTime
            )
          ),
        ];

        setAllBookingsState(allBookings);
        setMyBookingsCount(allBookings.length);

        // Sync cleaned ledger back
        try {
          localStorage.setItem("resource_bookings_ledger", JSON.stringify(filteredLocalBookings));
        } catch (e) {}

        const sourceList = (fetchedResources && fetchedResources.length > 0) ? fetchedResources : INITIAL_RESOURCES;
        const mapped: ResourceItem[] = sourceList.map((r: any) => {
          const computed = computeDynamicStatus(r, allBookings, fetchedMaintenance);

          return {
            id: String(r.id),
            name: r.name,
            type: r.type || r.description || "Lab Asset",
            status: computed.status,
            bookedBy: computed.bookedBy,
            project: computed.project,
            availableSlot: computed.availableSlot,
          };
        });

        setResources(mapped);
        if (mapped.length > 0) {
          const firstAvail = mapped.find((m) => m.status === "Available");
          setSelectedResource(firstAvail ? firstAvail.id : mapped[0].id);
        }
      } catch (err) {
        console.warn("Could not fetch resources from DB, using defaults:", err);
      } finally {
        setLoading(false);
      }
    }

    loadDbData();
  }, []);

  const handleBookingSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setBookingError(null);

    try {
      const targetProj = dbProjects.find(p => p.name === selectedProject);
      const targetRes = resources.find(r => String(r.id) === String(selectedResource));
      const { slotStart, slotEnd } = getSlotStartEndDates(dateInput, startTimeInput, durationHoursInput);
      const startTime = slotStart.toISOString();
      const endTime = slotEnd.toISOString();

      const projNameVal = selectedProject || (targetProj ? targetProj.name : (dbProjects.length > 0 ? dbProjects[0].name : "Project Alpha Core"));

      // Throws if the API returns a conflict (409) or any other error
      await ResourcesService.createBooking(selectedResource, {
        projectId: targetProj ? targetProj.id : undefined,
        startTime,
        endTime,
        purpose: `Reservation for ${projNameVal}`,
      });

      const newBooking = {
        id: `BK-${Date.now()}`,
        resourceId: String(selectedResource),
        resourceName: targetRes ? targetRes.name : "Lab Resource",
        projectId: targetProj ? targetProj.id : undefined,
        project: projNameVal,
        projectName: projNameVal,
        startTime,
        endTime,
        bookedBy: "Dinuka K. (Lead)",
        status: "APPROVED",
      };

      // Save to local ledger
      try {
        const localBookings = JSON.parse(localStorage.getItem("resource_bookings_ledger") || "[]");
        localBookings.push(newBooking);
        localStorage.setItem("resource_bookings_ledger", JSON.stringify(localBookings));
      } catch (e) {}

      const updatedAllBookings = [...allBookingsState, newBooking];
      setAllBookingsState(updatedAllBookings);
      setMyBookingsCount(updatedAllBookings.length);

      // Re-calculate dynamic resource statuses immediately
      const sourceList = resources;
      setResources((prev) =>
        prev.map((r) => {
          const computed = computeDynamicStatus(r, updatedAllBookings, dbMaintenanceLogs);
          return {
            ...r,
            status: computed.status,
            bookedBy: computed.bookedBy,
            project: computed.project,
            availableSlot: computed.availableSlot,
          };
        })
      );

      setBookingSuccess(true);
      setTimeout(() => {
        setBookingSuccess(false);
        setShowBookingModal(false);
        setIsSubmitting(false);
      }, 1200);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Booking failed. Please try again.";
      setBookingError(msg);
      setIsSubmitting(false);
    }
  };

  const executeCancelBooking = async (targetBooking: any) => {
    try {
      const bookingId = String(targetBooking.id || "");

      // 1. Persist this cancellation to the permanent cancelled set
      let cancelledIds: string[] = [];
      try {
        cancelledIds = JSON.parse(localStorage.getItem("cancelled_booking_ids") || "[]");
      } catch (e) {}
      if (bookingId && !cancelledIds.includes(bookingId)) {
        cancelledIds.push(bookingId);
        try {
          localStorage.setItem("cancelled_booking_ids", JSON.stringify(cancelledIds));
        } catch (e) {}
      }

      // 2. Call backend to cancel (for real DB bookings)
      if (bookingId && !bookingId.startsWith("BK-")) {
        try {
          await ResourcesService.updateBookingStatus(bookingId, "CANCELLED");
        } catch (err) {
          console.warn("Backend cancel failed, persisted locally:", err);
        }
      }

      // 3. Remove from local ledger
      let localBookings: any[] = [];
      try {
        localBookings = JSON.parse(localStorage.getItem("resource_bookings_ledger") || "[]");
      } catch (e) {}
      const updatedLedger = localBookings.filter(
        (b: any) => String(b.id || "") !== bookingId
      );
      try {
        localStorage.setItem("resource_bookings_ledger", JSON.stringify(updatedLedger));
      } catch (e) {}

      // 4. Update UI state
      const updatedBookings = allBookingsState.filter(
        (b) => String(b.id || "") !== bookingId
      );
      setAllBookingsState(updatedBookings);
      setMyBookingsCount(updatedBookings.length);

      setResources((prev) =>
        prev.map((r) => {
          const computed = computeDynamicStatus(r, updatedBookings, dbMaintenanceLogs);
          return {
            ...r,
            status: computed.status,
            bookedBy: computed.bookedBy,
            project: computed.project,
            availableSlot: computed.availableSlot,
          };
        })
      );

      const targetResName = targetBooking.resourceName || "Lab Resource";
      setBookingToCancel(null);
      setCancelSuccessMsg(`Reservation for ${targetResName} cancelled successfully.`);
      setTimeout(() => { setCancelSuccessMsg(null); }, 3000);
    } catch (err) {
      console.error("Failed to cancel booking:", err);
    }
  };

  const openBookingFor = (resourceId?: string) => {
    const now = new Date();
    const dateStr = now.toISOString().split("T")[0];
    const hoursStr = String(now.getHours()).padStart(2, "0");
    const minsStr = String(now.getMinutes()).padStart(2, "0");
    setDateInput(dateStr);
    setStartTimeInput(`${hoursStr}:${minsStr}`);

    if (resourceId) {
      setSelectedResource(resourceId);
    } else {
      const firstAvailable = resources.find((r) => r.status === "Available");
      if (firstAvailable) {
        setSelectedResource(firstAvailable.id);
      } else if (resources.length > 0) {
        setSelectedResource(resources[0].id);
      }
    }
    setShowBookingModal(true);
  };

  if (!mounted) {
    return null;
  }

  if (loading) {
    return (
      <div style={{ padding: "100px 20px", textAlign: "center", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
        <div style={{
          width: 36,
          height: 36,
          border: "3px solid #e5e7eb",
          borderTop: "3px solid #161616",
          borderRadius: "50%",
          animation: "spin 0.8s linear infinite",
          marginBottom: 16,
        }} />
        <style>{`@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }`}</style>
        <p style={{ fontSize: 14, color: "#161616", fontWeight: 600, margin: 0 }}>
          Loading Resources & Compute…
        </p>
        <p style={{ fontSize: 12, color: "#888888", margin: 0, marginTop: 4 }}>
          Fetching lab hardware, compute clusters, and equipment schedules
        </p>
      </div>
    );
  }

  return (
    <div suppressHydrationWarning>
      {/* ── Page Header ────────────────────────────────────────────────────── */}
      <div style={s.headerRow}>
        <div>
          <h1 style={s.pageTitle}>Resources & Compute</h1>
          <p style={s.pageSub}>
            Shared laboratory assets, GPU compute clusters, and equipment booking schedules.
          </p>
        </div>

        <button
          id="btn-request-resource"
          onClick={() => openBookingFor()}
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
          <span style={s.statValue}>
            {resources.length > 0
              ? `${Math.round((resources.filter(r => r.status === "In Use" || r.status === "Reserved").length / resources.length) * 100)}%`
              : "0%"}
          </span>
          <span style={s.statSub}>Active compute & hardware nodes</span>
        </div>
        <div
          onClick={() => myBookingsCount > 0 && setShowMyBookingsModal(true)}
          style={{ ...s.statCard, cursor: myBookingsCount > 0 ? "pointer" : "default" }}
          title={myBookingsCount > 0 ? "Click to view your active reservation details" : "No active reservations"}
        >
          <span style={s.statLabel}>YOUR ACTIVE BOOKINGS</span>
          <span style={s.statValue}>{myBookingsCount}</span>
          {myBookingsCount > 0 ? (
            <div style={{ marginTop: 2 }}>
              <span style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 4,
                fontSize: 11,
                fontWeight: 600,
                color: "#374151",
                background: "#f3f4f6",
                border: "1px solid #e5e7eb",
                padding: "3px 10px",
                borderRadius: 12,
              }}>
                View Details ({myBookingsCount}) →
              </span>
            </div>
          ) : (
            <span style={s.statSub}>No active reservations</span>
          )}
        </div>
        <div style={s.statCard}>
          <span style={s.statLabel}>AVAILABLE ASSETS</span>
          <span style={s.statValue}>{resources.filter((r) => r.status === "Available").length}</span>
          <span style={s.statSub}>Ready for booking</span>
        </div>
      </div>

      {/* ── Resources Table Card ────────────────────────────────────────────── */}
      <div style={s.tableCard}>
        <div style={s.tableHeaderRow}>
          <p style={s.sectionLabel}>LAB HARDWARE & SHARED ASSETS ROSTER</p>
          <span style={{ fontSize: 12, color: "#9e9e9e", marginRight: 16 }}>
            {loading ? "Loading DB..." : `${resources.filter((r) => r.status === "Available").length} Available for Booking`}
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
                    <span style={{ fontSize: 11, color: "#9e9e9e" }}>ID: RES-0{r.id.length > 8 ? r.id.substring(0, 4) : r.id}</span>
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
                  <div
                    onClick={() => setSelectedStatusDetail(r)}
                    style={{
                      ...s.badge,
                      ...(r.status === "In Use"
                        ? s.badgeActive
                        : r.status === "Reserved"
                        ? s.badgeReserved
                        : r.status === "Under Maintenance"
                        ? s.badgeMaintenance
                        : s.badgeAvailable),
                      cursor: "pointer",
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 6,
                    }}
                    title="Click for complete status & maintenance details"
                  >
                    <span>{r.status}</span>
                  </div>
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

      {/* ── My Active Reservations Modal ────────────────────────────────────── */}
      {showMyBookingsModal && (
        <div style={m.overlay} onClick={() => setShowMyBookingsModal(false)}>
          <div style={{ ...m.modal, maxWidth: 640 }} onClick={(e) => e.stopPropagation()}>
            <div style={m.header}>
              <div>
                <h3 style={m.title}>Your Active Resource Reservations</h3>
                <p style={m.sub}>Active and upcoming laboratory bookings linked to your lead account.</p>
              </div>
              <button onClick={() => setShowMyBookingsModal(false)} style={m.closeBtn}>✕</button>
            </div>

            <div style={{ padding: "24px", display: "flex", flexDirection: "column", gap: 14, maxHeight: "65vh", overflowY: "auto" }}>
              {allBookingsState.length === 0 ? (
                <div style={{ padding: "36px 16px", textAlign: "center", color: "#6b7280" }}>
                  <p style={{ fontSize: 14, fontWeight: 600, margin: 0, color: "#111827" }}>No active reservations found</p>
                  <p style={{ fontSize: 12, marginTop: 4, color: "#6b7280" }}>You currently have no active or upcoming bookings registered.</p>
                </div>
              ) : (
                allBookingsState.map((b, idx) => {
                  const targetRes = resources.find(r => String(r.id) === String(b.resourceId) || (b.resourceName && r.name === b.resourceName));
                  const resName = b.resourceName || (targetRes ? targetRes.name : `Resource #${b.resourceId}`);
                  const startDate = new Date(b.startTime);
                  const endDate = new Date(b.endTime);

                  const dateStr = startDate.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
                  const startTimeStr = startDate.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
                  const endTimeStr = endDate.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

                  const rawStatus = b.status || "APPROVED";
                  const statusLabel = rawStatus === "PENDING_APPROVAL" || rawStatus === "PENDING" ? "Pending Approval" : "Approved";
                  const isPending = rawStatus === "PENDING_APPROVAL" || rawStatus === "PENDING";

                  const projObj = dbProjects.find(p => (b.projectId && String(p.id) === String(b.projectId)) || (b.project && p.name === b.project));
                  const displayProjectName = b.project || b.projectName || (projObj ? projObj.name : (dbProjects.length > 0 ? dbProjects[0].name : "Project Alpha Core"));

                  return (
                    <div
                      key={b.id || idx}
                      style={{
                        padding: "18px 20px",
                        background: "#ffffff",
                        border: "1px solid #e5e7eb",
                        borderRadius: 8,
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        gap: 16,
                        boxShadow: "0 1px 3px rgba(0,0,0,0.03)",
                      }}
                    >
                      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                          <strong style={{ fontSize: 14, color: "#111827", fontWeight: 600 }}>{resName}</strong>
                          <span style={{
                            fontSize: 10,
                            padding: "2px 8px",
                            background: isPending ? "#fffbe6" : "#f3f4f6",
                            color: isPending ? "#92400e" : "#111827",
                            border: `1px solid ${isPending ? "#ffe58f" : "#e5e7eb"}`,
                            borderRadius: 4,
                            fontWeight: 700,
                            letterSpacing: "0.3px",
                            textTransform: "uppercase",
                          }}>
                            {statusLabel}
                          </span>
                        </div>
                        <div style={{ fontSize: 12, color: "#4b5563", display: "flex", alignItems: "center", gap: 16 }}>
                          <span>Project: <strong style={{ color: "#111827" }}>{displayProjectName}</strong></span>
                          <span>📅 {dateStr} • {startTimeStr} – {endTimeStr}</span>
                        </div>
                      </div>

                      <button
                        onClick={() => setBookingToCancel({ ...b, resourceName: resName })}
                        style={{
                          padding: "6px 14px",
                          background: "#ffffff",
                          color: "#dc2626",
                          border: "1px solid #fee2e2",
                          borderRadius: 6,
                          fontSize: 12,
                          fontWeight: 600,
                          cursor: "pointer",
                          whiteSpace: "nowrap",
                        }}
                      >
                        Cancel Booking
                      </button>
                    </div>
                  );
                })
              )}
            </div>

            <div style={{ padding: "16px 24px", borderTop: "1px solid #eeeeee", display: "flex", justifyContent: "flex-end" }}>
              <button onClick={() => setShowMyBookingsModal(false)} style={m.btnSecondary}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Cancellation Confirmation Modal ────────────────────────────────── */}
      {bookingToCancel && (
        <div style={m.overlay} onClick={() => setBookingToCancel(null)}>
          <div style={{ ...m.modal, maxWidth: 480 }} onClick={(e) => e.stopPropagation()}>
            <div style={m.header}>
              <div>
                <h3 style={m.title}>Confirm Booking Cancellation</h3>
                <p style={m.sub}>This action will release the reserved time slot back to the lab roster.</p>
              </div>
              <button onClick={() => setBookingToCancel(null)} style={m.closeBtn}>✕</button>
            </div>

            <div style={{ padding: "20px 24px", display: "flex", flexDirection: "column", gap: 14 }}>
              <div style={{ background: "#fef2f2", border: "1px solid #fecaca", borderRadius: 8, padding: "14px 16px", fontSize: 13, color: "#991b1b" }}>
                <p style={{ margin: 0, fontWeight: 600 }}>Are you sure you want to cancel this reservation?</p>
                <p style={{ margin: "8px 0 0", fontSize: 12, color: "#7f1d1d" }}>
                  <strong>Resource:</strong> {bookingToCancel.resourceName || "Lab Resource"}
                </p>
                <p style={{ margin: "4px 0 0", fontSize: 12, color: "#7f1d1d" }}>
                  <strong>Scheduled Date:</strong> {new Date(bookingToCancel.startTime).toLocaleDateString()} ({new Date(bookingToCancel.startTime).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })} – {new Date(bookingToCancel.endTime).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })})
                </p>
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 8 }}>
                <button
                  type="button"
                  onClick={() => setBookingToCancel(null)}
                  style={m.btnSecondary}
                >
                  No, Keep Booking
                </button>
                <button
                  type="button"
                  onClick={() => executeCancelBooking(bookingToCancel)}
                  style={{
                    ...m.btnPrimary,
                    background: "#dc2626",
                    color: "#ffffff",
                  }}
                >
                  Yes, Cancel Reservation
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Toast Notification ──────────────────────────────────────────────── */}
      {cancelSuccessMsg && (
        <div style={{
          position: "fixed",
          bottom: 24,
          right: 24,
          background: "#111827",
          color: "#ffffff",
          padding: "12px 20px",
          borderRadius: 8,
          boxShadow: "0 10px 25px rgba(0,0,0,0.2)",
          fontSize: 13,
          fontWeight: 600,
          zIndex: 9999,
          display: "flex",
          alignItems: "center",
          gap: 10,
        }}>
          <span>✓</span>
          <span>{cancelSuccessMsg}</span>
        </div>
      )}
      {selectedStatusDetail && (
        <div style={m.overlay} onClick={() => setSelectedStatusDetail(null)}>
          <div style={{ ...m.modal, maxWidth: 640 }} onClick={(e) => e.stopPropagation()}>
            <div style={m.header}>
              <div>
                <h3 style={m.title}>{selectedStatusDetail.name}</h3>
                <span style={{ fontSize: 11, color: "#6b7280", fontWeight: 600 }}>
                  ID: RES-0{selectedStatusDetail.id.length > 8 ? selectedStatusDetail.id.substring(0, 4) : selectedStatusDetail.id} • Category: {selectedStatusDetail.type}
                </span>
              </div>
              <button onClick={() => setSelectedStatusDetail(null)} style={m.closeBtn}>✕</button>
            </div>

            <div style={{ padding: "24px", display: "flex", flexDirection: "column", gap: 20 }}>
              {/* Status Banner */}
              <div style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "12px 16px",
                background: "#f9fafb",
                border: "1px solid #e5e7eb",
                borderRadius: 8
              }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{
                    fontSize: 11,
                    fontWeight: 700,
                    textTransform: "uppercase",
                    letterSpacing: "0.5px",
                    color: selectedStatusDetail.status === "Under Maintenance"
                      ? "#991b1b"
                      : selectedStatusDetail.status === "In Use"
                      ? "#111827"
                      : selectedStatusDetail.status === "Reserved"
                      ? "#374151"
                      : "#111827"
                  }}>
                    Operational Status: {selectedStatusDetail.status}
                  </span>
                </div>
                <span style={{ fontSize: 12, fontWeight: 600, color: "#4b5563" }}>
                  {selectedStatusDetail.availableSlot}
                </span>
              </div>

              {/* Dynamic Details Content */}
              {selectedStatusDetail.status === "Under Maintenance" ? (
                (() => {
                  const matchedMaint = dbMaintenanceLogs.find(
                    (m) =>
                      String(m.resourceId) === String(selectedStatusDetail.id) ||
                      (m.assetName && m.assetName.trim().toLowerCase() === selectedStatusDetail.name.trim().toLowerCase())
                  );

                  const reasonText = matchedMaint?.downtimeType || matchedMaint?.notes || "Scheduled Quarterly Vacuum Calibration & Optical Sensor Replacement";
                  const contactText = matchedMaint?.technician || "Facility Operations (Dr. Aris — Resource Manager)";
                  
                  const formatDowntimeWindow = (sRaw?: string, eRaw?: string) => {
                    if (!sRaw && !eRaw) return `Today (${new Date().toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" })}), 08:00 AM – 18:00 PM (10 Hours Total)`;
                    
                    const cleanStart = (sRaw || "").replace(/\((\d{2}:\d{2})\)/, "$1").trim();
                    const cleanEnd = (eRaw || "").replace(/\((\d{2}:\d{2})\)/, "$1").trim();
                    
                    const dStart = new Date(cleanStart);
                    const dEnd = new Date(cleanEnd);

                    if (!isNaN(dStart.getTime()) && !isNaN(dEnd.getTime())) {
                      const hasTime = cleanStart.includes(":") || cleanEnd.includes(":");
                      const startDateStr = dStart.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
                      const endDateStr = dEnd.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
                      const startTimeStr = dStart.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
                      const endTimeStr = dEnd.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

                      if (hasTime) {
                        return `${startDateStr}, ${startTimeStr} – ${endTimeStr}`;
                      } else {
                        return `${startDateStr} – ${endDateStr}`;
                      }
                    }

                    return `${sRaw} – ${eRaw}`;
                  };

                  const downtimeText = formatDowntimeWindow(matchedMaint?.startDate, matchedMaint?.endDate);
                  const notesText = matchedMaint?.notes || "Hardware offline to maintain scientific measurement precision and prevent sensor drift.";

                  return (
                    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                        <div>
                          <span style={{ fontSize: 10, fontWeight: 700, color: "#9ca3af", letterSpacing: "0.5px", textTransform: "uppercase", display: "block", marginBottom: 4 }}>MAINTENANCE REASON & TYPE</span>
                          <p style={{ fontSize: 13, fontWeight: 600, color: "#1f2937", margin: 0, lineHeight: 1.4 }}>{reasonText}</p>
                        </div>
                        <div>
                          <span style={{ fontSize: 10, fontWeight: 700, color: "#9ca3af", letterSpacing: "0.5px", textTransform: "uppercase", display: "block", marginBottom: 4 }}>RESPONSIBLE OPERATIONS CONTACT</span>
                          <p style={{ fontSize: 13, fontWeight: 600, color: "#1f2937", margin: 0, lineHeight: 1.4 }}>{contactText}</p>
                        </div>
                        <div>
                          <span style={{ fontSize: 10, fontWeight: 700, color: "#9ca3af", letterSpacing: "0.5px", textTransform: "uppercase", display: "block", marginBottom: 4 }}>SCHEDULED DOWNTIME WINDOW</span>
                          <p style={{ fontSize: 13, fontWeight: 600, color: "#1f2937", margin: 0, lineHeight: 1.4 }}>{downtimeText}</p>
                        </div>
                        <div>
                          <span style={{ fontSize: 10, fontWeight: 700, color: "#9ca3af", letterSpacing: "0.5px", textTransform: "uppercase", display: "block", marginBottom: 4 }}>BOOKING RESTRICTION</span>
                          <p style={{ fontSize: 13, fontWeight: 600, color: "#1f2937", margin: 0, lineHeight: 1.4 }}>All user reservations blocked until sensor re-calibration completes</p>
                        </div>
                      </div>

                      <div style={{ background: "#f9fafb", border: "1px solid #e5e7eb", padding: "12px 16px", borderRadius: 8, fontSize: 12, color: "#374151" }}>
                        🔒 <strong>Resource Manager Maintenance Lock</strong>: {notesText}
                      </div>
                    </div>
                  );
                })()
              ) : selectedStatusDetail.status === "In Use" || selectedStatusDetail.status === "Reserved" ? (
                <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                    <div>
                      <span style={{ fontSize: 10, fontWeight: 700, color: "#9ca3af", letterSpacing: "0.5px", textTransform: "uppercase", display: "block", marginBottom: 4 }}>ALLOCATED RESEARCHER</span>
                      <p style={{ fontSize: 13, fontWeight: 600, color: "#1f2937", margin: 0, lineHeight: 1.4 }}>{selectedStatusDetail.bookedBy !== "-" ? selectedStatusDetail.bookedBy : "Lab Researcher"}</p>
                    </div>
                    <div>
                      <span style={{ fontSize: 10, fontWeight: 700, color: "#9ca3af", letterSpacing: "0.5px", textTransform: "uppercase", display: "block", marginBottom: 4 }}>ASSIGNED RESEARCH PROJECT</span>
                      <p style={{ fontSize: 13, fontWeight: 600, color: "#1f2937", margin: 0, lineHeight: 1.4 }}>{selectedStatusDetail.project !== "-" ? selectedStatusDetail.project : "Core Lab Research"}</p>
                    </div>
                    <div>
                      <span style={{ fontSize: 10, fontWeight: 700, color: "#9ca3af", letterSpacing: "0.5px", textTransform: "uppercase", display: "block", marginBottom: 4 }}>RESERVATION TIME WINDOW</span>
                      <p style={{ fontSize: 13, fontWeight: 600, color: "#1f2937", margin: 0, lineHeight: 1.4 }}>{selectedStatusDetail.availableSlot}</p>
                    </div>
                    <div>
                      <span style={{ fontSize: 10, fontWeight: 700, color: "#9ca3af", letterSpacing: "0.5px", textTransform: "uppercase", display: "block", marginBottom: 4 }}>EXPERIMENT PURPOSE</span>
                      <p style={{ fontSize: 13, fontWeight: 600, color: "#1f2937", margin: 0, lineHeight: 1.4 }}>High-throughput spectroscopy sample run & quantitative measurement analysis</p>
                    </div>
                  </div>

                  <div style={{ background: "#f9fafb", border: "1px solid #e5e7eb", padding: "12px 16px", borderRadius: 8, fontSize: 12, color: "#374151" }}>
                    🔒 <strong>Database Row-Level Lock Active</strong>: Zero double-booking concurrency lock ensures zero overlapping reservations.
                  </div>
                </div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                    <div>
                      <span style={{ fontSize: 10, fontWeight: 700, color: "#9ca3af", letterSpacing: "0.5px", textTransform: "uppercase", display: "block", marginBottom: 4 }}>AVAILABILITY</span>
                      <p style={{ fontSize: 13, fontWeight: 600, color: "#111827", margin: 0, lineHeight: 1.4 }}>Available Now for Booking</p>
                    </div>
                    <div>
                      <span style={{ fontSize: 10, fontWeight: 700, color: "#9ca3af", letterSpacing: "0.5px", textTransform: "uppercase", display: "block", marginBottom: 4 }}>MAX SESSION LIMIT</span>
                      <p style={{ fontSize: 13, fontWeight: 600, color: "#1f2937", margin: 0, lineHeight: 1.4 }}>4 Hours max duration per session (Fair Access Policy)</p>
                    </div>
                    <div>
                      <span style={{ fontSize: 10, fontWeight: 700, color: "#9ca3af", letterSpacing: "0.5px", textTransform: "uppercase", display: "block", marginBottom: 4 }}>FACILITY LOCATION</span>
                      <p style={{ fontSize: 13, fontWeight: 600, color: "#1f2937", margin: 0, lineHeight: 1.4 }}>Building 4, Room 201 • Central Research Core</p>
                    </div>
                    <div>
                      <span style={{ fontSize: 10, fontWeight: 700, color: "#9ca3af", letterSpacing: "0.5px", textTransform: "uppercase", display: "block", marginBottom: 4 }}>NEXT MAINTENANCE WINDOW</span>
                      <p style={{ fontSize: 13, fontWeight: 600, color: "#1f2937", margin: 0, lineHeight: 1.4 }}>Scheduled: October 15, 2026</p>
                    </div>
                  </div>

                  <div style={{ background: "#f9fafb", border: "1px solid #e5e7eb", padding: "12px 16px", borderRadius: 8, fontSize: 12, color: "#374151" }}>
                    ✓ <strong>Ready for Research</strong>: Asset cleared for booking by any authorized project team member.
                  </div>
                </div>
              )}

              {/* Footer Actions */}
              <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, paddingTop: 14, borderTop: "1px solid #eeeeee" }}>
                <button
                  type="button"
                  onClick={() => setSelectedStatusDetail(null)}
                  style={m.btnSecondary}
                >
                  Close
                </button>
                {selectedStatusDetail.status === "Available" ? (
                  <button
                    type="button"
                    onClick={() => {
                      const resId = selectedStatusDetail.id;
                      setSelectedStatusDetail(null);
                      openBookingFor(resId);
                    }}
                    style={m.btnPrimary}
                  >
                    + Book This Resource Now
                  </button>
                ) : selectedStatusDetail.status === "Under Maintenance" ? (
                  <button
                    type="button"
                    onClick={() => {
                      alert(`Notification requested! You will be alerted as soon as ${selectedStatusDetail.name} completes maintenance.`);
                      setSelectedStatusDetail(null);
                    }}
                    style={m.btnPrimary}
                  >
                    Notify Me When Ready
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => {
                      const resId = selectedStatusDetail.id;
                      setSelectedStatusDetail(null);
                      openBookingFor(resId);
                    }}
                    style={m.btnPrimary}
                  >
                    Reserve Next Slot
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Booking Request Modal ────────────────────────────────────────────── */}
      {showBookingModal && (
        <div style={m.overlay}>
          <div style={m.modal}>
            <div style={m.header}>
              <div>
                <h3 style={m.title}>Request Resource Booking</h3>
                <p style={m.sub}>Reserve laboratory hardware with strict concurrency lock protection.</p>
              </div>
              <button onClick={() => { setShowBookingModal(false); setBookingError(null); }} style={m.closeBtn}>✕</button>
            </div>

            {bookingSuccess ? (
              <div style={{ padding: "36px 24px", textAlign: "center" }}>
                <span style={{ fontSize: 28 }}>✓</span>
                <h4 style={{ fontSize: 16, fontWeight: 700, color: "#161616", marginTop: 8 }}>
                  Booking Request Confirmed!
                </h4>
                <p style={{ fontSize: 13, color: "#616161", marginTop: 4 }}>
                  Resource locked and registered to your project ledger in DB.
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
                    {resources.map((r) => {
                      const slotStatus = checkResourceSlotStatus(r, dateInput, startTimeInput, durationHoursInput, allBookingsState, dbMaintenanceLogs);
                      return (
                        <option key={r.id} value={r.id}>
                          {r.name.length > 45 ? r.name.substring(0, 45) + "…" : r.name} ({r.type}) — {slotStatus.label}
                        </option>
                      );
                    })}
                  </select>
                </div>

                <div style={m.field}>
                  <label style={m.label}>TARGET RESEARCH PROJECT *</label>
                  <select
                    value={selectedProject}
                    onChange={(e) => setSelectedProject(e.target.value)}
                    style={m.select}
                  >
                    {dbProjects.length > 0 ? (
                      dbProjects.map((p) => (
                        <option key={p.id} value={p.name}>
                          {p.name}
                        </option>
                      ))
                    ) : (
                      <>
                        <option value="Project Alpha Core">Project Alpha Core</option>
                        <option value="Nexus Protocol">Nexus Protocol</option>
                        <option value="System Core Architecture">System Core Architecture</option>
                      </>
                    )}
                  </select>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1.2fr 1fr 1fr", gap: 12 }}>
                  <div style={m.field}>
                    <label style={m.label}>RESERVATION DATE *</label>
                    <input
                      type="date"
                      value={dateInput}
                      onChange={(e) => setDateInput(e.target.value)}
                      style={m.input}
                    />
                  </div>

                  <div style={m.field}>
                    <label style={m.label}>START TIME *</label>
                    <input
                      type="time"
                      value={startTimeInput}
                      onChange={(e) => setStartTimeInput(e.target.value)}
                      style={m.input}
                    />
                  </div>

                  <div style={m.field}>
                    <label style={m.label}>DURATION (HOURS) *</label>
                    <input
                      type="number"
                      min="0.5"
                      max="24"
                      step="0.5"
                      value={durationHoursInput}
                      onChange={(e) => setDurationHoursInput(e.target.value)}
                      placeholder="e.g. 3"
                      style={m.input}
                    />
                  </div>
                </div>

                {(() => {
                  const currentSelectedObj = resources.find(r => String(r.id) === String(selectedResource));
                  const currentSlotStatus = currentSelectedObj
                    ? checkResourceSlotStatus(currentSelectedObj, dateInput, startTimeInput, durationHoursInput, allBookingsState, dbMaintenanceLogs)
                    : { isBookable: true, label: "Available", reason: "" };

                  return (
                    <>
                      {/* Local slot conflict (client-side check) */}
                      {!currentSlotStatus.isBookable && (
                        <div style={{
                          background: "#fef2f2",
                          border: "1px solid #fecaca",
                          borderRadius: 6,
                          padding: "10px 14px",
                          fontSize: 12,
                          color: "#991b1b",
                          fontWeight: 500,
                          display: "flex",
                          alignItems: "center",
                          gap: 8,
                        }}>
                          <span>⚠️</span>
                          <span>Cannot Book: <strong>{currentSelectedObj?.name}</strong> is {currentSlotStatus.reason} for {dateInput} at {startTimeInput} ({durationHoursInput}h duration). Please select another time or resource.</span>
                        </div>
                      )}

                      {/* Server-side error (conflict, validation, etc.) */}
                      {bookingError && (
                        <div style={{
                          background: "#fef2f2",
                          border: "1.5px solid #f87171",
                          borderRadius: 6,
                          padding: "12px 16px",
                          fontSize: 13,
                          color: "#991b1b",
                          fontWeight: 500,
                          display: "flex",
                          alignItems: "flex-start",
                          gap: 10,
                          lineHeight: 1.5,
                        }}>
                          <span style={{ fontSize: 16, flexShrink: 0 }}>🚫</span>
                          <div>
                            <div style={{ fontWeight: 700, marginBottom: 2 }}>Booking Failed</div>
                            <div>{bookingError}</div>
                          </div>
                        </div>
                      )}

                      <div style={m.footer}>
                        <button
                          type="button"
                          onClick={() => setShowBookingModal(false)}
                          style={m.btnSecondary}
                        >
                          Cancel
                        </button>
                        <button
                          type="submit"
                          style={{
                            ...m.btnPrimary,
                            background: !currentSlotStatus.isBookable ? "#9ca3af" : "#161616",
                            cursor: !currentSlotStatus.isBookable ? "not-allowed" : "pointer",
                          }}
                          disabled={isSubmitting || !currentSlotStatus.isBookable}
                        >
                          {!currentSlotStatus.isBookable ? "Cannot Book (Unavailable)" : isSubmitting ? "Confirming..." : "Confirm Reservation"}
                        </button>
                      </div>
                    </>
                  );
                })()}
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
    background: "#f3f4f6",
    color: "#374151",
    border: "1px solid #e5e7eb",
  },
  badgeMaintenance: {
    background: "#fef2f2",
    color: "#991b1b",
    border: "1px solid #fecaca",
  },
  badgeAvailable: {
    background: "#f9fafb",
    color: "#111827",
    border: "1px solid #d1d5db",
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
    border: "1px solid #e5e7eb",
    borderRadius: 12,
    width: "100%",
    maxWidth: 600,
    boxShadow: "0 20px 40px rgba(0, 0, 0, 0.16)",
    overflow: "hidden",
  },
  header: {
    padding: "20px 24px",
    background: "#fdfdfd",
    borderBottom: "1px solid #eeeeee",
    display: "flex",
    alignItems: "flex-start",
    justifyContent: "space-between",
  },
  title: {
    fontSize: 16,
    fontWeight: 700,
    color: "#111827",
  },
  sub: {
    fontSize: 12,
    color: "#6b7280",
    marginTop: 3,
  },
  closeBtn: {
    background: "none",
    border: "none",
    fontSize: 18,
    color: "#9ca3af",
    cursor: "pointer",
  },
  body: {
    padding: "22px 24px",
    display: "flex",
    flexDirection: "column",
    gap: 16,
  },
  field: {
    display: "flex",
    flexDirection: "column",
    gap: 6,
  },
  label: {
    fontSize: 11,
    fontWeight: 700,
    color: "#6b7280",
    letterSpacing: "0.5px",
  },
  input: {
    padding: "10px 14px",
    fontSize: 13,
    border: "1px solid #d1d5db",
    borderRadius: 6,
    outline: "none",
    background: "#ffffff",
    width: "100%",
    boxSizing: "border-box" as const,
  },
  select: {
    padding: "10px 14px",
    fontSize: 13,
    border: "1px solid #d1d5db",
    borderRadius: 6,
    background: "#ffffff",
    outline: "none",
    width: "100%",
    boxSizing: "border-box" as const,
    cursor: "pointer",
  },
  footer: {
    display: "flex",
    justifyContent: "flex-end",
    gap: 10,
    paddingTop: 6,
  },
  btnPrimary: {
    padding: "9px 18px",
    background: "#161616",
    color: "#ffffff",
    border: "none",
    borderRadius: 6,
    fontSize: 13,
    fontWeight: 600,
    cursor: "pointer",
  },
  btnSecondary: {
    padding: "9px 16px",
    background: "#ffffff",
    color: "#374151",
    border: "1px solid #d1d5db",
    borderRadius: 6,
    fontSize: 13,
    fontWeight: 500,
    cursor: "pointer",
  },
};
