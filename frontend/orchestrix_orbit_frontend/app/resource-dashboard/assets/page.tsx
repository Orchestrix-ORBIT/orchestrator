"use client";

import { useEffect, useState } from "react";
import {
  ResourcesService,
  type Resource,
  type CreateResourceBody,
  type ResourceType,
  type Booking,
} from "@/lib/services/resources";
import LoadingState from "@/components/ui/LoadingState";

const ASSET_TYPES: { value: ResourceType; label: string }[] = [
  { value: "GPU", label: "GPU Cluster" },
  { value: "CPU", label: "CPU Server" },
  { value: "STORAGE", label: "Storage Vault" },
  { value: "DATASET", label: "Dataset" },
  { value: "API_KEY", label: "API Key" },
  { value: "INSTRUMENT", label: "Instrument" },
  { value: "ROOM", label: "Room" },
  { value: "SOFTWARE", label: "Software License" },
  { value: "COMPUTE", label: "Compute Node" },
];

function FormTypeSelect({ value, onChange }: { value: ResourceType, onChange: (val: ResourceType) => void }) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const selectedLabel = ASSET_TYPES.find(t => t.value === value)?.label || "Select Type...";
  
  const filteredTypes = ASSET_TYPES.filter(t => t.label.toLowerCase().includes(search.toLowerCase()) || t.value.toLowerCase().includes(search.toLowerCase()));

  return (
    <div style={{ position: "relative", width: "100%" }} onClick={(e) => e.stopPropagation()}>
      <div 
        onClick={() => setOpen(!open)}
        className="modal-input"
        style={{ cursor: "pointer", display: "flex", justifyContent: "space-between", alignItems: "center" }}
      >
        <span>{selectedLabel}</span>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#64748b" strokeWidth="2" style={{ transform: open ? "rotate(180deg)" : "none", transition: "transform 0.2s" }}><path d="M6 9l6 6 6-6"/></svg>
      </div>
      {open && (
        <>
          <div style={{position: "fixed", inset: 0, zIndex: 101}} onClick={(e) => { e.stopPropagation(); setOpen(false); }} />
          <div style={{
            position: "absolute", top: "100%", left: 0, marginTop: 6, background: "#ffffff", border: "1px solid #e2e8f0", borderRadius: 12, 
            boxShadow: "0 10px 25px -5px rgba(0,0,0,0.1), 0 8px 10px -6px rgba(0,0,0,0.1)", zIndex: 102, minWidth: "100%",
            maxHeight: 240, overflowY: "auto", display: "flex", flexDirection: "column", animation: "modalFadeIn 0.15s ease-out"
          }}>
            <div style={{ padding: "8px", borderBottom: "1px solid #f1f5f9", position: "sticky", top: 0, background: "#fff", zIndex: 2 }} onClick={(e) => e.stopPropagation()}>
              <div style={{ display: "flex", alignItems: "center", border: "1px solid #e2e8f0", borderRadius: 8, padding: "8px 12px", background: "#f8fafc", transition: "border-color 0.2s" }}
                   onFocus={(e) => e.currentTarget.style.borderColor = "#3b82f6"}
                   onBlur={(e) => e.currentTarget.style.borderColor = "#e2e8f0"}>
                <svg style={{ color: "#9ca3af", marginRight: 8 }} width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
                <input 
                  autoFocus type="text" placeholder="Search asset types..." value={search} onChange={(e) => setSearch(e.target.value)}
                  style={{ width: "100%", fontSize: 13, color: "#111827", outline: "none", border: "none", background: "transparent" }}
                />
              </div>
            </div>
            <div style={{ padding: "6px" }}>
              {filteredTypes.map(t => (
                <div 
                  key={t.value} onClick={(e) => { e.stopPropagation(); onChange(t.value); setOpen(false); setSearch(""); }}
                  style={{ padding: "10px 14px", fontSize: 13, fontWeight: value === t.value ? 600 : 500, color: value === t.value ? "#0f172a" : "#475569", cursor: "pointer", background: value === t.value ? "#f1f5f9" : "#fff", borderRadius: 8, transition: "all 0.1s ease", marginBottom: 2 }}
                  onMouseOver={(e) => (e.currentTarget.style.background = value === t.value ? "#f1f5f9" : "#f8fafc")}
                  onMouseOut={(e) => (e.currentTarget.style.background = value === t.value ? "#f1f5f9" : "#fff")}
                >
                  {t.label}
                </div>
              ))}
              {filteredTypes.length === 0 && (
                <div style={{ padding: "12px 14px", fontSize: 13, color: "#9ca3af", textAlign: "center", fontStyle: "italic" }}>No types found.</div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

const LAB_LOCATIONS: string[] = [
  "Core AI Data Center - Rack 01",
  "Core AI Data Center - Rack 02",
  "Core AI Data Center - Rack 05",
  "HPC Server Room A - Rack 12",
  "HPC Server Room B - Rack 04",
  "HPC Server Room B - Rack 08",
  "Quantum Computing Lab 101",
  "Quantum Computing Lab 102",
  "Analytical Chemistry Suite 108",
  "Analytical Chemistry Suite 110",
  "Genomics Core Lab 304",
  "Genomics Core Lab 305",
  "Building 4, Room 201 (BSL-2)",
  "Building 4, Room 202 (BSL-2)",
  "Building 4, Room 205 (BSL-3)",
  "Robotics & Automation Arena",
  "Materials Science Wing - Electron Microscopy",
  "Materials Science Wing - Spectrometry",
  "Cleanroom Facility - Class 100",
  "Cleanroom Facility - Class 1000",
  "HPC License Server (Virtual)",
  "AWS us-east-1 (Cloud)",
  "AWS us-west-2 (Cloud)"
];

function FormLocationSelect({ value, onChange }: { value: string, onChange: (val: string) => void }) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const selectedLabel = value || "Select or type location...";
  
  const filtered = LAB_LOCATIONS.filter(l => l.toLowerCase().includes(search.toLowerCase()));

  return (
    <div style={{ position: "relative", width: "100%" }} onClick={(e) => e.stopPropagation()}>
      <div 
        onClick={() => setOpen(!open)}
        className="modal-input"
        style={{ cursor: "pointer", display: "flex", justifyContent: "space-between", alignItems: "center", color: value ? "#0f172a" : "#64748b" }}
      >
        <span>{selectedLabel}</span>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#64748b" strokeWidth="2" style={{ transform: open ? "rotate(180deg)" : "none", transition: "transform 0.2s" }}><path d="M6 9l6 6 6-6"/></svg>
      </div>
      {open && (
        <>
          <div style={{position: "fixed", inset: 0, zIndex: 101}} onClick={(e) => { e.stopPropagation(); setOpen(false); }} />
          <div style={{
            position: "absolute", top: "100%", left: 0, marginTop: 6, background: "#ffffff", border: "1px solid #e2e8f0", borderRadius: 12, 
            boxShadow: "0 10px 25px -5px rgba(0,0,0,0.1), 0 8px 10px -6px rgba(0,0,0,0.1)", zIndex: 102, minWidth: "100%",
            maxHeight: 240, overflowY: "auto", display: "flex", flexDirection: "column", animation: "modalFadeIn 0.15s ease-out"
          }}>
            <div style={{ padding: "8px", borderBottom: "1px solid #f1f5f9", position: "sticky", top: 0, background: "#fff", zIndex: 2 }} onClick={(e) => e.stopPropagation()}>
              <div style={{ display: "flex", alignItems: "center", border: "1px solid #e2e8f0", borderRadius: 8, padding: "8px 12px", background: "#f8fafc", transition: "border-color 0.2s" }}
                   onFocus={(e) => e.currentTarget.style.borderColor = "#3b82f6"}
                   onBlur={(e) => e.currentTarget.style.borderColor = "#e2e8f0"}>
                <svg style={{ color: "#9ca3af", marginRight: 8 }} width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
                <input 
                  autoFocus type="text" placeholder="Search or type new location..." value={search} onChange={(e) => setSearch(e.target.value)}
                  style={{ width: "100%", fontSize: 13, color: "#111827", outline: "none", border: "none", background: "transparent" }}
                />
              </div>
            </div>
            <div style={{ padding: "6px" }}>
              {search && !LAB_LOCATIONS.some(l => l.toLowerCase() === search.toLowerCase()) && (
                <div 
                  onClick={(e) => { e.stopPropagation(); onChange(search); setOpen(false); setSearch(""); }}
                  style={{ padding: "10px 14px", fontSize: 13, fontWeight: 500, color: "#3b82f6", cursor: "pointer", background: "#eff6ff", borderRadius: 8, transition: "all 0.1s ease", marginBottom: 2, display: "flex", alignItems: "center", gap: 6 }}
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
                  Add "{search}" as custom location
                </div>
              )}
              {filtered.map(l => (
                <div 
                  key={l} onClick={(e) => { e.stopPropagation(); onChange(l); setOpen(false); setSearch(""); }}
                  style={{ padding: "10px 14px", fontSize: 13, fontWeight: value === l ? 600 : 500, color: value === l ? "#0f172a" : "#475569", cursor: "pointer", background: value === l ? "#f1f5f9" : "#fff", borderRadius: 8, transition: "all 0.1s ease", marginBottom: 2 }}
                  onMouseOver={(e) => (e.currentTarget.style.background = value === l ? "#f1f5f9" : "#f8fafc")}
                  onMouseOut={(e) => (e.currentTarget.style.background = value === l ? "#f1f5f9" : "#fff")}
                >
                  {l}
                </div>
              ))}
              {filtered.length === 0 && !search && (
                <div style={{ padding: "12px 14px", fontSize: 13, color: "#9ca3af", textAlign: "center", fontStyle: "italic" }}>No locations found.</div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

export default function ResourceAssetsPage() {
  const [resources, setResources]       = useState<Resource[]>([]);
  const [maintenanceLogs, setMaintenanceLogs] = useState<any[]>([]);
  const [allBookings, setAllBookings]   = useState<Booking[]>([]);
  const [loading, setLoading]           = useState(true);
  const [error, setError]               = useState<string | null>(null);
  const [showModal, setShowModal]       = useState(false);
  const [newName, setNewName]           = useState("");
  const [newDesc, setNewDesc]           = useState("");
  const [newType, setNewType]           = useState<ResourceType>("GPU");
  const [newLocation, setNewLocation]   = useState("");
  const [newMaxHours, setNewMaxHours]   = useState<number>(4);
  const [creating, setCreating]         = useState(false);
  const [createError, setCreateError]   = useState<string | null>(null);

  useEffect(() => {
    Promise.all([
      ResourcesService.getAll().catch(() => []),
      ResourcesService.getMaintenance().catch(() => []),
    ])
      .then(async ([resList, maintList]) => {
        setResources(resList);
        setMaintenanceLogs(maintList || []);

        const nestedBookings = await Promise.all(
          resList.map((r: Resource) => ResourcesService.getBookings(r.id).catch(() => []))
        );
        setAllBookings(nestedBookings.flat().map(normalizeBooking));
      })
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!newName.trim()) return;
    setCreating(true);
    setCreateError(null);
    try {
      const body: CreateResourceBody = {
        name: newName.trim(),
        description: newDesc.trim() || undefined,
        type: newType,
        location: newLocation.trim() || undefined,
        maxDurationHours: newMaxHours,
      };
      const created = await ResourcesService.create(body);
      setResources(prev => [created, ...prev]);
      setShowModal(false);
      setNewName(""); setNewDesc(""); setNewLocation("");
    } catch (err: unknown) {
      setCreateError(err instanceof Error ? err.message : "Failed to create resource");
    } finally {
      setCreating(false);
    }
  }

  if (loading) return <LoadingState variant="manager-assets" />;
  if (error)   return <p style={{ padding: 24, color: "#c62828", fontSize: 14 }}>Error: {error}</p>;

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: 32 }}>
        <div>
          <h1 style={{ fontSize: 26, fontWeight: 700, color: "#111827", letterSpacing: "-0.025em", margin: 0, marginBottom: 4 }}>
            Lab Assets
          </h1>
          <p style={{ margin: 0, fontSize: 14, color: "#6b7280" }}>
            {resources.length} assets registered
          </p>
        </div>
        <button id="btn-new-asset" style={s.btnPrimary} className="btn-shiny" onClick={() => setShowModal(true)}>
          + Add Asset
        </button>
      </div>

      <div style={s.card}>
        <div style={s.tableWrapper}>
          <table style={s.table}>
            <thead>
              <tr>
                {["Name", "Type", "Location", "Status", "Max Hours", "Created"].map(h => (
                  <th key={h} style={s.th}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {resources.length === 0 ? (
                <tr>
                  <td colSpan={6} style={{ padding: "40px 20px", textAlign: "center", color: "#6b7280", fontSize: 14 }}>
                    No assets registered yet.
                  </td>
                </tr>
              ) : resources.map(r => {
                const effectiveStatus = getEffectiveStatus(r, maintenanceLogs, allBookings);
                const dotColor = effectiveStatus === "AVAILABLE" ? "#10b981" : effectiveStatus === "IN_USE" ? "#f59e0b" : "#ef4444";
                return (
                  <tr key={r.id} id={`asset-row-${r.id}`} className="table-row-hover">
                    <td style={s.td}>
                      <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                          <div style={{ width: 8, height: 8, borderRadius: "50%", background: dotColor, flexShrink: 0 }} />
                          <span style={s.assetName}>{r.name}</span>
                        </div>
                        {r.description && <span style={s.assetDesc}>{r.description}</span>}
                      </div>
                    </td>
                    <td style={s.td}><span style={{ color: "#4b5563" }}>{r.type}</span></td>
                    <td style={s.td}><span style={{ color: "#4b5563" }}>{(r as any).metadata?.location || r.location || "Core Lab"}</span></td>
                    <td style={s.td}>
                      <span style={{ ...s.badge, ...statusStyle(effectiveStatus) }}>{effectiveStatus.replace("_", " ")}</span>
                    </td>
                    <td style={s.td}><span style={{ color: "#4b5563" }}>{r.maxDurationHours ?? "—"}h</span></td>
                    <td style={s.td}><span style={{ color: "#4b5563" }}>{new Date(r.createdAt).toLocaleDateString()}</span></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      <style>{`
        @keyframes modalFadeIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes modalSlideUp { from { opacity: 0; transform: translateY(20px) scale(0.98); } to { opacity: 1; transform: translateY(0) scale(1); } }
        .modal-close-btn:hover { background: #f1f5f9 !important; color: #0f172a !important; transform: scale(1.05); }
        .modal-input { padding: 12px 16px; font-size: 14px; border: 1px solid #e2e8f0; border-radius: 12px; font-family: inherit; width: 100%; outline: none; transition: all 0.2s; background: #f8fafc; color: #0f172a; box-sizing: border-box; }
        .modal-input:hover { border-color: #cbd5e1; background: #f1f5f9; }
        .modal-input:focus { border-color: #3b82f6; background: #ffffff; box-shadow: 0 0 0 4px rgba(59, 130, 246, 0.1); }
        .modal-btn-primary { padding: 12px 24px; background: #0f172a; color: #ffffff; border: none; border-radius: 12px; font-size: 14px; font-weight: 600; cursor: pointer; transition: all 0.2s; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1); }
        .modal-btn-primary:hover:not(:disabled) { background: #1e293b; box-shadow: 0 8px 16px -4px rgba(0,0,0,0.2); transform: translateY(-1px); }
        .modal-btn-primary:active:not(:disabled) { transform: translateY(0); box-shadow: 0 2px 4px -1px rgba(0,0,0,0.1); }
        .modal-btn-secondary { padding: 12px 24px; background: #f1f5f9; color: #475569; border: 1px solid transparent; border-radius: 12px; font-size: 14px; font-weight: 600; cursor: pointer; transition: all 0.2s; }
        .modal-btn-secondary:hover { background: #e2e8f0; color: #1e293b; }
      `}</style>
      
      {showModal && (
        <div style={s.overlay}>
          <div style={s.modal}>
            <div style={s.modalHead}>
              <span style={s.modalTitle}>Add New Asset</span>
              <button className="modal-close-btn" style={s.closeBtn} onClick={() => { setShowModal(false); setCreateError(null); }}>×</button>
            </div>
            <form onSubmit={handleCreate} style={s.modalForm}>
              {createError && <div style={s.errorBanner}>{createError}</div>}
              <div style={s.field}>
                <label style={s.label}>Asset name *</label>
                <input id="input-asset-name" className="modal-input" value={newName}
                  onChange={e => setNewName(e.target.value)} placeholder="e.g. High-Resolution TEM Microscope" required />
              </div>
              <div style={s.field}>
                <label style={s.label}>Type</label>
                <FormTypeSelect value={newType} onChange={setNewType} />
              </div>
              <div style={s.field}>
                <label style={s.label}>Location</label>
                <FormLocationSelect value={newLocation} onChange={setNewLocation} />
              </div>
              <div style={s.field}>
                <label style={s.label}>Max booking duration (hours)</label>
                <input id="input-asset-hours" type="number" className="modal-input" min={1} max={168}
                  value={newMaxHours} onChange={e => setNewMaxHours(Number(e.target.value))} />
              </div>
              <div style={s.field}>
                <label style={s.label}>Description</label>
                <textarea id="input-asset-desc" className="modal-input" style={{ minHeight: 90, resize: "vertical" as const }}
                  value={newDesc} onChange={e => setNewDesc(e.target.value)} placeholder="Specs and notes..." />
              </div>
              <div style={s.modalActions}>
                <button type="button" className="modal-btn-secondary" onClick={() => { setShowModal(false); setCreateError(null); }}>Cancel</button>
                <button id="btn-create-asset" type="submit"
                  className="modal-btn-primary" style={{ opacity: creating ? 0.6 : 1 }} disabled={creating}>
                  {creating ? "Adding…" : "Add Asset"}
                </button>
              </div>
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
  if (tzOffsetMinutes === 0) return b;

  const tzOffsetMs = tzOffsetMinutes * 60 * 1000;
  const startMs = startObj.getTime();
  const createdMs = b.createdAt ? new Date(b.createdAt).getTime() : null;

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

function getEffectiveStatus(resource: Resource, maintenanceLogs: any[] = [], bookings: Booking[] = []): Resource["status"] {
  const now = new Date();
  
  // 1. Maintenance has highest priority
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
    return "MAINTENANCE";
  }

  // 2. Check active bookings for IN_USE (Sync with Lead Dashboard logic)
  const resBookings = (bookings || []).filter((b) => {
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
    return "IN_USE";
  }

  // 3. Fallback if DB statically says MAINTENANCE or IN_USE but actual logs/bookings are empty
  if (resource.status === "MAINTENANCE" || resource.status === "IN_USE") {
    return "AVAILABLE";
  }

  return resource.status;
}

function statusStyle(status: string): React.CSSProperties {
  switch (status) {
    case "AVAILABLE":       return { background: "#e8f5e9", color: "#2e7d32" };
    case "IN_USE":          return { background: "#fff3e0", color: "#e65100" };
    case "MAINTENANCE":     return { background: "#fce4ec", color: "#880e4f" };
    case "DECOMMISSIONED":  return { background: "#f5f5f5", color: "#757575" };
    default:                return { background: "#f5f5f5", color: "#757575" };
  }
}

const s: Record<string, React.CSSProperties> = {
  btnPrimary: { padding: "10px 20px", background: "#0f172a", color: "#ffffff", border: "none", borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: "pointer", transition: "all 0.2s" },
  btnSecondary: { padding: "10px 20px", background: "#f1f5f9", color: "#475569", border: "none", borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: "pointer", transition: "background 0.2s" },
  card: { background: "#ffffff", borderRadius: 16, border: "1px solid rgba(0,0,0,0.06)", boxShadow: "0 1px 3px rgba(0,0,0,0.02)", overflow: "hidden" },
  tableWrapper: { width: "100%", overflowX: "auto" },
  table: { width: "100%", borderCollapse: "collapse", minWidth: 900 },
  th: { textAlign: "left", fontSize: 11, fontWeight: 600, color: "#6b7280", textTransform: "uppercase", letterSpacing: "0.05em", padding: "16px 24px", borderBottom: "1px solid #f3f4f6", background: "#f9fafb" },
  td: { fontSize: 13, color: "#111827", padding: "16px 24px", borderBottom: "1px solid #f3f4f6", verticalAlign: "middle" },
  assetName: { fontSize: 14, fontWeight: 600, color: "#111827", lineHeight: 1.2 },
  assetDesc: { fontSize: 12, color: "#6b7280", marginTop: 2, paddingLeft: 18 },
  badge: { display: "inline-flex", alignItems: "center", fontSize: 11, fontWeight: 600, padding: "4px 10px", borderRadius: 9999, letterSpacing: "0.02em" },
  overlay: { position: "fixed", inset: 0, background: "rgba(15, 23, 42, 0.4)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 100, backdropFilter: "blur(6px)", animation: "modalFadeIn 0.2s ease-out" },
  modal: { background: "#ffffff", borderRadius: 24, padding: "32px 36px", width: "100%", maxWidth: 540, boxShadow: "0 25px 50px -12px rgba(0,0,0,0.25)", border: "1px solid rgba(0,0,0,0.05)", animation: "modalSlideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1)" },
  modalHead: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 28 },
  modalTitle: { fontSize: 22, fontWeight: 700, color: "#0f172a", letterSpacing: "-0.01em" },
  closeBtn: { background: "#f8fafc", border: "1px solid #f1f5f9", borderRadius: "50%", width: 36, height: 36, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20, color: "#64748b", cursor: "pointer", transition: "all 0.2s" },
  modalForm: { display: "flex", flexDirection: "column", gap: 16 },
  modalActions: { display: "flex", gap: 12, justifyContent: "flex-end", marginTop: 16 },
  field: { display: "flex", flexDirection: "column", gap: 6 },
  label: { fontSize: 13, fontWeight: 600, color: "#334155" },
  input: { padding: "10px 12px", fontSize: 14, border: "1px solid #cbd5e1", borderRadius: 8, fontFamily: "inherit", width: "100%", outline: "none", transition: "border-color 0.2s" },
  errorBanner: { padding: "12px 16px", background: "#fef2f2", border: "1px solid #fecaca", borderRadius: 8, fontSize: 13, color: "#dc2626", fontWeight: 500 },
};
