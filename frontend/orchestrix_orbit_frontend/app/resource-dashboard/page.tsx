"use client";

import React, { useState } from "react";
import Link from "next/link";

interface BookingRequest {
  id: string;
  resourceName: string;
  resourceType: string;
  requestedBy: string;
  project: string;
  timeSlot: string;
  duration: string;
  status: "Pending" | "Approved" | "Rejected" | "Overridden";
  urgency: "HIGH" | "MEDIUM" | "NORMAL";
  rationale: string;
}

interface FleetAsset {
  id: string;
  name: string;
  category: "GPU Compute" | "Lab Instrument" | "Cleanroom";
  location: string;
  status: "Operational" | "In Use" | "Under Maintenance" | "Calibration";
  utilization: string;
  activeUser?: string;
}

const INITIAL_REQUESTS: BookingRequest[] = [
  {
    id: "REQ-401",
    resourceName: "GPU Workstation Node 1 (8x A100)",
    resourceType: "Compute Cluster",
    requestedBy: "Dinuka K. (Lead)",
    project: "Project Alpha Core",
    timeSlot: "Today, 14:00 - 18:00",
    duration: "4.0 hrs",
    status: "Pending",
    urgency: "HIGH",
    rationale: "Quantum decoherence simulation run batch 4. Requires dedicated high-memory VRAM allocation.",
  },
  {
    id: "REQ-402",
    resourceName: "Cryo-EM Imaging Suite",
    resourceType: "Microscopy Lab",
    requestedBy: "Amara P. (Researcher)",
    project: "Nexus Protocol",
    timeSlot: "Tomorrow, 09:00 - 13:00",
    duration: "4.0 hrs",
    status: "Pending",
    urgency: "MEDIUM",
    rationale: "Structural protein freezing and electron microscopy calibration run.",
  },
  {
    id: "REQ-403",
    resourceName: "Quantum Simulator Rig B",
    resourceType: "Quantum Lab",
    requestedBy: "Dr. Aris (Specialist)",
    project: "Project Alpha Core",
    timeSlot: "Aug 23, 10:00 - 12:00",
    duration: "2.0 hrs",
    status: "Pending",
    urgency: "NORMAL",
    rationale: "Thermocouple recalibration verification.",
  },
];

const INITIAL_FLEET: FleetAsset[] = [
  {
    id: "AST-01",
    name: "GPU Workstation Node 1 (8x A100 80GB)",
    category: "GPU Compute",
    location: "Server Room B, Rack 04",
    status: "In Use",
    utilization: "92%",
    activeUser: "Dinuka K. (Lead)",
  },
  {
    id: "AST-02",
    name: "GPU Workstation Node 2 (4x A100 40GB)",
    category: "GPU Compute",
    location: "Server Room B, Rack 05",
    status: "Operational",
    utilization: "15%",
  },
  {
    id: "AST-03",
    name: "Titan Krios Cryo-EM Suite",
    category: "Lab Instrument",
    location: "Nanotech Wing, Lab 102",
    status: "In Use",
    utilization: "78%",
    activeUser: "Shehara K.",
  },
  {
    id: "AST-04",
    name: "Quantum Simulation Rig A (Dilution Fridge)",
    category: "Lab Instrument",
    location: "Low-Temp Lab, Pod 3",
    status: "Under Maintenance",
    utilization: "0%",
  },
  {
    id: "AST-05",
    name: "High-Resolution Mass Spectrometer",
    category: "Lab Instrument",
    location: "Biochem Analytical Lab",
    status: "Operational",
    utilization: "45%",
  },
  {
    id: "AST-06",
    name: "ISO-5 Cleanroom Photolithography Bay",
    category: "Cleanroom",
    location: "Cleanroom Annex, Bay 2",
    status: "Operational",
    utilization: "60%",
  },
];

export default function ResourceManagerOverview() {
  const [requests, setRequests] = useState<BookingRequest[]>(INITIAL_REQUESTS);
  const [fleet, setFleet] = useState<FleetAsset[]>(INITIAL_FLEET);
  const [selectedReq, setSelectedReq] = useState<BookingRequest | null>(null);
  const [overrideReason, setOverrideReason] = useState("");
  const [showOverrideModal, setShowOverrideModal] = useState(false);

  const pendingRequests = requests.filter((r) => r.status === "Pending");
  const inMaintenanceCount = fleet.filter((a) => a.status === "Under Maintenance").length;
  const inUseCount = fleet.filter((a) => a.status === "In Use").length;

  const handleApprove = (id: string) => {
    setRequests((prev) =>
      prev.map((r) => (r.id === id ? { ...r, status: "Approved" } : r))
    );
    if (selectedReq?.id === id) setSelectedReq(null);
  };

  const handleReject = (id: string) => {
    setRequests((prev) =>
      prev.map((r) => (r.id === id ? { ...r, status: "Rejected" } : r))
    );
    if (selectedReq?.id === id) setSelectedReq(null);
  };

  const handleOverride = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedReq) return;

    setRequests((prev) =>
      prev.map((r) =>
        r.id === selectedReq.id
          ? { ...r, status: "Overridden", rationale: `[MANAGER OVERRIDE]: ${overrideReason}` }
          : r
      )
    );
    setShowOverrideModal(false);
    setSelectedReq(null);
    setOverrideReason("");
  };

  const toggleAssetMaintenance = (id: string) => {
    setFleet((prev) =>
      prev.map((a) => {
        if (a.id === id) {
          const nextStatus =
            a.status === "Under Maintenance" ? "Operational" : "Under Maintenance";
          return { ...a, status: nextStatus, utilization: nextStatus === "Under Maintenance" ? "0%" : "20%" };
        }
        return a;
      })
    );
  };

  return (
    <div>
      {/* ── Page Header ────────────────────────────────────────────────────── */}
      <div style={s.headerRow}>
        <div>
          <h1 style={s.pageTitle}>Resource Operations Overview</h1>
          <p style={s.pageSub}>
            Global laboratory hardware inventory, booking queue, and maintenance orchestration (FR-RES-01, 04).
          </p>
        </div>

        <div style={{ display: "flex", gap: 10 }}>
          <Link href="/resource-dashboard/assets" style={s.btnSecondary}>
            View Full Catalog →
          </Link>
          <Link href="/resource-dashboard/maintenance" style={s.btnPrimary}>
            + Schedule Downtime
          </Link>
        </div>
      </div>

      {/* ── Metric Stat Cards ────────────────────────────────────────────────── */}
      <div style={s.statGrid}>
        <div style={s.statCard}>
          <span style={s.statLabel}>TOTAL LAB ASSETS</span>
          <span style={s.statValue}>{fleet.length}</span>
          <span style={s.statSub}>Hardware & instrument inventory</span>
        </div>
        <div style={s.statCard}>
          <span style={s.statLabel}>PENDING APPROVALS</span>
          <span style={s.statValue}>{pendingRequests.length}</span>
          <span style={s.statSub}>Awaiting manager review (FR-RES-04)</span>
        </div>
        <div style={s.statCard}>
          <span style={s.statLabel}>ACTIVE IN-USE</span>
          <span style={s.statValue}>{inUseCount}</span>
          <span style={s.statSub}>Occupied time slots</span>
        </div>
        <div style={s.statCard}>
          <span style={s.statLabel}>IN MAINTENANCE</span>
          <span style={s.statValue}>{inMaintenanceCount}</span>
          <span style={s.statSub}>Downtime scheduled (FR-RES-08)</span>
        </div>
      </div>

      {/* ── Main Two-Column Content ─────────────────────────────────────────── */}
      <div style={s.twoCol}>
        {/* Left Column: Urgent Booking Approval Queue (60%) */}
        <div style={s.leftCol}>
          <div style={s.tableCard}>
            <div style={s.tableHeaderRow}>
              <div>
                <p style={s.sectionLabel}>BOOKING REQUESTS AWAITING APPROVAL</p>
                <p style={{ fontSize: 12, color: "#9e9e9e", margin: "2px 0 0 20px" }}>
                  Review, approve, or apply priority manager overrides (FR-RES-04).
                </p>
              </div>
              <span style={{ fontSize: 12, color: "#9e9e9e", marginRight: 20 }}>
                {pendingRequests.length} Pending
              </span>
            </div>

            {pendingRequests.length === 0 ? (
              <div style={s.emptyState}>
                <p style={{ fontSize: 13, fontWeight: 600, color: "#161616" }}>Queue is empty</p>
                <p style={{ fontSize: 12, color: "#9e9e9e" }}>All resource requests have been processed.</p>
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column" }}>
                {pendingRequests.map((req) => (
                  <div key={req.id} style={s.reqItem}>
                    <div style={s.reqTop}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <span
                          style={{
                            ...s.urgencyBadge,
                            ...(req.urgency === "HIGH"
                              ? s.urgencyHigh
                              : req.urgency === "MEDIUM"
                              ? s.urgencyMed
                              : s.urgencyNorm),
                          }}
                        >
                          {req.urgency}
                        </span>
                        <strong style={{ fontSize: 13, color: "#161616" }}>{req.resourceName}</strong>
                      </div>
                      <span style={{ fontSize: 12, color: "#9e9e9e", fontFamily: "monospace" }}>
                        {req.id}
                      </span>
                    </div>

                    <div style={s.reqMetaRow}>
                      <span>
                        Requester: <strong>{req.requestedBy}</strong> ({req.project})
                      </span>
                      <span>
                        Slot: <strong>{req.timeSlot}</strong> ({req.duration})
                      </span>
                    </div>

                    <p style={s.reqRationale}>{req.rationale}</p>

                    <div style={s.reqActionRow}>
                      <button
                        onClick={() => {
                          setSelectedReq(req);
                          setShowOverrideModal(true);
                        }}
                        style={s.btnOverride}
                      >
                        ⚡ Manager Override
                      </button>

                      <div style={{ display: "flex", gap: 8 }}>
                        <button
                          onClick={() => handleReject(req.id)}
                          style={s.btnReject}
                        >
                          Reject
                        </button>
                        <button
                          onClick={() => handleApprove(req.id)}
                          style={s.btnApprove}
                        >
                          Approve Slot
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Fleet Operational Status (40%) */}
        <div style={s.rightCol}>
          <div style={s.tableCard}>
            <div style={s.tableHeaderRow}>
              <p style={s.sectionLabel}>FLEET OPERATIONAL TELEMETRY</p>
              <Link href="/resource-dashboard/assets" style={{ fontSize: 11, color: "#161616", marginRight: 18, fontWeight: 600 }}>
                Manage All →
              </Link>
            </div>

            <div style={{ display: "flex", flexDirection: "column" }}>
              {fleet.map((asset) => (
                <div key={asset.id} style={s.fleetItem}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                    <div>
                      <strong style={{ fontSize: 13, color: "#161616" }}>{asset.name}</strong>
                      <p style={{ fontSize: 11, color: "#9e9e9e", margin: "2px 0 0" }}>
                        {asset.location} • {asset.category}
                      </p>
                    </div>

                    <span
                      style={{
                        ...s.statusBadge,
                        ...(asset.status === "In Use"
                          ? s.badgeInUse
                          : asset.status === "Under Maintenance"
                          ? s.badgeMaint
                          : s.badgeOp),
                      }}
                    >
                      {asset.status}
                    </span>
                  </div>

                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 8 }}>
                    <span style={{ fontSize: 11, color: "#616161" }}>
                      Utilization: <strong>{asset.utilization}</strong>
                    </span>

                    <button
                      onClick={() => toggleAssetMaintenance(asset.id)}
                      style={asset.status === "Under Maintenance" ? s.btnOnline : s.btnMaint}
                    >
                      {asset.status === "Under Maintenance" ? "Set Operational" : "Set Maintenance"}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ── Manager Override Modal (FR-RES-04) ───────────────────────────────── */}
      {showOverrideModal && selectedReq && (
        <div style={m.overlay}>
          <div style={m.modal}>
            <div style={m.header}>
              <div>
                <h3 style={m.title}>Resource Manager Override (FR-RES-04)</h3>
                <p style={m.sub}>Apply administrative priority override for emergency or priority runs.</p>
              </div>
              <button onClick={() => setShowOverrideModal(false)} style={m.closeBtn}>✕</button>
            </div>

            <form onSubmit={handleOverride} style={m.body}>
              <div style={m.infoBox}>
                <p style={{ fontSize: 12, margin: 0, color: "#424242" }}>
                  Target: <strong>{selectedReq.resourceName}</strong>
                </p>
                <p style={{ fontSize: 12, margin: "4px 0 0", color: "#424242" }}>
                  Original Requester: <strong>{selectedReq.requestedBy}</strong> ({selectedReq.project})
                </p>
                <p style={{ fontSize: 12, margin: "4px 0 0", color: "#424242" }}>
                  Scheduled Slot: <strong>{selectedReq.timeSlot}</strong>
                </p>
              </div>

              <div style={m.field}>
                <label style={m.label}>ADMINISTRATIVE OVERRIDE JUSTIFICATION *</label>
                <textarea
                  required
                  rows={3}
                  placeholder="State laboratory operational justification or priority run..."
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
                  Confirm Priority Override
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
  btnPrimary: { background: "#161616", color: "#ffffff", border: "none", borderRadius: 4, padding: "9px 16px", fontSize: 13, fontWeight: 600, cursor: "pointer", textDecoration: "none" },
  btnSecondary: { background: "#ffffff", color: "#424242", border: "1px solid #d0d0d0", borderRadius: 4, padding: "8px 14px", fontSize: 13, fontWeight: 500, cursor: "pointer", textDecoration: "none" },
  statGrid: { display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16, marginBottom: 32 },
  statCard: { background: "#ffffff", border: "1px solid #e0e0e0", borderRadius: 6, padding: "18px 20px 20px", display: "flex", flexDirection: "column", gap: 6 },
  statLabel: { fontSize: 11, fontWeight: 600, color: "#9e9e9e", letterSpacing: "0.5px", textTransform: "uppercase" as const },
  statValue: { fontSize: 32, fontWeight: 700, color: "#161616", letterSpacing: "-1px", lineHeight: 1.1 },
  statSub: { fontSize: 12, color: "#9e9e9e" },
  twoCol: { display: "grid", gridTemplateColumns: "1.3fr 1fr", gap: 20 },
  leftCol: { display: "flex", flexDirection: "column", gap: 20 },
  rightCol: { display: "flex", flexDirection: "column", gap: 20 },
  tableCard: { background: "#ffffff", border: "1px solid #e0e0e0", borderRadius: 6, overflow: "hidden" },
  tableHeaderRow: { display: "flex", alignItems: "center", justifyContent: "space-between", borderBottom: "1px solid #eeeeee", background: "#fafafa" },
  sectionLabel: { fontSize: 11, fontWeight: 600, color: "#9e9e9e", letterSpacing: "0.6px", textTransform: "uppercase" as const, padding: "14px 20px 4px", margin: 0 },
  emptyState: { padding: "40px 20px", textAlign: "center" as const },
  reqItem: { padding: "16px 20px", borderBottom: "1px solid #eeeeee", display: "flex", flexDirection: "column", gap: 8 },
  reqTop: { display: "flex", justifyContent: "space-between", alignItems: "center" },
  reqMetaRow: { display: "flex", justifyContent: "space-between", fontSize: 12, color: "#616161" },
  reqRationale: { fontSize: 12, color: "#424242", background: "#fdfdfd", border: "1px solid #f0f0f0", padding: "8px 12px", borderRadius: 4, margin: 0, lineHeight: 1.4 },
  reqActionRow: { display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 4 },
  urgencyBadge: { fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 3, textTransform: "uppercase" as const, whiteSpace: "nowrap" as const, display: "inline-block", flexShrink: 0 },
  urgencyHigh: { background: "#fee2e2", color: "#dc2626", border: "1px solid #fca5a5" },
  urgencyMed: { background: "#fff8e1", color: "#f57f17", border: "1px solid #ffe082" },
  urgencyNorm: { background: "#f5f5f5", color: "#616161", border: "1px solid #e0e0e0" },
  btnApprove: { background: "#161616", color: "#ffffff", border: "none", borderRadius: 4, padding: "6px 14px", fontSize: 12, fontWeight: 600, cursor: "pointer", whiteSpace: "nowrap" as const },
  btnReject: { background: "transparent", color: "#d32f2f", border: "1px solid #ffcdd2", borderRadius: 4, padding: "6px 12px", fontSize: 12, fontWeight: 500, cursor: "pointer", whiteSpace: "nowrap" as const },
  btnOverride: { background: "#eff6ff", color: "#1d4ed8", border: "1px solid #bfdbfe", borderRadius: 4, padding: "6px 12px", fontSize: 12, fontWeight: 600, cursor: "pointer", whiteSpace: "nowrap" as const },
  fleetItem: { padding: "14px 20px", borderBottom: "1px solid #eeeeee", display: "flex", flexDirection: "column" },
  statusBadge: { fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 3, whiteSpace: "nowrap" as const, display: "inline-block", flexShrink: 0 },
  badgeOp: { background: "#e8f5e9", color: "#2e7d32", border: "1px solid #c8e6c9" },
  badgeInUse: { background: "#eff6ff", color: "#1d4ed8", border: "1px solid #bfdbfe" },
  badgeMaint: { background: "#fee2e2", color: "#dc2626", border: "1px solid #fca5a5" },
  btnMaint: { background: "transparent", border: "1px solid #d0d0d0", borderRadius: 3, padding: "3px 8px", fontSize: 11, color: "#616161", cursor: "pointer", whiteSpace: "nowrap" as const },
  btnOnline: { background: "#2e7d32", border: "none", borderRadius: 3, padding: "3px 8px", fontSize: 11, color: "#ffffff", cursor: "pointer", whiteSpace: "nowrap" as const },
};

const m: Record<string, React.CSSProperties> = {
  overlay: { position: "fixed" as const, inset: 0, background: "rgba(0, 0, 0, 0.4)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 100, padding: 20 },
  modal: { background: "#ffffff", border: "1px solid #e0e0e0", borderRadius: 6, width: "100%", maxWidth: 540, boxShadow: "0 10px 25px rgba(0, 0, 0, 0.1)" },
  header: { padding: "18px 24px", borderBottom: "1px solid #eeeeee", display: "flex", alignItems: "flex-start", justifyContent: "space-between", background: "#fafafa" },
  title: { fontSize: 16, fontWeight: 700, color: "#161616", margin: 0 },
  sub: { fontSize: 12, color: "#9e9e9e", marginTop: 4 },
  closeBtn: { background: "none", border: "none", fontSize: 15, color: "#9e9e9e", cursor: "pointer" },
  body: { padding: "20px 24px", display: "flex", flexDirection: "column", gap: 14 },
  infoBox: { background: "#f8fafc", border: "1px solid #e2e8f0", padding: "12px 14px", borderRadius: 4 },
  field: { display: "flex", flexDirection: "column", gap: 6 },
  label: { fontSize: 11, fontWeight: 600, color: "#9e9e9e", letterSpacing: "0.5px" },
  textarea: { padding: "8px 12px", fontSize: 13, border: "1px solid #d0d0d0", borderRadius: 4, outline: "none", resize: "none" },
  footer: { padding: "14px 24px", borderTop: "1px solid #eeeeee", background: "#fafafa", display: "flex", justifyContent: "space-between", alignItems: "center" },
  btnOverrideSubmit: { padding: "8px 16px", background: "#1d4ed8", color: "#ffffff", border: "none", borderRadius: 4, fontSize: 13, fontWeight: 600, cursor: "pointer" },
  btnSecondary: { padding: "8px 14px", background: "#ffffff", color: "#424242", border: "1px solid #d0d0d0", borderRadius: 4, fontSize: 13, fontWeight: 500, cursor: "pointer" },
};
