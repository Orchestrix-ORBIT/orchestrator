"use client";

import { useEffect, useState } from "react";
import {
  ResourcesService,
  type Resource,
  type CreateResourceBody,
  type ResourceType,
} from "@/lib/services/resources";

export default function ResourceAssetsPage() {
  const [resources, setResources]       = useState<Resource[]>([]);
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
    ResourcesService.getAll()
      .then(setResources)
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

  if (loading) return <p style={{ padding: 40, color: "#888", fontSize: 14 }}>Loading assets…</p>;
  if (error)   return <p style={{ padding: 24, color: "#c62828", fontSize: 14 }}>Error: {error}</p>;

  return (
    <div>
      <div style={s.header}>
        <div>
          <h1 style={s.title}>Lab Assets</h1>
          <p style={s.sub}>{resources.length} assets registered</p>
        </div>
        <button id="btn-new-asset" style={s.btnPrimary} onClick={() => setShowModal(true)}>
          + Add Asset
        </button>
      </div>

      <div style={s.table}>
        <div style={s.thead}>
          {["Name", "Type", "Location", "Status", "Max Hours", "Created"].map(h => (
            <span key={h} style={s.th}>{h}</span>
          ))}
        </div>
        {resources.length === 0 ? (
          <div style={s.empty}>No assets registered yet.</div>
        ) : resources.map(r => (
          <div key={r.id} id={`asset-row-${r.id}`} style={s.row}>
            <div>
              <div style={s.assetName}>{r.name}</div>
              {r.description && <div style={s.assetDesc}>{r.description}</div>}
            </div>
            <span style={s.td}>{r.type}</span>
            <span style={s.td}>{(r as any).metadata?.location || r.location || "Core Lab"}</span>
            <span style={s.td}>
              <span style={{ ...s.badge, ...statusStyle(r.status) }}>{r.status.replace("_", " ")}</span>
            </span>
            <span style={s.td}>{r.maxDurationHours ?? "—"}h</span>
            <span style={s.td}>{new Date(r.createdAt).toLocaleDateString()}</span>
          </div>
        ))}
      </div>

      {showModal && (
        <div style={s.overlay}>
          <div style={s.modal}>
            <div style={s.modalHead}>
              <span style={s.modalTitle}>Add New Asset</span>
              <button style={s.closeBtn} onClick={() => { setShowModal(false); setCreateError(null); }}>×</button>
            </div>
            <form onSubmit={handleCreate} style={s.modalForm}>
              {createError && <div style={s.errorBanner}>{createError}</div>}
              <div style={s.field}>
                <label style={s.label}>Asset name *</label>
                <input id="input-asset-name" style={s.input} value={newName}
                  onChange={e => setNewName(e.target.value)} placeholder="e.g. High-Resolution TEM Microscope" required />
              </div>
              <div style={s.field}>
                <label style={s.label}>Type</label>
                <select id="select-asset-type" style={s.input} value={newType}
                  onChange={e => setNewType(e.target.value as ResourceType)}>
                  <option value="GPU">GPU Cluster</option>
                  <option value="CPU">CPU Server</option>
                  <option value="STORAGE">Storage Vault</option>
                  <option value="DATASET">Dataset</option>
                  <option value="API_KEY">API Key</option>
                </select>
              </div>
              <div style={s.field}>
                <label style={s.label}>Location</label>
                <input id="input-asset-location" style={s.input} value={newLocation}
                  onChange={e => setNewLocation(e.target.value)} placeholder="e.g. Server Room B, Rack 04" />
              </div>
              <div style={s.field}>
                <label style={s.label}>Max booking duration (hours)</label>
                <input id="input-asset-hours" type="number" style={s.input} min={1} max={168}
                  value={newMaxHours} onChange={e => setNewMaxHours(Number(e.target.value))} />
              </div>
              <div style={s.field}>
                <label style={s.label}>Description</label>
                <textarea id="input-asset-desc" style={{ ...s.input, minHeight: 70, resize: "vertical" as const }}
                  value={newDesc} onChange={e => setNewDesc(e.target.value)} placeholder="Specs and notes" />
              </div>
              <div style={s.modalActions}>
                <button type="button" style={s.btnSecondary} onClick={() => { setShowModal(false); setCreateError(null); }}>Cancel</button>
                <button id="btn-create-asset" type="submit"
                  style={{ ...s.btnPrimary, opacity: creating ? 0.6 : 1 }} disabled={creating}>
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
  header: { display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 24 },
  title: { fontSize: 22, fontWeight: 700, color: "#161616", marginBottom: 4 },
  sub: { fontSize: 13, color: "#888888" },
  btnPrimary: { padding: "10px 18px", background: "#161616", color: "#ffffff", border: "none", borderRadius: 6, fontSize: 13, fontWeight: 600, cursor: "pointer" },
  btnSecondary: { padding: "10px 18px", background: "#ffffff", color: "#161616", border: "1px solid #d0d0d0", borderRadius: 6, fontSize: 13, fontWeight: 600, cursor: "pointer" },
  table: { background: "#fff", border: "1px solid #e8e8e8", borderRadius: 8, overflow: "hidden" },
  thead: { display: "grid", gridTemplateColumns: "2fr 100px 1fr 120px 80px 100px", gap: 0, padding: "12px 20px", borderBottom: "1px solid #f0f0f0", background: "#fafafa" },
  th: { fontSize: 10, fontWeight: 700, color: "#888", letterSpacing: "0.6px", textTransform: "uppercase" as const },
  row: { display: "grid", gridTemplateColumns: "2fr 100px 1fr 120px 80px 100px", gap: 0, padding: "14px 20px", borderBottom: "1px solid #f8f8f8", alignItems: "center" },
  td: { fontSize: 13, color: "#424242" },
  assetName: { fontSize: 13, fontWeight: 600, color: "#161616" },
  assetDesc: { fontSize: 12, color: "#888", marginTop: 2 },
  badge: { fontSize: 10, fontWeight: 700, padding: "3px 8px", borderRadius: 4, letterSpacing: "0.4px" },
  empty: { padding: "40px 20px", textAlign: "center" as const, color: "#888", fontSize: 13 },
  overlay: { position: "fixed" as const, inset: 0, background: "rgba(0,0,0,0.4)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 100 },
  modal: { background: "#ffffff", borderRadius: 10, padding: 28, width: "100%", maxWidth: 480 },
  modalHead: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 },
  modalTitle: { fontSize: 16, fontWeight: 700, color: "#161616" },
  closeBtn: { background: "none", border: "none", fontSize: 22, color: "#888", cursor: "pointer" },
  modalForm: { display: "flex", flexDirection: "column", gap: 14 },
  modalActions: { display: "flex", gap: 10, justifyContent: "flex-end", marginTop: 8 },
  field: { display: "flex", flexDirection: "column", gap: 6 },
  label: { fontSize: 12, fontWeight: 600, color: "#161616" },
  input: { padding: "10px 12px", fontSize: 14, border: "1.5px solid #d0d0d0", borderRadius: 6, fontFamily: "inherit", width: "100%" },
  errorBanner: { padding: "10px 14px", background: "#fff0f0", border: "1px solid #f5c6cb", borderRadius: 6, fontSize: 13, color: "#c62828" },
};
