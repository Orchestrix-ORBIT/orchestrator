"use client";

import React, { useState } from "react";

interface LabAsset {
  id: string;
  name: string;
  category: "GPU Compute" | "Lab Instrument" | "Cleanroom" | "Software License";
  location: string;
  serialNumber: string;
  status: "Operational" | "In Use" | "Under Maintenance" | "Decommissioned";
  maxDurationHours: number;
  specs: string;
}

const INITIAL_ASSETS: LabAsset[] = [
  {
    id: "AST-101",
    name: "GPU Workstation Node 1",
    category: "GPU Compute",
    location: "Server Room B, Rack 04",
    serialNumber: "SN-NVD-8812-A100",
    status: "In Use",
    maxDurationHours: 4,
    specs: "8x NVIDIA A100 (80GB SXM4), 2TB RAM, 30TB NVMe Scratch",
  },
  {
    id: "AST-102",
    name: "GPU Workstation Node 2",
    category: "GPU Compute",
    location: "Server Room B, Rack 05",
    serialNumber: "SN-NVD-8813-A100",
    status: "Operational",
    maxDurationHours: 4,
    specs: "4x NVIDIA A100 (40GB PCIe), 512GB RAM, 15TB NVMe",
  },
  {
    id: "AST-103",
    name: "Titan Krios Cryo-EM Suite",
    category: "Lab Instrument",
    location: "Nanotech Wing, Room 102",
    serialNumber: "SN-FEI-300KV-091",
    status: "In Use",
    maxDurationHours: 8,
    specs: "300 kV FEG, Gatan K3 Direct Electron Detector, BioQuantum Energy Filter",
  },
  {
    id: "AST-104",
    name: "Quantum Simulation Dilution Fridge",
    category: "Lab Instrument",
    location: "Low-Temp Physics Pod 3",
    serialNumber: "SN-OXF-DR-2024",
    status: "Under Maintenance",
    maxDurationHours: 12,
    specs: "10 mK Base Temperature, 40 Coaxial Lines, RF Shielded Enclosure",
  },
  {
    id: "AST-105",
    name: "High-Resolution Orbitrap Mass Spectrometer",
    category: "Lab Instrument",
    location: "Biochem Analytical Lab, Bench 4",
    serialNumber: "SN-THM-ORB-7721",
    status: "Operational",
    maxDurationHours: 6,
    specs: "Resolution > 240,000 FWHM at m/z 200, Electrospray Ionization",
  },
  {
    id: "AST-106",
    name: "ISO-5 Cleanroom Photolithography Stepper",
    category: "Cleanroom",
    location: "Cleanroom Annex, Bay 2",
    serialNumber: "SN-ASML-PAS-5500",
    status: "Operational",
    maxDurationHours: 4,
    specs: "i-line 365nm Optical Alignment, Sub-0.35um Critical Dimension",
  },
];

export default function AssetCatalogPage() {
  const [assets, setAssets] = useState<LabAsset[]>(INITIAL_ASSETS);
  const [filter, setFilter] = useState<"ALL" | LabAsset["category"]>("ALL");
  const [showAddModal, setShowAddModal] = useState(false);
  const [nameInput, setNameInput] = useState("");
  const [categoryInput, setCategoryInput] = useState<LabAsset["category"]>("GPU Compute");
  const [locationInput, setLocationInput] = useState("");
  const [serialInput, setSerialInput] = useState("");
  const [specsInput, setSpecsInput] = useState("");
  const [maxHoursInput, setMaxHoursInput] = useState(4);

  const handleAddAsset = (e: React.FormEvent) => {
    e.preventDefault();
    if (!nameInput.trim()) return;

    const newAsset: LabAsset = {
      id: `AST-${Date.now().toString().slice(-3)}`,
      name: nameInput.trim(),
      category: categoryInput,
      location: locationInput.trim() || "Main Laboratory",
      serialNumber: serialInput.trim() || `SN-${Date.now().toString().slice(-6)}`,
      status: "Operational",
      maxDurationHours: maxHoursInput,
      specs: specsInput.trim() || "Standard specifications",
    };

    setAssets((prev) => [newAsset, ...prev]);
    setShowAddModal(false);
    setNameInput("");
    setLocationInput("");
    setSerialInput("");
    setSpecsInput("");
  };

  const handleStatusChange = (id: string, status: LabAsset["status"]) => {
    setAssets((prev) =>
      prev.map((a) => (a.id === id ? { ...a, status } : a))
    );
  };

  const filteredAssets = assets.filter((a) => {
    if (filter === "ALL") return true;
    return a.category === filter;
  });

  return (
    <div>
      {/* ── Page Header ────────────────────────────────────────────────────── */}
      <div style={s.headerRow}>
        <div>
          <h1 style={s.pageTitle}>Lab Asset & Hardware Catalog</h1>
          <p style={s.pageSub}>
            Register, provision, and configure equipment scheduling limits (FR-RES-05).
          </p>
        </div>

        <button onClick={() => setShowAddModal(true)} style={s.btnPrimary}>
          + Register New Asset
        </button>
      </div>

      {/* ── Metric Stat Cards ────────────────────────────────────────────────── */}
      <div style={s.statGrid}>
        <div style={s.statCard}>
          <span style={s.statLabel}>TOTAL ASSETS</span>
          <span style={s.statValue}>{assets.length}</span>
          <span style={s.statSub}>Cataloged lab inventory</span>
        </div>
        <div style={s.statCard}>
          <span style={s.statLabel}>GPU COMPUTE NODES</span>
          <span style={s.statValue}>
            {assets.filter((a) => a.category === "GPU Compute").length}
          </span>
          <span style={s.statSub}>High-VRAM clusters</span>
        </div>
        <div style={s.statCard}>
          <span style={s.statLabel}>LAB INSTRUMENTS</span>
          <span style={s.statValue}>
            {assets.filter((a) => a.category === "Lab Instrument").length}
          </span>
          <span style={s.statSub}>Spectrometers & Suites</span>
        </div>
        <div style={s.statCard}>
          <span style={s.statLabel}>OPERATIONAL FLEET</span>
          <span style={s.statValue}>
            {Math.round((assets.filter((a) => a.status === "Operational" || a.status === "In Use").length / assets.length) * 100)}%
          </span>
          <span style={s.statSub}>Available uptime</span>
        </div>
      </div>

      {/* ── Filter Bar ──────────────────────────────────────────────────────── */}
      <div style={s.filterBar}>
        <div style={s.filterGroup}>
          <span style={s.filterLabel}>CATEGORY:</span>
          {(["ALL", "GPU Compute", "Lab Instrument", "Cleanroom", "Software License"] as const).map((cat) => (
            <button
              key={cat}
              onClick={() => setFilter(cat)}
              style={filter === cat ? s.filterBtnActive : s.filterBtn}
            >
              {cat === "ALL" ? "All Equipment" : cat}
            </button>
          ))}
        </div>
        <span style={s.countLabel}>{filteredAssets.length} Assets Registered</span>
      </div>

      {/* ── Asset Inventory Table Card ──────────────────────────────────────── */}
      <div style={s.tableCard}>
        <div style={s.tableHeaderRow}>
          <p style={s.sectionLabel}>REGISTERED HARDWARE & INSTRUMENT INVENTORY</p>
          <span style={{ fontSize: 12, color: "#9e9e9e", marginRight: 20 }}>
            PostgreSQL Hardware Master
          </span>
        </div>

        <table style={s.table}>
          <thead>
            <tr>
              <th style={s.th}>Asset Name & Specs</th>
              <th style={s.th}>Category</th>
              <th style={s.th}>Location</th>
              <th style={s.th}>Serial / Tag</th>
              <th style={s.th}>Max Duration</th>
              <th style={s.th}>Status</th>
              <th style={{ ...s.th, textAlign: "right" }}>Status Control</th>
            </tr>
          </thead>
          <tbody>
            {filteredAssets.map((asset) => (
              <tr key={asset.id} style={s.tr}>
                <td style={s.td}>
                  <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                    <strong>{asset.name}</strong>
                    <span style={{ fontSize: 11, color: "#616161", maxWidth: 360, lineHeight: 1.3 }}>
                      {asset.specs}
                    </span>
                  </div>
                </td>
                <td style={{ ...s.td, color: "#616161" }}>{asset.category}</td>
                <td style={s.td}>{asset.location}</td>
                <td style={{ ...s.td, fontFamily: "monospace", fontSize: 11, color: "#9e9e9e" }}>
                  {asset.serialNumber}
                </td>
                <td style={s.td}>
                  <span style={s.badgeLimit}>{asset.maxDurationHours} hrs / run</span>
                </td>
                <td style={s.td}>
                  <span
                    style={{
                      ...s.badge,
                      ...(asset.status === "In Use"
                        ? s.badgeInUse
                        : asset.status === "Under Maintenance"
                        ? s.badgeMaint
                        : s.badgeOp),
                    }}
                  >
                    {asset.status}
                  </span>
                </td>
                <td style={{ ...s.td, textAlign: "right" }}>
                  <select
                    value={asset.status}
                    onChange={(e) => handleStatusChange(asset.id, e.target.value as LabAsset["status"])}
                    style={s.statusSelect}
                  >
                    <option value="Operational">Operational</option>
                    <option value="In Use">In Use</option>
                    <option value="Under Maintenance">Under Maintenance</option>
                    <option value="Decommissioned">Decommissioned</option>
                  </select>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* ── Add Asset Modal (FR-RES-05) ─────────────────────────────────────── */}
      {showAddModal && (
        <div style={m.overlay}>
          <div style={m.modal}>
            <div style={m.header}>
              <div>
                <h3 style={m.title}>Register New Laboratory Asset</h3>
                <p style={m.sub}>Add hardware or instrument to the centralized catalog (FR-RES-05).</p>
              </div>
              <button onClick={() => setShowAddModal(false)} style={m.closeBtn}>✕</button>
            </div>

            <form onSubmit={handleAddAsset} style={m.body}>
              <div style={m.field}>
                <label style={m.label}>ASSET NAME *</label>
                <input
                  required
                  placeholder="e.g. Femtosecond Laser Micromachining Station"
                  value={nameInput}
                  onChange={(e) => setNameInput(e.target.value)}
                  style={m.input}
                />
              </div>

              <div style={m.row}>
                <div style={{ ...m.field, flex: 1 }}>
                  <label style={m.label}>CATEGORY</label>
                  <select
                    value={categoryInput}
                    onChange={(e) => setCategoryInput(e.target.value as LabAsset["category"])}
                    style={m.select}
                  >
                    <option value="GPU Compute">GPU Compute</option>
                    <option value="Lab Instrument">Lab Instrument</option>
                    <option value="Cleanroom">Cleanroom</option>
                    <option value="Software License">Software License</option>
                  </select>
                </div>

                <div style={{ ...m.field, flex: 1 }}>
                  <label style={m.label}>MAX BOOKING DURATION (HOURS)</label>
                  <input
                    type="number"
                    min={1}
                    max={24}
                    value={maxHoursInput}
                    onChange={(e) => setMaxHoursInput(Number(e.target.value))}
                    style={m.input}
                  />
                </div>
              </div>

              <div style={m.row}>
                <div style={{ ...m.field, flex: 1 }}>
                  <label style={m.label}>PHYSICAL LOCATION</label>
                  <input
                    placeholder="e.g. Photonics Lab, Bench 2"
                    value={locationInput}
                    onChange={(e) => setLocationInput(e.target.value)}
                    style={m.input}
                  />
                </div>

                <div style={{ ...m.field, flex: 1 }}>
                  <label style={m.label}>SERIAL / ASSET TAG</label>
                  <input
                    placeholder="e.g. SN-LAS-800FS-01"
                    value={serialInput}
                    onChange={(e) => setSerialInput(e.target.value)}
                    style={m.input}
                  />
                </div>
              </div>

              <div style={m.field}>
                <label style={m.label}>TECHNICAL SPECIFICATIONS & LIMITS</label>
                <textarea
                  rows={3}
                  placeholder="800nm Ti:Sapphire, 35fs pulse width, 1kHz repetition rate..."
                  value={specsInput}
                  onChange={(e) => setSpecsInput(e.target.value)}
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
                  Save Asset to Catalog
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
  badgeOp: { background: "#e8f5e9", color: "#2e7d32", border: "1px solid #c8e6c9" },
  badgeInUse: { background: "#eff6ff", color: "#1d4ed8", border: "1px solid #bfdbfe" },
  badgeMaint: { background: "#fee2e2", color: "#dc2626", border: "1px solid #fca5a5" },
  badgeLimit: { fontSize: 11, background: "#f5f5f5", border: "1px solid #e0e0e0", borderRadius: 3, padding: "2px 6px", color: "#424242", whiteSpace: "nowrap" as const, display: "inline-block" },
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
