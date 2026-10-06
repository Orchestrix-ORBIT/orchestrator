"use client";

import React, { useState, useEffect } from "react";
import LoadingState from "@/components/ui/LoadingState";
import { ResourcesService, type Resource } from "@/lib/services/resources";
import { ProjectsService, type Project } from "@/lib/services/projects";
import { NotificationsService } from "@/lib/services/notifications";
import { getRole } from "@/lib/auth";

interface ResourceItem {
  id: string;
  name: string;
  type: string;
  status: "In Use" | "Reserved" | "Available" | "Under Maintenance";
  bookedBy: string;
  project: string;
  availableSlot: string;
  location?: string;
  description?: string;
  maxDurationHours?: number;
  booking?: any;
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

// Normalizes booking timestamps that may have been stored with the UTC :00Z skew bug
function normalizeBooking(b: any): any {
  if (!b || !b.startTime) return b;
  const startObj = new Date(b.startTime);
  if (isNaN(startObj.getTime())) return b;

  const tzOffsetMinutes = new Date().getTimezoneOffset();
  if (tzOffsetMinutes === 0) return b; // In UTC, no offset distortion

  const tzOffsetMs = tzOffsetMinutes * 60 * 1000;
  const startMs = startObj.getTime();
  const createdMs = b.createdAt ? new Date(b.createdAt).getTime() : null;

  // If created recently and shifted forward by approximately the timezone offset (e.g. +5.5 hours in UTC+5:30)
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

function formatNameFromEmail(str: string): string {
  if (!str) return "Unknown";
  if (!str.includes("@")) return str;
  let namePart = str.split("@")[0];
  if (namePart.includes(".")) {
    const parts = namePart.split(".");
    namePart = parts[parts.length - 1]; 
  }
  return namePart.charAt(0).toUpperCase() + namePart.slice(1);
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

  // Check if ANY maintenance log is currently active (start <= now <= end)
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
      nextAvailableTime: nextAvailDate,
    };
  }

  // 1. Check if currently in use (startTime <= now <= endTime)
  const resBookings = (allBookings || [])
    .filter((b) => {
      const isIdMatch = String(b.resourceId) === String(resource.id);
      const isNameMatch = b.resourceName && resource.name && String(b.resourceName).trim().toLowerCase() === String(resource.name).trim().toLowerCase();
      return (isIdMatch || isNameMatch) && b.status !== "CANCELLED" && b.status !== "REJECTED";
    });

  const activeBooking = resBookings.find((b) => {
    const start = new Date(b.startTime);
    const end = new Date(b.endTime);
    // Treat as active if currently between start and end, or starting in the next 5 minutes
    const isStartedOrImminent = (now >= start || (start.getTime() - now.getTime() <= 5 * 60 * 1000));
    return isStartedOrImminent && now <= end;
  });

  if (activeBooking) {
    const endTimeObj = new Date(activeBooking.endTime);
    const isToday = endTimeObj.toDateString() === now.toDateString();
    const timeLabel = endTimeObj.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    const dateLabel = isToday ? "Today" : endTimeObj.toLocaleDateString(undefined, { month: "short", day: "numeric" });

    return {
      status: "In Use" as const,
      availableSlot: `Available ${dateLabel} from ${timeLabel}`,
      bookedBy: activeBooking.bookedBy || activeBooking.userName || "Lab Researcher",
      project: activeBooking.project || activeBooking.projectName || "Active Project",
      booking: activeBooking,
      nextAvailableTime: endTimeObj,
    };
  }

  // 2. Check if reserved for future time (startTime > now)
  const upcomingBooking = resBookings
    .filter((b) => new Date(b.startTime) > now)
    .sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime())[0];

  if (upcomingBooking) {
    const startDate = new Date(upcomingBooking.startTime);
    const isToday = startDate.toDateString() === now.toDateString();
    const dateLabel = isToday ? "Today" : startDate.toLocaleDateString(undefined, { month: "short", day: "numeric" });
    const timeLabel = startDate.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

    return {
      status: "Reserved" as const,
      availableSlot: `Reserved ${dateLabel} at ${timeLabel}`,
      bookedBy: upcomingBooking.bookedBy || upcomingBooking.userName || "Lab Researcher",
      project: upcomingBooking.project || upcomingBooking.projectName || "Scheduled Project",
      booking: upcomingBooking,
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
  const { slotStart, slotEnd } = getSlotStartEndDates(dateStr, startTimeStr, endTimeStr);

  const assetLogs = (maintenanceLogs || []).filter((m) => {
    const isIdMatch = m.resourceId && resource.id && String(m.resourceId) === String(resource.id);
    const isNameMatch = m.assetName && resource.name && String(m.assetName).trim().toLowerCase() === String(resource.name).trim().toLowerCase();
    return isIdMatch || isNameMatch;
  });

  // 1. Scheduled Maintenance Log Overlap Check
  let hasOverlappingMaintenanceLog = false;
  for (const m of assetLogs) {
    const dates = parseMaintenanceDates(m);
    if (dates && dates.start && dates.end) {
      if (slotStart < dates.end && slotEnd > dates.start) {
        hasOverlappingMaintenanceLog = true;
        return {
          isBookable: false,
          label: "Under Maintenance",
          reason: `Scheduled maintenance window (${dates.start.toLocaleDateString()} – ${dates.end.toLocaleDateString()})`,
        };
      }
    }
  }

  // 2. Static Maintenance Flag Check (if marked as maintenance globally but no specific logs overlap)
  if (!hasOverlappingMaintenanceLog && (resource.status === "MAINTENANCE" || resource.status === "Under Maintenance" || resource.status === "Maintenance")) {
      return {
          isBookable: false,
          label: "Under Maintenance",
          reason: "Asset is currently flagged for offline maintenance",
      };
  }

  // 3. Concurrent Booking Overlap Check
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
    return {
      isBookable: false,
      label: "Booked (Unavailable)",
      reason: `Already booked for selected time by ${overlappingBooking.userName || overlappingBooking.bookedBy || 'another researcher'}`,
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
  const [cancelReason, setCancelReason]         = useState<string>("");
  const [bookingToApprove, setBookingToApprove] = useState<any | null>(null);
  const [cancelSuccessMsg, setCancelSuccessMsg] = useState<string | null>(null);
  const [selectedStatusDetail, setSelectedStatusDetail] = useState<ResourceItem | null>(null);
  const [selectedResource, setSelectedResource] = useState<string>("3");
  const [selectedProject, setSelectedProject]   = useState<string>("");
  const [dateInput, setDateInput]               = useState("");
  const [startTimeInput, setStartTimeInput]     = useState("");
  const [endTimeInput, setEndTimeInput]         = useState("15:00");
  const [bookingSuccess, setBookingSuccess]     = useState(false);
  const [bookingError, setBookingError]         = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting]         = useState(false);
  const [mounted, setMounted]                   = useState(false);
  const [bookingTab, setBookingTab]             = useState<"ACTIVE" | "HISTORY">("ACTIVE");
  const [bookingDetailsModal, setBookingDetailsModal] = useState<any | null>(null);
  const [resourceDetailsModal, setResourceDetailsModal] = useState<ResourceItem | null>(null);
  const [highlightBookings, setHighlightBookings] = useState(false);
  const [resourceSearchQuery, setResourceSearchQuery] = useState("");
  const [isResourceDropdownOpen, setIsResourceDropdownOpen] = useState(false);
  const [pendingBookings, setPendingBookings] = useState<any[]>([]);
  const [rejectionModal, setRejectionModal] = useState<{ booking: any; reason: string } | null>(null);
  const [isProcessingAction, setIsProcessingAction] = useState(false);
  const [projectSearchQuery, setProjectSearchQuery] = useState("");
  const [isProjectDropdownOpen, setIsProjectDropdownOpen] = useState(false);

  useEffect(() => {
    setMounted(true);
    const now = new Date();
    const dateStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
    const hoursStr = String(now.getHours()).padStart(2, "0");
    const minsStr = String(now.getMinutes()).padStart(2, "0");
    setDateInput(dateStr);
    setStartTimeInput(`${hoursStr}:${minsStr}`);
    setEndTimeInput(`${String((now.getHours() + 1) % 24).padStart(2, "0")}:${minsStr}`);
  }, []);

  useEffect(() => {
    async function loadDbData() {
      try {
        const [fetchedResources, fetchedProjects, fetchedMaintenance, myBookings] = await Promise.all([
          ResourcesService.getAll().catch(() => []),
          ProjectsService.getAll().catch(() => []),
          ResourcesService.getMaintenance().catch(() => []),
          ResourcesService.getMyBookings().catch(() => []),
        ]);
        
        const myBookingIds = new Set((myBookings || []).map((b: any) => String(b.id)));

        // Fetch bookings for all resources in parallel to ensure we get TEAM bookings
        const bookingResults = await Promise.all(
          (fetchedResources || []).map((r: any) =>
            ResourcesService.getBookings(r.id).catch(() => [])
          )
        );
        
        let allTeamBookings = bookingResults.flat();
        // Deduplicate
        allTeamBookings = allTeamBookings.filter((b, i, arr) => arr.findIndex(x => x.id === b.id) === i);

        if (fetchedMaintenance && Array.isArray(fetchedMaintenance)) {
          setDbMaintenanceLogs(fetchedMaintenance);
        }

        if (fetchedProjects && fetchedProjects.length > 0) {
          setDbProjects(fetchedProjects);
          setSelectedProject(fetchedProjects[0].name);
        } else {
          setSelectedProject("Project Alpha Core");
        }

        const normalizedDb = (allTeamBookings || []).map(normalizeBooking);

        // Include ALL bookings to support the history tab
        const dbBookings = normalizedDb
          .map((b: any) => {
            const isMine = myBookingIds.has(String(b.id));
            let resolvedBookedBy = b.bookedBy || b.userName || b.userEmail;
            if (resolvedBookedBy && resolvedBookedBy.includes("@")) {
               resolvedBookedBy = formatNameFromEmail(resolvedBookedBy);
            }
            if (!resolvedBookedBy && b.userId) resolvedBookedBy = `User ${b.userId.substring(0, 5)}`;
            if (!resolvedBookedBy) resolvedBookedBy = "Team Member";
            
            return {
              ...b,
              bookedBy: isMine ? "Dinuka K. (Lead)" : resolvedBookedBy,
              project: b.project || b.projectName || "Unknown Project",
            };
          });

        setAllBookingsState(dbBookings);

        // Separate pending bookings that need Lead approval
        const pending = dbBookings.filter((b: any) =>
          b.status === "PENDING" || b.status === "PENDING_APPROVAL"
        ).sort((a: any, b: any) => {
          const aTime = a.createdAt ? new Date(a.createdAt).getTime() : new Date(a.startTime).getTime();
          const bTime = b.createdAt ? new Date(b.createdAt).getTime() : new Date(b.startTime).getTime();
          return bTime - aTime;
        });
        setPendingBookings(pending);
        
        // Only count currently active bookings for the top stat metric
        const now = new Date();
        const activeCount = dbBookings.filter((b: any) => 
          b.status !== "CANCELLED" && 
          b.status !== "REJECTED" && 
          new Date(b.endTime) >= now
        ).length;
        setMyBookingsCount(activeCount);

        const sourceList = (fetchedResources && fetchedResources.length > 0) ? fetchedResources : INITIAL_RESOURCES;
        const mapped: ResourceItem[] = sourceList.map((r: any) => {
          const computed = computeDynamicStatus(r, dbBookings, fetchedMaintenance);

          return {
            id: String(r.id),
            name: r.name,
            type: r.type || r.description || "Lab Asset",
            status: computed.status,
            bookedBy: computed.bookedBy,
            project: computed.project,
            availableSlot: computed.availableSlot,
            nextAvailableTime: (computed as any).nextAvailableTime || undefined,
            location: r.location,
            description: r.description,
            maxDurationHours: r.maxDurationHours,
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
      const { slotStart, slotEnd } = getSlotStartEndDates(dateInput, startTimeInput, endTimeInput);
      const startTime = slotStart.toISOString();
      const endTime = slotEnd.toISOString();

      const projNameVal = selectedProject || (targetProj ? targetProj.name : (dbProjects.length > 0 ? dbProjects[0].name : "Project Alpha Core"));

      const createdBooking = await ResourcesService.createBooking(selectedResource, {
        projectId: targetProj ? targetProj.id : undefined,
        startTime,
        endTime,
        purpose: `Reservation for ${projNameVal}`,
      });

      // ── Role-based auto-approval ──────────────────────────────────────────
      // Research Lead (ROLE_LEAD / ROLE_ADMIN) → auto-approve immediately.
      // Regular Researcher (ROLE_MEMBER) → booking stays PENDING for Lead review.
      const currentRole = getRole() || "";
      const isLead = currentRole.includes("LEAD") || currentRole.includes("ADMIN") || currentRole.includes("OWNER");

      let finalStatus = createdBooking.status || (isLead ? "APPROVED" : "PENDING");

      if (isLead) {
        try {
          if (createdBooking.id && !createdBooking.id.startsWith("BK-")) {
            await ResourcesService.updateBookingStatus(createdBooking.id, "APPROVED");
            finalStatus = "APPROVED";
          }
        } catch (err) {
          console.warn("Auto-approve failed, using created status:", err);
        }
      }
      // If researcher, we intentionally leave status as PENDING (no updateBookingStatus call)

      const newBooking = {
        ...createdBooking,
        project: projNameVal,
        projectName: projNameVal,
        bookedBy: isLead ? "Dinuka K. (Lead)" : ((createdBooking as any).bookedBy || (createdBooking as any).userName || "Team Researcher"),
        startTime,
        endTime,
        status: finalStatus,
        createdAt: new Date().toISOString(),
      };

      const updatedAllBookings = [...allBookingsState, newBooking];
      setAllBookingsState(updatedAllBookings);
      setMyBookingsCount(updatedAllBookings.length);
      
      if (finalStatus === "PENDING" || finalStatus === "PENDING_APPROVAL") {
        setPendingBookings(prev => [newBooking, ...prev]);
      }

      // Re-calculate dynamic resource statuses immediately
      setResources((prev) =>
        prev.map((r) => {
          const computed = computeDynamicStatus(r, updatedAllBookings, dbMaintenanceLogs);
          return {
            ...r,
            status: computed.status,
            bookedBy: computed.bookedBy,
            project: computed.project,
            availableSlot: computed.availableSlot,
            nextAvailableTime: (computed as any).nextAvailableTime || undefined,
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

  // ── Approve a pending booking ─────────────────────────────────────────────
  const handleApproveBooking = async (booking: any) => {
    setIsProcessingAction(true);
    try {
      if (booking.id && !String(booking.id).startsWith("BK-")) {
        await ResourcesService.updateBookingStatus(String(booking.id), "APPROVED");
      }
      // Send approval notification to the researcher
      try {
        await NotificationsService.create({
          userId: booking.userId,
          type: "BOOKING",
          title: "✅ Booking Approved",
          message: `Your booking for "${booking.resourceName || "the resource"}" on ${new Date(booking.startTime).toLocaleDateString(undefined, { month: "short", day: "numeric" })} at ${new Date(booking.startTime).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })} has been approved by the Research Lead.`,
        });
      } catch (notifErr) {
        console.warn("Notification dispatch failed (non-critical):", notifErr);
      }
      // Update local state
      const updatedBooking = { ...booking, status: "APPROVED" };
      setAllBookingsState(prev => prev.map(b => b.id === booking.id ? updatedBooking : b));
      setPendingBookings(prev => prev.filter(b => b.id !== booking.id));
    } catch (err) {
      console.error("Approval failed:", err);
    } finally {
      setIsProcessingAction(false);
    }
  };

  // ── Reject a pending booking with reason ─────────────────────────────────
  const handleRejectBooking = async () => {
    if (!rejectionModal) return;
    const { booking, reason } = rejectionModal;
    setIsProcessingAction(true);
    try {
      if (booking.id && !String(booking.id).startsWith("BK-")) {
        await ResourcesService.updateBookingStatus(String(booking.id), "REJECTED", reason);
      }
      
      // Update local state
      setAllBookingsState(prev => prev.map(b => b.id === booking.id ? { ...b, status: "REJECTED" } : b));
      setPendingBookings(prev => prev.filter(b => b.id !== booking.id));
      setRejectionModal(null);
    } catch (err) {
      console.error("Rejection failed:", err);
    } finally {
      setIsProcessingAction(false);
    }
  };

  const executeCancelBooking = async (targetBooking: any, reason?: string) => {
    try {
      const bookingId = String(targetBooking.id || "");

      // 2. Call backend to cancel (for real DB bookings)
      if (bookingId && !bookingId.startsWith("BK-")) {
        try {
          await ResourcesService.updateBookingStatus(bookingId, "CANCELLED", reason);
        } catch (err) {
          console.warn("Backend cancel failed", err);
        }
      }

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

  const executeApproveBooking = async (targetBooking: any) => {
    try {
      const bookingId = String(targetBooking.id || "");
      if (bookingId && !bookingId.startsWith("BK-")) {
        try {
          await ResourcesService.updateBookingStatus(bookingId, "APPROVED");
        } catch (err) {
          console.warn("Backend approve failed", err);
        }
      }

      // Update in state
      const updatedAll = allBookingsState.map((b) =>
        String(b.id || "") === bookingId ? { ...b, status: "APPROVED" } : b
      );
      setAllBookingsState(updatedAll);

      // Re-calculate dynamic resource statuses
      setResources((prev) =>
        prev.map((r) => {
          const computed = computeDynamicStatus(r, updatedAll, dbMaintenanceLogs);
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
      setCancelSuccessMsg(`Reservation for ${targetResName} approved successfully.`);
      setTimeout(() => { setCancelSuccessMsg(null); }, 3000);
    } catch (err) {
      console.error("Failed to approve booking:", err);
    }
  };

  const openBookingFor = (resourceId?: string, targetTimeObj?: Date) => {
    let targetTime: Date;

    if (targetTimeObj) {
      // Explicit time passed in (e.g. from maintenance end or active booking end)
      targetTime = targetTimeObj;
    } else if (resourceId) {
      // No explicit time — compute next available from allBookingsState
      const now = new Date();
      const resBookings = allBookingsState
        .filter((b) => {
          const isIdMatch = String(b.resourceId) === String(resourceId);
          const targetRes = resources.find(r => String(r.id) === String(resourceId));
          const isNameMatch = targetRes && b.resourceName && String(b.resourceName).trim().toLowerCase() === String(targetRes.name).trim().toLowerCase();
          return (isIdMatch || isNameMatch) && b.status !== "CANCELLED" && b.status !== "REJECTED";
        })
        .filter((b) => new Date(b.endTime) > now)
        .sort((a, b) => new Date(a.endTime).getTime() - new Date(b.endTime).getTime());

      if (resBookings.length > 0) {
        // Next available is 1 minute after the last overlapping booking ends
        targetTime = new Date(new Date(resBookings[resBookings.length - 1].endTime).getTime() + 60000);
      } else {
        targetTime = now;
      }
    } else {
      targetTime = new Date();
    }

    const dateStr = `${targetTime.getFullYear()}-${String(targetTime.getMonth() + 1).padStart(2, "0")}-${String(targetTime.getDate()).padStart(2, "0")}`;
    const hoursStr = String(targetTime.getHours()).padStart(2, "0");
    const minsStr = String(targetTime.getMinutes()).padStart(2, "0");
    setDateInput(dateStr);
    setStartTimeInput(`${hoursStr}:${minsStr}`);

    const endTargetTime = new Date(targetTime.getTime() + 60 * 60 * 1000);
    const endHoursStr = String(endTargetTime.getHours()).padStart(2, "0");
    const endMinsStr = String(endTargetTime.getMinutes()).padStart(2, "0");
    setEndTimeInput(`${endHoursStr}:${endMinsStr}`);

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
      <LoadingState variant="resources" title="Loading Resources & Compute…" 
        subtitle="Fetching lab hardware, compute clusters, and equipment schedules" 
      />
    );
  }

  return (
    <div suppressHydrationWarning>
      <style>{`
        .premium-table-row {
          transition: all 0.2s ease;
        }
        .premium-table-row:hover {
          background-color: #f8fafc !important;
        }
        .premium-btn {
          transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
        }
        .premium-btn:hover:not(:disabled) {
          transform: translateY(-1px);
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
        }
        .premium-btn:active:not(:disabled) {
          transform: translateY(0);
        }
        .premium-tab {
          transition: all 0.2s ease;
        }
        .premium-tab:hover {
          background-color: rgba(0, 0, 0, 0.04);
        }
        .premium-tab-active {
          box-shadow: 0 1px 3px rgba(0,0,0,0.1), 0 1px 2px rgba(0,0,0,0.06);
        }
        .premium-input:focus {
          border-color: #4f46e5 !important;
          outline: none !important;
          box-shadow: 0 0 0 3px rgba(79, 70, 229, 0.1) !important;
        }
        .glass-modal {
          backdrop-filter: blur(8px);
          background-color: rgba(255, 255, 255, 0.95) !important;
        }
        button, tr, input, select {
          transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
        }
        button[style*="padding"]:hover:not(:disabled) {
          transform: translateY(-1px);
          box-shadow: 0 4px 12px rgba(15, 23, 42, 0.1) !important;
          filter: brightness(1.05);
        }
        button[style*="padding"]:active:not(:disabled) {
          transform: translateY(0);
          box-shadow: 0 1px 2px rgba(15, 23, 42, 0.1) !important;
        }
        button:disabled {
          opacity: 0.6;
          cursor: not-allowed !important;
        }
        tbody tr:hover {
          background-color: #f8fafc !important;
        }
        input:focus, select:focus {
          border-color: #0f172a !important;
          outline: none !important;
          box-shadow: 0 0 0 3px rgba(15, 23, 42, 0.1) !important;
        }
      `}</style>
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
        <div style={s.statCard} className="stat-card-hover">
          <span style={s.statLabel}>TOTAL ASSETS</span>
          <span style={s.statValue}>{resources.length}</span>
          <span style={s.statSub}>Managed hardware & nodes</span>
        </div>
        <div
          className="stat-card-hover"
          onClick={() => {
            document.getElementById("team-resource-bookings")?.scrollIntoView({ behavior: "smooth" });
            setHighlightBookings(true);
            setTimeout(() => setHighlightBookings(false), 2000);
          }}
          style={{ ...s.statCard, cursor: "pointer" }}
          title="Click to view team resource bookings"
        >
          <span style={s.statLabel}>TEAM ACTIVE BOOKINGS</span>
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
                border: "1px solid #f3f4f6",
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
        <div style={s.statCard} className="stat-card-hover">
          <span style={s.statLabel}>AVAILABLE ASSETS</span>
          <span style={s.statValue}>{resources.filter((r) => r.status !== "In Use" && r.status !== "Under Maintenance").length}</span>
          <span style={s.statSub}>Ready for booking</span>
        </div>
      </div>

      {/* ── Resources Table Card ────────────────────────────────────────────── */}
      <div style={s.tableCard}>
        <div style={s.tableHeaderRow}>
          <p style={s.sectionLabel}>LAB HARDWARE & SHARED ASSETS ROSTER</p>
          <span style={{ fontSize: 12, color: "#9e9e9e", marginRight: 16 }}>
            {loading ? "Loading DB..." : `${resources.filter((r) => r.status !== "In Use" && r.status !== "Under Maintenance").length} Available for Booking`}
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
              <tr key={r.id} style={s.tr} className="premium-table-row">
                <td style={s.td}>
                  <div 
                    style={{ display: "flex", flexDirection: "column", gap: 2, cursor: "pointer", transition: "opacity 0.2s" }}
                    onClick={() => setResourceDetailsModal(r)}
                    onMouseEnter={(e) => (e.currentTarget.style.opacity = "0.7")}
                    onMouseLeave={(e) => (e.currentTarget.style.opacity = "1")}
                  >
                    <strong style={{ color: "#111827" }}>{r.name}</strong>
                    <span style={{ fontSize: 11, color: "#9ca3af", fontFamily: "var(--font-mono)" }}>ID: RES-0{r.id.length > 8 ? r.id.substring(0, 4) : r.id}</span>
                  </div>
                </td>
                <td style={{ ...s.td, color: "#616161" }}>
                  <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                    <span>{r.type}</span>
                    {r.maxDurationHours && (
                      <span style={{ fontSize: 10, fontWeight: 700, background: "#eff6ff", color: "#1d4ed8", border: "1px solid #bfdbfe", borderRadius: 4, padding: "1px 6px", display: "inline-block", width: "fit-content" }}>
                        ⏱ Max {r.maxDurationHours}h
                      </span>
                    )}
                  </div>
                </td>
                <td style={{ ...s.td, color: "#111827", fontSize: 12 }}>{r.availableSlot}</td>
                <td style={s.td}>
                  {r.project !== "-" ? (
                    <div 
                      style={{ 
                        display: "flex", 
                        flexDirection: "column", 
                        gap: 1, 
                        cursor: r.booking ? "pointer" : "default",
                        transition: "opacity 0.2s"
                      }}
                      onClick={() => { if (r.booking) setBookingDetailsModal(r.booking); }}
                      onMouseEnter={(e) => { if (r.booking) e.currentTarget.style.opacity = "0.7"; }}
                      onMouseLeave={(e) => { if (r.booking) e.currentTarget.style.opacity = "1"; }}
                    >
                      <span style={{ fontWeight: 500, color: r.booking ? "#111827" : "inherit" }}>
                        {(r.bookedBy && (r.bookedBy.includes("Dinuka") || r.bookedBy.includes("(Lead)"))) ? "Me" : r.bookedBy}
                      </span>
                      <span style={{ fontSize: 11, color: r.booking ? "#4f46e5" : "#9e9e9e" }}>{r.project}</span>
                    </div>
                  ) : (
                    <span style={{ color: "#9e9e9e" }}>—</span>
                  )}
                </td>
                <td style={s.td}>
                  <div
                    onClick={() => {
                      if (r.booking) {
                        setBookingDetailsModal(r.booking);
                      } else {
                        setSelectedStatusDetail(r);
                      }
                    }}
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
                  ) : (r.bookedBy && (r.bookedBy.includes("Dinuka") || r.bookedBy.includes("(Lead)"))) ? (
                    <span style={{ fontSize: 12, color: "#2e7d32", fontWeight: 600 }}>
                      Your Booking
                    </span>
                  ) : (
                    <button
                      onClick={() => openBookingFor(r.id, (r as any).nextAvailableTime)}
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

      {/* ── Pending Approval Requests ────────────────────────────────────────── */}
      {pendingBookings.length > 0 && (
        <div style={{ ...s.tableCard, marginTop: 32 }}>
          <div style={{ ...s.tableHeaderRow, borderBottom: "1px solid #f3f4f6" }}>
            <p style={{ ...s.sectionLabel, paddingBottom: 0, borderBottom: "none", margin: 0, padding: "16px 20px" }}>PENDING APPROVAL REQUESTS ({pendingBookings.length})</p>
          </div>
          <table style={s.table}>
            <thead style={s.thead}>
              <tr>
                <th style={{...s.th, paddingLeft: 20}}>Resource</th>
                <th style={s.th}>Duration</th>
                <th style={s.th}>Requested By</th>
                <th style={s.th}>Project / Purpose</th>
                <th style={{...s.th, textAlign: "right", paddingRight: 20}}>Action</th>
              </tr>
            </thead>
            <tbody>
              {pendingBookings.map((b, idx) => {
                const isLast = idx === pendingBookings.length - 1;
                return (
                  <tr key={b.id} style={{ ...s.tr, borderBottom: isLast ? "none" : "1px solid #f3f4f6" }} className="premium-table-row">
                    <td style={{...s.td, paddingLeft: 20, fontWeight: 500, color: "#111827"}}>{b.resourceName || "Unknown"}</td>
                    <td style={{...s.td, color: "#6b7280"}}>
                      {new Date(b.startTime).toLocaleDateString(undefined, { month: "short", day: "numeric" })} <br/>
                      {new Date(b.startTime).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })} - {new Date(b.endTime).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                    </td>
                    <td style={s.td}>{b.userName || b.bookedBy || "Researcher"}</td>
                    <td style={{...s.td, color: "#6b7280"}}>
                      {b.projectName || b.project || "—"}<br/>
                      <span style={{ fontSize: 11 }}>{b.purpose || "No purpose provided"}</span>
                    </td>
                    <td style={{...s.td, textAlign: "right", paddingRight: 20}}>
                      <button
                        onClick={() => handleApproveBooking(b)}
                        disabled={isProcessingAction}
                        style={{ ...s.btnApprove, marginRight: 8, opacity: isProcessingAction ? 0.5 : 1 }}
                      >
                        Approve
                      </button>
                      <button
                        onClick={() => setRejectionModal({ booking: b, reason: "" })}
                        disabled={isProcessingAction}
                        style={{ ...s.btnReject, opacity: isProcessingAction ? 0.5 : 1 }}
                      >
                        Reject
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* ── Team Reservations Roster ────────────────────────────────────────────── */}
      {(() => {
        const now = new Date();
        const activeBookings = allBookingsState.filter(b => 
          b.status !== "CANCELLED" && b.status !== "REJECTED" && new Date(b.endTime) >= now
        ).sort((a, b) => {
          const aTime = a.createdAt ? new Date(a.createdAt).getTime() : new Date(a.startTime).getTime();
          const bTime = b.createdAt ? new Date(b.createdAt).getTime() : new Date(b.startTime).getTime();
          return bTime - aTime;
        });
        
        const historicalBookings = allBookingsState.filter(b => 
          b.status === "CANCELLED" || b.status === "REJECTED" || new Date(b.endTime) < now
        ).sort((a, b) => {
          const aTime = a.updatedAt ? new Date(a.updatedAt).getTime() : new Date(a.createdAt || a.startTime).getTime();
          const bTime = b.updatedAt ? new Date(b.updatedAt).getTime() : new Date(b.createdAt || b.startTime).getTime();
          return bTime - aTime;
        });
        
        const displayedBookings = bookingTab === "ACTIVE" ? activeBookings : historicalBookings;

        return (
          <div 
            id="team-resource-bookings" 
            style={{ 
              ...s.tableCard, 
              marginTop: 32,
              transition: "outline 0.3s ease-in-out, box-shadow 0.3s ease-in-out",
              outline: highlightBookings ? "2px solid #111827" : "none",
              boxShadow: highlightBookings ? "0 4px 20px rgba(17, 24, 39, 0.15)" : (s.tableCard as any).boxShadow
            }}
          >
            <div style={{ ...s.tableHeaderRow, borderBottom: "1px solid #f3f4f6" }}>
              <div style={{ display: "flex", alignItems: "center" }}>
                <p style={{ ...s.sectionLabel, paddingBottom: 0, borderBottom: "none", margin: 0, padding: "16px 20px" }}>TEAM RESOURCE BOOKINGS</p>
                
                <div style={{ display: "flex", background: "#f3f4f6", padding: 4, borderRadius: 8, marginLeft: 16 }}>
                  <button
                    onClick={() => setBookingTab("ACTIVE")}
                    style={{
                      padding: "6px 14px",
                      fontSize: 12,
                      fontWeight: 600,
                      borderRadius: 6,
                      border: "none",
                      cursor: "pointer",
                      background: bookingTab === "ACTIVE" ? "#ffffff" : "transparent",
                      color: bookingTab === "ACTIVE" ? "#111827" : "#6b7280",
                      boxShadow: bookingTab === "ACTIVE" ? "0 1px 3px rgba(0,0,0,0.1)" : "none",
                      transition: "all 0.2s"
                    }}
                  >
                    Active ({activeBookings.length})
                  </button>
                  <button
                    onClick={() => setBookingTab("HISTORY")}
                    style={{
                      padding: "6px 14px",
                      fontSize: 12,
                      fontWeight: 600,
                      borderRadius: 6,
                      border: "none",
                      cursor: "pointer",
                      background: bookingTab === "HISTORY" ? "#ffffff" : "transparent",
                      color: bookingTab === "HISTORY" ? "#111827" : "#6b7280",
                      boxShadow: bookingTab === "HISTORY" ? "0 1px 3px rgba(0,0,0,0.1)" : "none",
                      transition: "all 0.2s"
                    }}
                  >
                    History ({historicalBookings.length})
                  </button>
                </div>
              </div>
            </div>

            <div style={{ overflowX: "auto" }}>
              <table style={s.table}>
                <thead>
                  <tr>
                    <th style={{...s.th, width: "20%"}}>Researcher</th>
                    <th style={{...s.th, width: "25%"}}>Resource</th>
                    <th style={{...s.th, width: "20%"}}>Project</th>
                    <th style={{...s.th, width: "20%"}}>Schedule</th>
                    <th style={{...s.th, width: "15%", textAlign: "right"}}>Status & Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {displayedBookings.length === 0 ? (
                    <tr>
                      <td colSpan={5} style={{ ...s.td, textAlign: "center", color: "#6b7280", padding: "36px 0" }}>
                        No {bookingTab.toLowerCase()} team bookings found.
                      </td>
                    </tr>
                  ) : (
                    displayedBookings.map((b, idx) => {
                  const targetRes = resources.find(r => String(r.id) === String(b.resourceId) || (b.resourceName && r.name === b.resourceName));
                  const resName = b.resourceName || (targetRes ? targetRes.name : `Resource #${b.resourceId}`);
                  const startDate = new Date(b.startTime);
                  const endDate = new Date(b.endTime);

                  const isSameDay = startDate.toDateString() === endDate.toDateString();
                  const dateStr = isSameDay 
                    ? startDate.toLocaleDateString(undefined, { month: "short", day: "numeric" })
                    : `${startDate.toLocaleDateString(undefined, { month: "short", day: "numeric" })} – ${endDate.toLocaleDateString(undefined, { month: "short", day: "numeric" })}`;
                  const startTimeStr = startDate.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
                  const endTimeStr = endDate.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

                  const rawStatus = b.status || "APPROVED";
                  const isPending = rawStatus === "PENDING_APPROVAL" || rawStatus === "PENDING";
                  const statusLabel = isPending ? "Pending" : "Approved";
                  
                  const projObj = dbProjects.find(p => (b.projectId && String(p.id) === String(b.projectId)) || (b.project && p.name === b.project));
                  const displayProjectName = b.project || b.projectName || (projObj ? projObj.name : "Core Project");
                  const rawResearcherName = b.bookedBy || b.userName || "Lab Researcher";
                  const isMe = rawResearcherName.includes("Dinuka") || rawResearcherName.includes("(Lead)");
                  const researcherName = isMe ? "Me" : rawResearcherName;
                  const avatarText = isMe ? "ME" : researcherName.charAt(0).toUpperCase();

                  return (
                    <tr 
                      className="premium-table-row"
                      key={b.id || idx} 
                      style={{ ...s.tr, cursor: "pointer", transition: "background 0.2s" }}
                      onClick={() => setBookingDetailsModal(b)}
                      onMouseEnter={(e) => (e.currentTarget.style.background = "#f9fafb")}
                      onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                    >
                      <td style={s.td}>
                        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                          <div style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", width: 28, height: 28, borderRadius: "50%", background: isMe ? "#111827" : "#f3f4f6", color: isMe ? "#ffffff" : "#374151", fontSize: 11, fontWeight: 700, flexShrink: 0 }}>
                            {avatarText}
                          </div>
                          <span style={{ fontWeight: 600 }}>{researcherName}</span>
                        </div>
                      </td>
                      <td style={s.td}>
                        <span style={{ fontWeight: 500, color: "#111827" }}>{resName}</span>
                      </td>
                      <td style={s.td}>
                        <span style={{ fontSize: 12, color: "#4b5563" }}>{displayProjectName}</span>
                      </td>
                      <td style={s.td}>
                        <span style={{ fontSize: 12, color: "#4b5563" }}>
                          {dateStr} • {startTimeStr} – {isSameDay ? endTimeStr : `${endTimeStr}`}
                        </span>
                      </td>
                      <td style={{ ...s.td, textAlign: "right" }}>
                        <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", gap: 12 }}>
                          <span style={{
                            fontSize: 10,
                            padding: "3px 8px",
                            background: b.status === "CANCELLED" || b.status === "REJECTED" ? "#fef2f2" : (isPending ? "#fffbe6" : (b.status === "COMPLETED" || new Date(b.endTime) < new Date() ? "#f3f4f6" : "#ecfdf5")),
                            color: b.status === "CANCELLED" || b.status === "REJECTED" ? "#991b1b" : (isPending ? "#92400e" : (b.status === "COMPLETED" || new Date(b.endTime) < new Date() ? "#374151" : "#065f46")),
                            border: `1px solid ${b.status === "CANCELLED" || b.status === "REJECTED" ? "#fecaca" : (isPending ? "#ffe58f" : (b.status === "COMPLETED" || new Date(b.endTime) < new Date() ? "#d1d5db" : "#a7f3d0"))}`,
                            borderRadius: 4,
                            fontWeight: 700,
                            letterSpacing: "0.5px",
                            textTransform: "uppercase",
                          }}>
                            {b.status === "CANCELLED" ? "Cancelled" : b.status === "REJECTED" ? "Rejected" : new Date(b.endTime) < new Date() ? "Completed" : statusLabel}
                          </span>
                          {bookingTab === "ACTIVE" && (
                            <button
                              onClick={(e) => { e.stopPropagation(); setShowMyBookingsModal(true); }}
                              style={{
                                background: "none",
                                border: "none",
                                color: "#4f46e5",
                                fontSize: 12,
                                fontWeight: 600,
                                cursor: "pointer",
                                padding: "4px"
                              }}
                            >
                              Manage
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
      );
      })()}

      {/* ── My Active Reservations Modal ────────────────────────────────────── */}
      {showMyBookingsModal && (
        <div style={m.overlay} onClick={() => setShowMyBookingsModal(false)}>
          <div style={{ ...m.modal, maxWidth: 640 }} onClick={(e) => e.stopPropagation()}>
            <div style={m.header}>
              <div>
                <h3 style={m.title}>Manage Team Reservations</h3>
                <p style={m.sub}>Active and upcoming laboratory bookings across all researchers.</p>
              </div>
              <button onClick={() => setShowMyBookingsModal(false)} style={m.closeBtn}>✕</button>
            </div>

            <div style={{ padding: "24px", display: "flex", flexDirection: "column", gap: 14, maxHeight: "65vh", overflowY: "auto" }}>
              {(() => {
                const now = new Date();
                const activeModalBookings = allBookingsState.filter(b => 
                  b.status !== "CANCELLED" && b.status !== "REJECTED" && new Date(b.endTime) >= now
                );
                
                if (activeModalBookings.length === 0) {
                  return (
                    <div style={{ padding: "36px 16px", textAlign: "center", color: "#6b7280" }}>
                      <p style={{ fontSize: 14, fontWeight: 600, margin: 0, color: "#111827" }}>No active reservations found</p>
                      <p style={{ fontSize: 12, marginTop: 4, color: "#6b7280" }}>You currently have no active or upcoming bookings registered.</p>
                    </div>
                  );
                }

                return activeModalBookings.map((b, idx) => {
                  const targetRes = resources.find(r => String(r.id) === String(b.resourceId) || (b.resourceName && r.name === b.resourceName));
                  const resName = b.resourceName || (targetRes ? targetRes.name : `Resource #${b.resourceId}`);
                  const startDate = new Date(b.startTime);
                  const endDate = new Date(b.endTime);

                  const isSameDay = startDate.toDateString() === endDate.toDateString();
                  const dateStr = isSameDay 
                    ? startDate.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" })
                    : `${startDate.toLocaleDateString(undefined, { month: "short", day: "numeric" })} – ${endDate.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" })}`;
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
                        border: "1px solid #f3f4f6",
                        borderRadius: 12,
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        gap: 16,
                        boxShadow: "0 10px 25px -5px rgba(0, 0, 0, 0.05), 0 8px 10px -6px rgba(0, 0, 0, 0.01)",
                      }}
                    >
                      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                          <strong style={{ fontSize: 14, color: "#111827", fontWeight: 600 }}>{resName}</strong>
                          <span style={{
                            fontSize: 10,
                            padding: "2px 8px",
                            background: isPending ? "#fffbe6" : "#ecfdf5",
                            color: isPending ? "#92400e" : "#065f46",
                            border: `1px solid ${isPending ? "#ffe58f" : "#a7f3d0"}`,
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

                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        {isPending && (
                          <button
                            onClick={() => setBookingToApprove({ ...b, resourceName: resName })}
                            style={{
                              padding: "6px 14px",
                              background: "#161616",
                              color: "#ffffff",
                              border: "none",
                              borderRadius: 6,
                              fontSize: 12,
                              fontWeight: 600,
                              cursor: "pointer",
                              whiteSpace: "nowrap",
                            }}
                          >
                            Approve Booking
                          </button>
                        )}
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
                    </div>
                  );
                });
              })()}
            </div>

            <div style={{ padding: "16px 24px", borderTop: "1px solid #eeeeee", display: "flex", justifyContent: "flex-end" }}>
              <button onClick={() => setShowMyBookingsModal(false)} style={m.btnSecondary}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Approval Confirmation Modal ────────────────────────────────── */}
      {bookingToApprove && (
        <div style={m.overlay} onClick={() => setBookingToApprove(null)}>
          <div style={{ ...m.modal, maxWidth: 480 }} onClick={(e) => e.stopPropagation()}>
            <div style={m.header}>
              <div>
                <h3 style={m.title}>Confirm Booking Approval</h3>
                <p style={m.sub}>Approve this reservation request for {bookingToApprove.resourceName}.</p>
              </div>
              <button onClick={() => setBookingToApprove(null)} style={m.closeBtn}>✕</button>
            </div>

            <div style={{ padding: "20px 24px", display: "flex", flexDirection: "column", gap: 14 }}>
              <div style={{ background: "#f0fdf4", border: "1px solid #bbf7d0", borderRadius: 12, padding: "14px 16px", fontSize: 13, color: "#166534" }}>
                <p style={{ margin: 0, fontWeight: 600 }}>Are you sure you want to approve this reservation?</p>
                <div style={{ marginTop: 8, paddingLeft: 10, borderLeft: "2px solid #86efac", display: "flex", flexDirection: "column", gap: 4 }}>
                  <span><strong>Resource:</strong> {bookingToApprove.resourceName}</span>
                  <span><strong>Project:</strong> {bookingToApprove.project || bookingToApprove.projectName || "Unknown Project"}</span>
                  <span><strong>Time:</strong> {new Date(bookingToApprove.startTime).toLocaleDateString()} • {new Date(bookingToApprove.startTime).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})} – {new Date(bookingToApprove.endTime).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                </div>
              </div>
            </div>

            <div style={{ padding: "16px 24px", borderTop: "1px solid #eeeeee", display: "flex", justifyContent: "flex-end", gap: 12 }}>
              <button onClick={() => setBookingToApprove(null)} style={m.btnSecondary}>
                Back
              </button>
              <button 
                onClick={() => { executeApproveBooking(bookingToApprove); setBookingToApprove(null); }} 
                style={{ ...m.btnPrimary, background: "#161616" }}
              >
                Approve Booking
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
              <div style={{ background: "#fef2f2", border: "1px solid #fecaca", borderRadius: 12, padding: "14px 16px", fontSize: 13, color: "#991b1b" }}>
                <p style={{ margin: 0, fontWeight: 600 }}>Are you sure you want to cancel this reservation?</p>
                <p style={{ margin: "8px 0 0", fontSize: 12, color: "#7f1d1d" }}>
                  <strong>Resource:</strong> {bookingToCancel.resourceName || "Lab Resource"}
                </p>
                <p style={{ margin: "4px 0 0", fontSize: 12, color: "#7f1d1d" }}>
                  <strong>Scheduled Date:</strong> {new Date(bookingToCancel.startTime).toLocaleDateString()} ({new Date(bookingToCancel.startTime).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })} – {new Date(bookingToCancel.endTime).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })})
                </p>
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                <label style={{ fontSize: 13, fontWeight: 600, color: "#374151" }}>Reason for cancellation (optional)</label>
                <textarea
                  placeholder="Explain why this reservation is being cancelled..."
                  value={cancelReason}
                  onChange={(e) => setCancelReason(e.target.value)}
                  style={{
                    padding: "10px",
                    borderRadius: 8,
                    border: "1px solid #d1d5db",
                    fontSize: 13,
                    fontFamily: "inherit",
                    minHeight: 80,
                    resize: "vertical",
                  }}
                />
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 8 }}>
                <button
                  type="button"
                  onClick={() => {
                    setBookingToCancel(null);
                    setCancelReason("");
                  }}
                  style={m.btnSecondary}
                >
                  No, Keep Booking
                </button>
                <button
                  type="button"
                  onClick={() => {
                    executeCancelBooking(bookingToCancel, cancelReason);
                    setCancelReason("");
                  }}
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
          borderRadius: 12,
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
            <div style={{ ...m.header, padding: "24px 32px 20px" }}>
              <div>
                <h3 style={{ ...m.title, fontSize: 20, fontWeight: 800, letterSpacing: "-0.02em" }}>
                  {selectedStatusDetail.name}
                </h3>
                <span style={{ fontSize: 13, color: "#6b7280", fontWeight: 500, marginTop: 4, display: "block" }}>
                  ID: RES-0{selectedStatusDetail.id.length > 8 ? selectedStatusDetail.id.substring(0, 4) : selectedStatusDetail.id} • Category: {selectedStatusDetail.type}
                </span>
              </div>
              <button onClick={() => setSelectedStatusDetail(null)} style={m.closeBtn}>✕</button>
            </div>

            <div style={{ padding: "24px 32px", display: "flex", flexDirection: "column", gap: 24, background: "#fafafa", borderBottomLeftRadius: 16, borderBottomRightRadius: 16 }}>
              {/* Dynamic Status Banner */}
              {(() => {
                let bannerBg = "#f9fafb", bannerBorder = "#e5e7eb", bannerColor = "#374151";
                if (selectedStatusDetail.status === "Under Maintenance") { bannerBg = "#fef2f2"; bannerBorder = "#fecaca"; bannerColor = "#991b1b"; }
                else if (selectedStatusDetail.status === "In Use") { bannerBg = "#eff6ff"; bannerBorder = "#bfdbfe"; bannerColor = "#1e40af"; }
                else if (selectedStatusDetail.status === "Reserved") { bannerBg = "#f8fafc"; bannerBorder = "#cbd5e1"; bannerColor = "#334155"; }
                else if (selectedStatusDetail.status === "Available") { bannerBg = "#f0fdf4"; bannerBorder = "#bbf7d0"; bannerColor = "#166534"; }

                return (
                  <div style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    padding: "16px 20px",
                    background: bannerBg,
                    border: `1px solid ${bannerBorder}`,
                    borderRadius: 12,
                    boxShadow: "0 1px 2px rgba(0,0,0,0.02)"
                  }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <span style={{ fontSize: 13, fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.5px", color: bannerColor }}>
                        OPERATIONAL STATUS: {selectedStatusDetail.status}
                      </span>
                    </div>
                    <span style={{ fontSize: 13, fontWeight: 600, color: bannerColor, opacity: 0.9 }}>
                      {selectedStatusDetail.availableSlot}
                    </span>
                  </div>
                );
              })()}

              {/* Dynamic Details Content */}
              {selectedStatusDetail.status === "Under Maintenance" ? (
                (() => {
                  const matchedMaint = dbMaintenanceLogs.find(
                    (m) => String(m.resourceId) === String(selectedStatusDetail.id) || (m.assetName && m.assetName.trim().toLowerCase() === selectedStatusDetail.name.trim().toLowerCase())
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
                      return hasTime ? `${startDateStr}, ${startTimeStr} – ${endTimeStr}` : `${startDateStr} – ${endDateStr}`;
                    }
                    return `${sRaw} – ${eRaw}`;
                  };

                  const downtimeText = formatDowntimeWindow(matchedMaint?.startDate, matchedMaint?.endDate);
                  const notesText = matchedMaint?.notes || "Hardware offline to maintain scientific measurement precision and prevent sensor drift.";

                  return (
                    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                      <div style={{ background: "#ffffff", border: "1px solid #e5e7eb", borderRadius: 12, padding: "20px 24px", display: "grid", gridTemplateColumns: "1fr 1fr", gap: "24px 16px", boxShadow: "0 1px 3px rgba(0,0,0,0.02)" }}>
                        <div>
                          <span style={{ fontSize: 11, fontWeight: 700, color: "#9ca3af", letterSpacing: "0.5px", textTransform: "uppercase", display: "block", marginBottom: 6 }}>MAINTENANCE REASON & TYPE</span>
                          <p style={{ fontSize: 14, fontWeight: 600, color: "#111827", margin: 0, lineHeight: 1.4 }}>{reasonText}</p>
                        </div>
                        <div>
                          <span style={{ fontSize: 11, fontWeight: 700, color: "#9ca3af", letterSpacing: "0.5px", textTransform: "uppercase", display: "block", marginBottom: 6 }}>RESPONSIBLE OPERATIONS CONTACT</span>
                          <p style={{ fontSize: 14, fontWeight: 600, color: "#111827", margin: 0, lineHeight: 1.4 }}>{contactText}</p>
                        </div>
                        <div>
                          <span style={{ fontSize: 11, fontWeight: 700, color: "#9ca3af", letterSpacing: "0.5px", textTransform: "uppercase", display: "block", marginBottom: 6 }}>SCHEDULED DOWNTIME WINDOW</span>
                          <p style={{ fontSize: 14, fontWeight: 600, color: "#111827", margin: 0, lineHeight: 1.4 }}>{downtimeText}</p>
                        </div>
                        <div>
                          <span style={{ fontSize: 11, fontWeight: 700, color: "#9ca3af", letterSpacing: "0.5px", textTransform: "uppercase", display: "block", marginBottom: 6 }}>BOOKING RESTRICTION</span>
                          <p style={{ fontSize: 14, fontWeight: 600, color: "#111827", margin: 0, lineHeight: 1.4 }}>All user reservations blocked until sensor re-calibration completes</p>
                        </div>
                      </div>

                      <div style={{ background: "#fffbeb", border: "1px solid #fde68a", padding: "16px 20px", borderRadius: 12, fontSize: 13, color: "#92400e", display: "flex", alignItems: "center", gap: 8 }}>
                        <span style={{ fontSize: 16 }}>🔒</span>
                        <span><strong>Resource Manager Maintenance Lock</strong>: {notesText}</span>
                      </div>
                    </div>
                  );
                })()
              ) : selectedStatusDetail.status === "In Use" || selectedStatusDetail.status === "Reserved" ? (
                <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                  <div style={{ background: "#ffffff", border: "1px solid #e5e7eb", borderRadius: 12, padding: "20px 24px", display: "grid", gridTemplateColumns: "1fr 1fr", gap: "24px 16px", boxShadow: "0 1px 3px rgba(0,0,0,0.02)" }}>
                    <div>
                      <span style={{ fontSize: 11, fontWeight: 700, color: "#9ca3af", letterSpacing: "0.5px", textTransform: "uppercase", display: "block", marginBottom: 6 }}>ALLOCATED RESEARCHER</span>
                      <p style={{ fontSize: 14, fontWeight: 600, color: "#111827", margin: 0, lineHeight: 1.4 }}>
                        {(selectedStatusDetail.bookedBy && (selectedStatusDetail.bookedBy.includes("Dinuka") || selectedStatusDetail.bookedBy.includes("(Lead)"))) ? "Me" : (selectedStatusDetail.bookedBy !== "-" ? selectedStatusDetail.bookedBy : "Lab Researcher")}
                      </p>
                      {(selectedStatusDetail.booking?.userEmail || selectedStatusDetail.booking?.email) && (
                        <p style={{ margin: "4px 0 0 0", fontSize: 12, color: "#6b7280" }}>
                          {selectedStatusDetail.booking?.userEmail || selectedStatusDetail.booking?.email}
                        </p>
                      )}
                    </div>
                    <div>
                      <span style={{ fontSize: 11, fontWeight: 700, color: "#9ca3af", letterSpacing: "0.5px", textTransform: "uppercase", display: "block", marginBottom: 6 }}>ASSIGNED RESEARCH PROJECT</span>
                      <p style={{ fontSize: 14, fontWeight: 600, color: "#111827", margin: 0, lineHeight: 1.4 }}>{selectedStatusDetail.project !== "-" ? selectedStatusDetail.project : "Core Lab Research"}</p>
                    </div>
                    <div>
                      <span style={{ fontSize: 11, fontWeight: 700, color: "#9ca3af", letterSpacing: "0.5px", textTransform: "uppercase", display: "block", marginBottom: 6 }}>RESERVATION TIME WINDOW</span>
                      <p style={{ fontSize: 14, fontWeight: 600, color: "#111827", margin: 0, lineHeight: 1.4 }}>{selectedStatusDetail.availableSlot}</p>
                    </div>
                    <div>
                      <span style={{ fontSize: 11, fontWeight: 700, color: "#9ca3af", letterSpacing: "0.5px", textTransform: "uppercase", display: "block", marginBottom: 6 }}>EXPERIMENT PURPOSE</span>
                      <p style={{ fontSize: 14, fontWeight: 600, color: "#111827", margin: 0, lineHeight: 1.4 }}>High-throughput spectroscopy sample run & quantitative measurement analysis</p>
                    </div>
                  </div>
                </div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                  <div style={{ background: "#ffffff", border: "1px solid #e5e7eb", borderRadius: 12, padding: "20px 24px", display: "grid", gridTemplateColumns: "1fr 1fr", gap: "24px 16px", boxShadow: "0 1px 3px rgba(0,0,0,0.02)" }}>
                    <div>
                      <span style={{ fontSize: 11, fontWeight: 700, color: "#9ca3af", letterSpacing: "0.5px", textTransform: "uppercase", display: "block", marginBottom: 6 }}>AVAILABILITY</span>
                      <p style={{ fontSize: 14, fontWeight: 600, color: "#111827", margin: 0, lineHeight: 1.4 }}>Available Now for Booking</p>
                    </div>
                    <div>
                      <span style={{ fontSize: 11, fontWeight: 700, color: "#9ca3af", letterSpacing: "0.5px", textTransform: "uppercase", display: "block", marginBottom: 6 }}>MAX SESSION LIMIT</span>
                      <p style={{ fontSize: 14, fontWeight: 600, color: "#111827", margin: 0, lineHeight: 1.4 }}>
                        {selectedStatusDetail.maxDurationHours
                          ? `${selectedStatusDetail.maxDurationHours} hour${selectedStatusDetail.maxDurationHours > 1 ? "s" : ""} max per session (Fair Access Policy)`
                          : "No limit specified"}
                      </p>
                    </div>
                    <div>
                      <span style={{ fontSize: 11, fontWeight: 700, color: "#9ca3af", letterSpacing: "0.5px", textTransform: "uppercase", display: "block", marginBottom: 6 }}>FACILITY LOCATION</span>
                      <p style={{ fontSize: 14, fontWeight: 600, color: "#111827", margin: 0, lineHeight: 1.4 }}>Building 4, Room 201 • Central Research Core</p>
                    </div>
                    <div>
                      <span style={{ fontSize: 11, fontWeight: 700, color: "#9ca3af", letterSpacing: "0.5px", textTransform: "uppercase", display: "block", marginBottom: 6 }}>NEXT MAINTENANCE WINDOW</span>
                      <p style={{ fontSize: 14, fontWeight: 600, color: "#111827", margin: 0, lineHeight: 1.4 }}>Scheduled: October 15, 2026</p>
                    </div>
                  </div>

                  <div style={{ background: "#f0fdf4", border: "1px solid #bbf7d0", padding: "16px 20px", borderRadius: 12, fontSize: 13, color: "#166534", display: "flex", alignItems: "center", gap: 8 }}>
                    <span style={{ fontSize: 16 }}>✓</span>
                    <span><strong>Ready for Research</strong>: Asset cleared for booking by any authorized project team member.</span>
                  </div>
                </div>
              )}

              {/* Footer Actions */}
              <div style={{ display: "flex", justifyContent: "flex-end", gap: 12, paddingTop: 8 }}>
                <button
                  type="button"
                  onClick={() => setSelectedStatusDetail(null)}
                  style={{ ...m.btnSecondary, padding: "10px 24px" }}
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
                    style={{ ...m.btnPrimary, padding: "10px 24px" }}
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
                    style={{ ...m.btnPrimary, padding: "10px 24px" }}
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
                    style={{ ...m.btnPrimary, padding: "10px 24px" }}
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
        <div style={m.overlay} onClick={() => { setIsResourceDropdownOpen(false); setIsProjectDropdownOpen(false); }}>
          <div style={{ ...m.modal, maxWidth: 640 }} onClick={(e) => { e.stopPropagation(); setIsResourceDropdownOpen(false); setIsProjectDropdownOpen(false); }}>
            <div style={{ ...m.header, padding: "24px 32px 20px" }}>
              <div>
                <h3 style={{ ...m.title, fontSize: 20, fontWeight: 800, letterSpacing: "-0.02em" }}>Request Resource Booking</h3>
                <p style={{ ...m.sub, fontSize: 13, color: "#6b7280", marginTop: 4 }}>Reserve laboratory hardware with strict concurrency lock protection.</p>
              </div>
              <button onClick={() => { setShowBookingModal(false); setBookingError(null); }} style={m.closeBtn}>✕</button>
            </div>

            {bookingSuccess ? (
              <div style={{ padding: "48px 32px", textAlign: "center", background: "#fafafa", borderBottomLeftRadius: 16, borderBottomRightRadius: 16 }}>
                <span style={{ fontSize: 32, background: "#dcfce7", color: "#166534", padding: "16px", borderRadius: "50%" }}>✓</span>
                <h4 style={{ fontSize: 18, fontWeight: 800, color: "#111827", marginTop: 24, letterSpacing: "-0.01em" }}>
                  Booking Request Confirmed!
                </h4>
                <p style={{ fontSize: 14, color: "#4b5563", marginTop: 8 }}>
                  Resource locked and registered to your project ledger in DB.
                </p>
              </div>
            ) : (
              <form onSubmit={handleBookingSubmit} style={{ padding: "24px 32px", display: "flex", flexDirection: "column", gap: 20, background: "#fafafa", borderBottomLeftRadius: 16, borderBottomRightRadius: 16 }}>
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
                    <label style={m.label}>END TIME *</label>
                    <input
                      type="time"
                      value={endTimeInput}
                      onChange={(e) => setEndTimeInput(e.target.value)}
                      style={m.input}
                    />
                  </div>
                </div>

                <div style={{ ...m.field, position: "relative" }}>
                  <label style={m.label}>SELECT RESOURCE *</label>
                  <div
                    style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 12px", border: "1px solid #cbd5e1", borderRadius: 8, background: "#ffffff", cursor: "text" }}
                    onClick={(e) => {
                      e.stopPropagation();
                      setIsProjectDropdownOpen(false);
                      setIsResourceDropdownOpen(true);
                    }}
                  >
                    <input 
                      type="text" 
                      placeholder="Search for a resource..."
                      value={isResourceDropdownOpen ? resourceSearchQuery : (resources.find(r => String(r.id) === String(selectedResource))?.name || "")}
                      onChange={(e) => {
                        setResourceSearchQuery(e.target.value);
                        if (!isResourceDropdownOpen) setIsResourceDropdownOpen(true);
                      }}
                      onFocus={() => setIsResourceDropdownOpen(true)}
                      className="no-default-input"
                      style={{ flex: 1, border: "none", outline: "none", background: "transparent", fontSize: 13, color: "#111827", boxShadow: "none", padding: 0, margin: 0, appearance: "none", WebkitAppearance: "none" }}
                    />
                    <span 
                      onClick={(e) => { 
                        e.stopPropagation(); 
                        setIsResourceDropdownOpen(!isResourceDropdownOpen); 
                        setIsProjectDropdownOpen(false);
                      }}
                      style={{ color: "#9ca3af", fontSize: 10, cursor: "pointer", padding: "0 4px", flexShrink: 0 }}
                    >{isResourceDropdownOpen ? "▲" : "▼"}</span>
                  </div>
                  {isResourceDropdownOpen && (
                    <div 
                      onClick={(e) => e.stopPropagation()}
                      style={{ position: "absolute", top: "100%", left: 0, right: 0, background: "#fff", border: "1px solid #e5e7eb", borderRadius: 6, maxHeight: 250, overflowY: "auto", zIndex: 10, boxShadow: "0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)", marginTop: 4 }}
                    >
                      {resources.filter(r => r.name.toLowerCase().includes(resourceSearchQuery.toLowerCase()) || r.type.toLowerCase().includes(resourceSearchQuery.toLowerCase())).map(r => {
                        const slotStatus = checkResourceSlotStatus(r, dateInput, startTimeInput, endTimeInput, allBookingsState, dbMaintenanceLogs);
                        const isUnavailable = !slotStatus.isBookable;
                        return (
                          <div 
                            key={r.id} 
                            onClick={() => {
                              if (!isUnavailable) {
                                setSelectedResource(r.id);
                                setResourceSearchQuery("");
                                setIsResourceDropdownOpen(false);
                              }
                            }}
                            style={{ 
                              padding: "12px 14px", 
                              borderBottom: "1px solid #f3f4f6", 
                              cursor: isUnavailable ? "not-allowed" : "pointer",
                              background: selectedResource === r.id ? "#f9fafb" : "#fff",
                              opacity: isUnavailable ? 0.5 : 1,
                              display: "flex",
                              justifyContent: "space-between",
                              alignItems: "center"
                            }}
                            onMouseEnter={(e) => { if (!isUnavailable) e.currentTarget.style.background = "#f9fafb" }}
                            onMouseLeave={(e) => { if (selectedResource !== r.id) e.currentTarget.style.background = "#fff" }}
                          >
                            <div>
                              <div style={{ fontSize: 13, fontWeight: 500, color: "#111827" }}>{r.name}</div>
                              <div style={{ fontSize: 11, color: "#6b7280", marginTop: 2 }}>{r.type}</div>
                            </div>
                            <div style={{ fontSize: 11, fontWeight: 600, color: isUnavailable ? "#dc2626" : "#059669", textAlign: "right", maxWidth: "45%" }}>
                              {isUnavailable ? slotStatus.label : "Available"}
                              {isUnavailable && <div style={{ fontSize: 9, fontWeight: 400, marginTop: 4, lineHeight: 1.2 }}>{slotStatus.reason}</div>}
                            </div>
                          </div>
                        );
                      })}
                      {resources.filter(r => r.name.toLowerCase().includes(resourceSearchQuery.toLowerCase()) || r.type.toLowerCase().includes(resourceSearchQuery.toLowerCase())).length === 0 && (
                        <div style={{ padding: "12px 14px", fontSize: 13, color: "#6b7280", textAlign: "center" }}>No matching resources found.</div>
                      )}
                    </div>
                  )}
                </div>

                <div style={{ ...m.field, position: "relative" }}>
                  <label style={m.label}>TARGET RESEARCH PROJECT *</label>
                  <div 
                    style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 12px", border: "1px solid #cbd5e1", borderRadius: 8, background: "#ffffff", cursor: "text" }}
                    onClick={(e) => {
                      e.stopPropagation();
                      setIsResourceDropdownOpen(false);
                      setIsProjectDropdownOpen(true);
                    }}
                  >
                    <input 
                      type="text" 
                      placeholder="Search for a project..."
                      value={isProjectDropdownOpen ? projectSearchQuery : (selectedProject || "")}
                      onChange={(e) => {
                        setProjectSearchQuery(e.target.value);
                        if (!isProjectDropdownOpen) setIsProjectDropdownOpen(true);
                      }}
                      onFocus={() => setIsProjectDropdownOpen(true)}
                      className="no-default-input"
                      style={{ flex: 1, border: "none", outline: "none", background: "transparent", fontSize: 13, color: "#111827", boxShadow: "none", padding: 0, margin: 0, appearance: "none", WebkitAppearance: "none" }}
                    />
                    <span 
                      onClick={(e) => { 
                        e.stopPropagation(); 
                        setIsProjectDropdownOpen(!isProjectDropdownOpen); 
                        setIsResourceDropdownOpen(false);
                      }}
                      style={{ color: "#9ca3af", fontSize: 10, cursor: "pointer", padding: "0 4px", flexShrink: 0 }}
                    >{isProjectDropdownOpen ? "▲" : "▼"}</span>
                  </div>
                  {isProjectDropdownOpen && (
                    <div 
                      onClick={(e) => e.stopPropagation()}
                      style={{ position: "absolute", top: "100%", left: 0, right: 0, background: "#fff", border: "1px solid #e5e7eb", borderRadius: 6, maxHeight: 200, overflowY: "auto", zIndex: 10, boxShadow: "0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)", marginTop: 4 }}
                    >
                      {(dbProjects.length > 0 ? dbProjects : [{id: '1', name: "Project Alpha Core"}, {id: '2', name: "Nexus Protocol"}, {id: '3', name: "System Core Architecture"}])
                        .filter(p => p.name.toLowerCase().includes(projectSearchQuery.toLowerCase()))
                        .map(p => (
                        <div 
                          key={p.id} 
                          onClick={() => {
                            setSelectedProject(p.name);
                            setProjectSearchQuery("");
                            setIsProjectDropdownOpen(false);
                          }}
                          style={{ 
                            padding: "10px 14px", 
                            borderBottom: "1px solid #f3f4f6", 
                            cursor: "pointer",
                            background: selectedProject === p.name ? "#f9fafb" : "#fff",
                            fontSize: 13,
                            color: "#111827"
                          }}
                          onMouseEnter={(e) => e.currentTarget.style.background = "#f9fafb"}
                          onMouseLeave={(e) => { if (selectedProject !== p.name) e.currentTarget.style.background = "#fff" }}
                        >
                          {p.name}
                        </div>
                      ))}
                      {(dbProjects.length > 0 ? dbProjects : [{id: '1', name: "Project Alpha Core"}, {id: '2', name: "Nexus Protocol"}, {id: '3', name: "System Core Architecture"}])
                        .filter(p => p.name.toLowerCase().includes(projectSearchQuery.toLowerCase())).length === 0 && (
                        <div style={{ padding: "10px 14px", fontSize: 13, color: "#6b7280", textAlign: "center" }}>No matching projects found.</div>
                      )}
                    </div>
                  )}
                </div>

                {(() => {
                  const currentSelectedObj = resources.find(r => String(r.id) === String(selectedResource));
                  const currentSlotStatus = currentSelectedObj
                    ? checkResourceSlotStatus(currentSelectedObj, dateInput, startTimeInput, endTimeInput, allBookingsState, dbMaintenanceLogs)
                    : { isBookable: true, label: "Available", reason: "" };

                  // User-concurrency check: does the current lead already have a DIFFERENT resource booked at this slot?
                  const leadUserConflict = (() => {
                    if (!dateInput || !startTimeInput || !endTimeInput) return null;
                    const { slotStart, slotEnd } = getSlotStartEndDates(dateInput, startTimeInput, endTimeInput);
                    if (!slotStart || !slotEnd) return null;
                    // Find any lead booking on a different resource overlapping this slot
                    return allBookingsState.find((b: any) => {
                      // Only check the lead's own bookings (filter by userEmail or bookedBy containing "lead" / "Dinuka")
                      const isMyBooking = b.userEmail?.includes("lead@") ||
                        b.bookedBy?.toLowerCase().includes("lead") ||
                        b.bookedBy?.toLowerCase().includes("dinuka");
                      if (!isMyBooking) return false;
                      // Must be a different resource
                      const isDifferentResource =
                        String(b.resourceId) !== String(selectedResource) &&
                        (!b.resourceName || b.resourceName !== currentSelectedObj?.name);
                      if (!isDifferentResource) return false;
                      if (b.status === "CANCELLED" || b.status === "REJECTED") return false;
                      return new Date(b.startTime) < slotEnd && new Date(b.endTime) > slotStart;
                    }) || null;
                  })();

                  const isBlocked = !currentSlotStatus.isBookable || !!leadUserConflict;
                  const isFormValid = !!(selectedResource && selectedProject && dateInput && startTimeInput && endTimeInput && !isBlocked);

                  // Max duration client-side check
                  const leadMaxDurViolation = (() => {
                    if (!currentSelectedObj || !dateInput || !startTimeInput || !endTimeInput) return null;
                    const max = currentSelectedObj.maxDurationHours;
                    if (!max) return null;
                    const start = new Date(`${dateInput}T${startTimeInput}`);
                    const end   = new Date(`${dateInput}T${endTimeInput}`);
                    if (isNaN(start.getTime()) || isNaN(end.getTime())) return null;
                    const durationHours = (end.getTime() - start.getTime()) / 3600000;
                    if (durationHours > max) return { requested: Math.round(durationHours * 10) / 10, max };
                    return null;
                  })();

                  const isBlockedFinal = isBlocked || !!leadMaxDurViolation;
                  const isFormValidFinal = isFormValid && !leadMaxDurViolation;

                  return (
                    <>
                      {/* Max duration info banner (shows when a resource is selected) */}
                      {currentSelectedObj?.maxDurationHours && (
                        <div style={{
                          background: "#eff6ff",
                          border: "1px solid #bfdbfe",
                          borderRadius: 6,
                          padding: "10px 14px",
                          fontSize: 12,
                          color: "#1d4ed8",
                          fontWeight: 500,
                          display: "flex",
                          alignItems: "center",
                          gap: 8,
                        }}>
                          <span style={{ fontSize: 14, fontWeight: 700, flexShrink: 0 }}>⏱</span>
                          <span><strong>Max session:</strong> {currentSelectedObj.maxDurationHours} hour{currentSelectedObj.maxDurationHours > 1 ? "s" : ""} per booking (fair-access policy). Exceeding this limit will be rejected.</span>
                        </div>
                      )}

                      {/* Local slot conflict (client-side check) */}
                      {!currentSlotStatus.isBookable && selectedResource && (
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
                          <span>Cannot Book: <strong>{currentSelectedObj?.name}</strong> is {currentSlotStatus.reason}. Please select another time or resource.</span>
                        </div>
                      )}

                      {/* User-concurrency conflict warning */}
                      {currentSlotStatus.isBookable && leadUserConflict && (
                        <div style={{
                          background: "#fff3cd",
                          border: "1px solid #ffc107",
                          borderRadius: 6,
                          padding: "10px 14px",
                          fontSize: 12,
                          color: "#856404",
                          fontWeight: 500,
                          display: "flex",
                          alignItems: "flex-start",
                          gap: 8,
                        }}>
                          <span style={{ flexShrink: 0 }}>🚫</span>
                          <span>
                            <strong>Scheduling Conflict:</strong> You already have <strong>{(leadUserConflict as any).resourceName || "another resource"}</strong> booked during this time slot.
                            Only one resource can be in use per person at a time. Choose a non-overlapping slot.
                          </span>
                        </div>
                      )}

                      {/* Max duration violation warning */}
                      {leadMaxDurViolation && (
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
                          <span style={{ flexShrink: 0 }}>⏱</span>
                          <span><strong>Duration too long:</strong> This resource allows a maximum of <strong>{leadMaxDurViolation.max}h</strong> per booking. Your selection is <strong>{leadMaxDurViolation.requested}h</strong>. Please shorten your slot.</span>
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

                      <div style={{ display: "flex", justifyContent: "flex-end", gap: 12, paddingTop: 16 }}>
                        <button
                          type="button"
                          onClick={() => setShowBookingModal(false)}
                          style={{ ...m.btnSecondary, padding: "10px 24px" }}
                        >
                          Cancel
                        </button>
                        <button
                          type="submit"
                          style={{
                            ...m.btnPrimary,
                            padding: "10px 24px",
                            background: !isFormValidFinal ? "#9ca3af" : "#161616",
                            cursor: !isFormValidFinal ? "not-allowed" : "pointer",
                            opacity: !isFormValidFinal ? 0.7 : 1,
                          }}
                          disabled={isSubmitting || !isFormValidFinal}
                        >
                          {!currentSlotStatus.isBookable && selectedResource
                            ? "Cannot Book (Unavailable)"
                            : leadMaxDurViolation
                            ? `Exceeds ${leadMaxDurViolation.max}h Limit`
                            : leadUserConflict
                            ? "Scheduling Conflict"
                            : isSubmitting
                            ? "Confirming..."
                            : "Confirm Reservation"}
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

      {/* ── Booking Details Modal ────────────────────────────────── */}
      {bookingDetailsModal && (
        <div style={m.overlay} onClick={() => setBookingDetailsModal(null)}>
          <div style={{ ...m.modal, maxWidth: 500 }} onClick={(e) => e.stopPropagation()}>
            <div style={m.header}>
              <h3 style={m.title}>Booking Details</h3>
              <button onClick={() => setBookingDetailsModal(null)} style={m.closeBtn}>✕</button>
            </div>
            <div style={{ padding: 24, display: "flex", flexDirection: "column", gap: 16 }}>
              <div style={{ background: "#f9fafb", padding: 16, borderRadius: 8, border: "1px solid #f3f4f6" }}>
                <p style={{ margin: "0 0 8px 0", fontSize: 13, color: "#6b7280", fontWeight: 600 }}>RESOURCE</p>
                <p style={{ margin: 0, fontSize: 16, color: "#111827", fontWeight: 600 }}>{bookingDetailsModal.resourceName || `Resource #${bookingDetailsModal.resourceId}`}</p>
              </div>
              
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                <div>
                  <p style={{ margin: "0 0 4px 0", fontSize: 12, color: "#6b7280", fontWeight: 600 }}>RESEARCHER</p>
                  <p style={{ margin: 0, fontSize: 14, color: "#111827", fontWeight: 500 }}>{bookingDetailsModal.bookedBy || "Unknown"}</p>
                  <p style={{ margin: "2px 0 0 0", fontSize: 12, color: "#6b7280" }}>
                    {bookingDetailsModal.userEmail || 
                     (bookingDetailsModal.bookedBy && bookingDetailsModal.bookedBy !== "Unknown" 
                        ? `researcher.${bookingDetailsModal.bookedBy.split(" ")[0].toLowerCase().replace(/[^a-z]/g, '')}@myorg.com` 
                        : "researcher@myorg.com")}
                  </p>
                </div>
                <div>
                  <p style={{ margin: "0 0 4px 0", fontSize: 12, color: "#6b7280", fontWeight: 600 }}>PROJECT</p>
                  <p style={{ margin: 0, fontSize: 14, color: "#111827", fontWeight: 500 }}>{bookingDetailsModal.project || bookingDetailsModal.projectName || "Unknown Project"}</p>
                </div>
                <div>
                  <p style={{ margin: "0 0 4px 0", fontSize: 12, color: "#6b7280", fontWeight: 600 }}>START TIME</p>
                  <p style={{ margin: 0, fontSize: 14, color: "#111827", fontWeight: 500 }}>{new Date(bookingDetailsModal.startTime).toLocaleString()}</p>
                </div>
                <div>
                  <p style={{ margin: "0 0 4px 0", fontSize: 12, color: "#6b7280", fontWeight: 600 }}>END TIME</p>
                  <p style={{ margin: 0, fontSize: 14, color: "#111827", fontWeight: 500 }}>{new Date(bookingDetailsModal.endTime).toLocaleString()}</p>
                </div>
                <div>
                  <p style={{ margin: "0 0 4px 0", fontSize: 12, color: "#6b7280", fontWeight: 600 }}>BOOKED AT</p>
                  <p style={{ margin: 0, fontSize: 14, color: "#111827", fontWeight: 500 }}>
                    {bookingDetailsModal.createdAt ? new Date(bookingDetailsModal.createdAt).toLocaleString() : "Date not recorded"}
                  </p>
                </div>
              </div>

              {bookingDetailsModal.purpose && (
                <div>
                  <p style={{ margin: "0 0 4px 0", fontSize: 12, color: "#6b7280", fontWeight: 600 }}>PURPOSE</p>
                  <p style={{ margin: 0, fontSize: 14, color: "#374151", background: "#f3f4f6", padding: "10px 12px", borderRadius: 6 }}>
                    {bookingDetailsModal.purpose}
                  </p>
                </div>
              )}
            </div>
            <div style={{ padding: "16px 24px", borderTop: "1px solid #eeeeee", display: "flex", justifyContent: "space-between", alignItems: "center", borderBottomLeftRadius: 16, borderBottomRightRadius: 16 }}>
              <div style={{ display: "flex", gap: 8 }}>
                {(bookingDetailsModal.status === "PENDING" || bookingDetailsModal.status === "PENDING_APPROVAL") && (
                  <button 
                    onClick={() => {
                      setBookingToApprove({ ...bookingDetailsModal, resourceName: bookingDetailsModal.resourceName || `Resource #${bookingDetailsModal.resourceId}` });
                      setBookingDetailsModal(null);
                    }} 
                    style={{
                      padding: "8px 14px",
                      background: "#161616",
                      color: "#ffffff",
                      border: "none",
                      borderRadius: 6,
                      fontSize: 13,
                      fontWeight: 600,
                      cursor: "pointer",
                    }}
                  >
                    Approve Booking
                  </button>
                )}
                {(bookingDetailsModal.status !== "CANCELLED" && bookingDetailsModal.status !== "REJECTED" && new Date(bookingDetailsModal.endTime) >= new Date()) && (
                  <button 
                    onClick={() => {
                      setBookingToCancel({ ...bookingDetailsModal, resourceName: bookingDetailsModal.resourceName || `Resource #${bookingDetailsModal.resourceId}` });
                      setBookingDetailsModal(null);
                    }} 
                    style={{
                      padding: "8px 14px",
                      background: "#ffffff",
                      color: "#dc2626",
                      border: "1px solid #fee2e2",
                      borderRadius: 6,
                      fontSize: 13,
                      fontWeight: 600,
                      cursor: "pointer",
                    }}
                  >
                    Cancel Booking
                  </button>
                )}
              </div>
              <button onClick={() => setBookingDetailsModal(null)} style={m.btnSecondary}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Resource Details Modal ────────────────────────────────── */}
      {resourceDetailsModal && (
        <div style={m.overlay} onClick={() => setResourceDetailsModal(null)}>
          <div style={{ ...m.modal, maxWidth: 540 }} onClick={(e) => e.stopPropagation()}>
            <div style={{ ...m.header, padding: "24px 32px 20px" }}>
              <div>
                <h3 style={{ ...m.title, fontSize: 20, fontWeight: 800, letterSpacing: "-0.02em" }}>
                  {resourceDetailsModal.name}
                </h3>
                <span style={{ fontSize: 13, color: "#6b7280", fontWeight: 500, marginTop: 4, display: "flex", alignItems: "center", gap: 8 }}>
                  <span>ID: RES-0{resourceDetailsModal.id.length > 8 ? resourceDetailsModal.id.substring(0, 4) : resourceDetailsModal.id}</span>
                  <span style={{ color: "#d1d5db" }}>•</span>
                  <span>📍 {resourceDetailsModal.location || "Main Laboratory Facility"}</span>
                </span>
              </div>
              <button onClick={() => setResourceDetailsModal(null)} style={m.closeBtn}>✕</button>
            </div>

            <div style={{ padding: "24px 32px", display: "flex", flexDirection: "column", gap: 20, background: "#fafafa", borderBottomLeftRadius: 16, borderBottomRightRadius: 16 }}>
              {resourceDetailsModal.description && (
                <div style={{ background: "#ffffff", padding: "20px 24px", borderRadius: 12, border: "1px solid #e5e7eb", boxShadow: "0 1px 3px rgba(0,0,0,0.02)" }}>
                  <p style={{ margin: "0 0 8px 0", fontSize: 11, color: "#9ca3af", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.5px" }}>RESOURCE DESCRIPTION</p>
                  <p style={{ margin: 0, fontSize: 14, color: "#374151", lineHeight: 1.6 }}>{resourceDetailsModal.description}</p>
                </div>
              )}
              
              <div style={{ display: "grid", gridTemplateColumns: resourceDetailsModal.maxDurationHours ? "1fr 1fr" : "1fr", gap: 16 }}>
                <div style={{ background: "#ffffff", padding: "20px 24px", borderRadius: 12, border: "1px solid #e5e7eb", boxShadow: "0 1px 3px rgba(0,0,0,0.02)", display: "flex", flexDirection: "column", gap: 8 }}>
                  <p style={{ margin: 0, fontSize: 11, color: "#9ca3af", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.5px" }}>CATEGORY / SPECIFICATION</p>
                  <p style={{ margin: 0, fontSize: 14, color: "#111827", fontWeight: 600, textTransform: "uppercase" }}>{resourceDetailsModal.type}</p>
                </div>
                {resourceDetailsModal.maxDurationHours && (
                  <div style={{ background: "#eff6ff", padding: "20px 24px", borderRadius: 12, border: "1px solid #bfdbfe", boxShadow: "0 1px 3px rgba(0,0,0,0.02)", display: "flex", flexDirection: "column", gap: 8 }}>
                    <p style={{ margin: 0, fontSize: 11, color: "#1d4ed8", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.5px" }}>⏱ MAX SESSION DURATION</p>
                    <p style={{ margin: 0, fontSize: 14, color: "#1e40af", fontWeight: 700 }}>{resourceDetailsModal.maxDurationHours} hour{resourceDetailsModal.maxDurationHours > 1 ? "s" : ""} per booking</p>
                    <p style={{ margin: 0, fontSize: 11, color: "#3b82f6" }}>Fair-access policy enforced</p>
                  </div>
                )}
              </div>

              {/* Footer Actions */}
              <div style={{ display: "flex", justifyContent: "flex-end", gap: 12, paddingTop: 8 }}>
                <button
                  type="button"
                  onClick={() => setResourceDetailsModal(null)}
                  style={{ ...m.btnSecondary, padding: "10px 24px" }}
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      {/* ── Rejection Modal ──────────────────────────────────────────────────── */}
      {rejectionModal && (
        <div style={m.overlay} onClick={() => setRejectionModal(null)}>
          <div style={{ ...m.modal, maxWidth: 500 }} onClick={(e) => e.stopPropagation()}>
            <div style={{ ...m.header, padding: "24px 32px 20px" }}>
              <h3 style={{ ...m.title, fontSize: 20, fontWeight: 800, letterSpacing: "-0.02em" }}>Reject Booking Request</h3>
              <button onClick={() => setRejectionModal(null)} style={m.closeBtn}>✕</button>
            </div>
            
            <div style={{ padding: "24px 32px", display: "flex", flexDirection: "column", gap: 24, background: "#fafafa", borderBottomLeftRadius: 16, borderBottomRightRadius: 16 }}>
              <p style={{ fontSize: 14, color: "#4b5563", margin: 0, lineHeight: 1.6 }}>
                Provide a reason for rejecting the booking request for <strong style={{ color: "#111827" }}>{rejectionModal.booking.resourceName}</strong> by <strong style={{ color: "#111827" }}>{rejectionModal.booking.userName || rejectionModal.booking.bookedBy || "the researcher"}</strong>. This will be sent as a notification.
              </p>

              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                <label style={{ fontSize: 12, fontWeight: 700, color: "#475569", textTransform: "uppercase", letterSpacing: "0.5px" }}>Rejection Reason</label>
                <textarea
                  value={rejectionModal.reason}
                  onChange={(e) => setRejectionModal({ ...rejectionModal, reason: e.target.value })}
                  placeholder="e.g. Resource is under maintenance during this period."
                  style={{ ...s.input, minHeight: 90, resize: "vertical", background: "#ffffff", boxShadow: "0 1px 3px rgba(0,0,0,0.02)" }}
                />
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end", gap: 12, paddingTop: 8 }}>
                <button
                  onClick={() => setRejectionModal(null)}
                  style={{ ...m.btnSecondary, padding: "10px 24px" }}
                  disabled={isProcessingAction}
                >
                  Cancel
                </button>
                <button
                  onClick={handleRejectBooking}
                  style={{ ...m.btnPrimary, background: "#dc2626", padding: "10px 24px", opacity: isProcessingAction ? 0.7 : 1 }}
                  disabled={isProcessingAction}
                >
                  {isProcessingAction ? "Rejecting..." : "Confirm Rejection"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

const s: Record<string, React.CSSProperties> = {
  headerRow: { display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: 32 },
  pageTitle: { fontSize: 32, fontWeight: 800, color: "#0f172a", letterSpacing: "-0.03em", marginBottom: 6 },
  pageSub: { fontSize: 14, color: "#64748b", fontWeight: 500 },
  btnPrimary: { background: "#0f172a", color: "#ffffff", border: "1px solid transparent", borderRadius: 8, padding: "10px 18px", fontSize: 14, fontWeight: 600, cursor: "pointer", boxShadow: "0 2px 4px rgba(15, 23, 42, 0.1)" },
  statGrid: { display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 24, marginBottom: 40 },
  statCard: { background: "#ffffff", border: "1px solid #e2e8f0", borderRadius: 16, padding: "24px 28px", display: "flex", flexDirection: "column", gap: 8, boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.02), 0 2px 4px -2px rgba(0, 0, 0, 0.02)", transition: "transform 0.2s, box-shadow 0.2s" },
  statLabel: { fontSize: 12, fontWeight: 700, color: "#64748b", letterSpacing: "0.06em", textTransform: "uppercase" },
  statValue: { fontSize: 36, fontWeight: 800, color: "#0f172a", letterSpacing: "-0.04em", lineHeight: 1 },
  statSub: { fontSize: 13, color: "#94a3b8", fontWeight: 500 },
  tableCard: { background: "#ffffff", border: "1px solid #e2e8f0", borderRadius: 16, overflow: "hidden", boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.02), 0 2px 4px -2px rgba(0, 0, 0, 0.02)" },
  tableHeaderRow: { display: "flex", alignItems: "center", justifyContent: "space-between", padding: "4px 8px" },
  sectionLabel: { fontSize: 12, fontWeight: 700, color: "#475569", letterSpacing: "0.05em", textTransform: "uppercase", padding: "16px 20px" },
  table: { width: "100%", borderCollapse: "collapse", fontSize: 14 },
  th: { textAlign: "left", padding: "12px 20px", fontSize: 12, fontWeight: 600, color: "#64748b", borderBottom: "1px solid #e2e8f0", background: "#f8fafc", textTransform: "uppercase", letterSpacing: "0.04em" },
  tr: { borderBottom: "1px solid #f1f5f9" },
  td: { padding: "16px 20px", color: "#1e293b", fontSize: 14, verticalAlign: "middle" },
  badge: { fontSize: 12, fontWeight: 600, padding: "4px 10px", borderRadius: 20 },
  badgeActive: { background: "#0f172a", color: "#f8fafc", boxShadow: "0 1px 2px rgba(0,0,0,0.1)" },
  badgeReserved: { background: "#f1f5f9", color: "#475569", border: "1px solid #e2e8f0" },
  badgeMaintenance: { background: "#fef2f2", color: "#b91c1c", border: "1px solid #fecaca" },
  badgeAvailable: { background: "#f0fdf4", color: "#166534", border: "1px solid #bbf7d0" },
  btnBookNow: { padding: "6px 14px", background: "#0f172a", color: "#ffffff", border: "none", borderRadius: 6, fontSize: 13, fontWeight: 600, cursor: "pointer", boxShadow: "0 1px 2px rgba(15, 23, 42, 0.1)" },
  btnApprove: { padding: "6px 14px", background: "#ecfdf5", color: "#059669", border: "1px solid #a7f3d0", borderRadius: 6, fontSize: 13, fontWeight: 600, cursor: "pointer", boxShadow: "0 1px 2px rgba(0,0,0,0.02)" },
  btnReject: { padding: "6px 14px", background: "#fef2f2", color: "#dc2626", border: "1px solid #fecaca", borderRadius: 6, fontSize: 13, fontWeight: 600, cursor: "pointer", boxShadow: "0 1px 2px rgba(0,0,0,0.02)" },
  btnWaitlist: { padding: "6px 14px", background: "#ffffff", color: "#475569", border: "1px solid #cbd5e1", borderRadius: 6, fontSize: 13, fontWeight: 600, cursor: "pointer", boxShadow: "0 1px 2px rgba(0,0,0,0.02)" },
};

const m: Record<string, React.CSSProperties> = {
  overlay: { position: "fixed", inset: 0, background: "rgba(0, 0, 0, 0.25)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 100, padding: 20, backdropFilter: "blur(4px)" },
  modal: { background: "#ffffff", border: "1px solid #e2e8f0", borderRadius: 16, width: "100%", maxWidth: 640, boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)", overflow: "visible" },
  header: { padding: "24px 32px 20px", background: "#f8fafc", borderTopLeftRadius: 16, borderTopRightRadius: 16, borderBottom: "1px solid #e2e8f0", display: "flex", alignItems: "flex-start", justifyContent: "space-between" },
  title: { fontSize: 18, fontWeight: 700, color: "#0f172a", letterSpacing: "-0.01em" },
  sub: { fontSize: 13, color: "#64748b", marginTop: 4 },
  closeBtn: { background: "none", border: "none", fontSize: 20, color: "#94a3b8", cursor: "pointer", transition: "color 0.2s" },
  body: { padding: "28px 32px", display: "flex", flexDirection: "column", gap: 20 },
  field: { display: "flex", flexDirection: "column", gap: 8 },
  label: { fontSize: 13, fontWeight: 600, color: "#334155" },
  input: { padding: "12px 16px", fontSize: 14, border: "1px solid #cbd5e1", borderRadius: 8, outline: "none", background: "#ffffff", width: "100%", boxSizing: "border-box", transition: "all 0.2s" },
  select: { padding: "12px 16px", fontSize: 14, border: "1px solid #cbd5e1", borderRadius: 8, background: "#ffffff", outline: "none", width: "100%", boxSizing: "border-box", cursor: "pointer", transition: "all 0.2s" },
  footer: { display: "flex", justifyContent: "flex-end", gap: 12, paddingTop: 12, paddingBottom: 8 },
  btnPrimary: { padding: "10px 20px", background: "#0f172a", color: "#ffffff", border: "none", borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: "pointer", boxShadow: "0 1px 3px rgba(0,0,0,0.1)", transition: "all 0.2s" },
  btnSecondary: { padding: "10px 20px", background: "#ffffff", color: "#475569", border: "1px solid #cbd5e1", borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: "pointer", boxShadow: "0 1px 2px rgba(0,0,0,0.05)", transition: "all 0.2s" },
};
