"use client";

import { useState } from "react";

/* ── Types ───────────────────────────────────────────────────────────────── */
type ResourceAvailability = "Available" | "Booked" | "Maintenance";
type ResourceCategory = "COMP-NODE" | "LAB-EQP" | "MEETING";
type ActiveTab = "Browse Resources" | "My Bookings";

interface Resource {
  id: string;
  category: ResourceCategory;
  name: string;
  description: string;
  availability: ResourceAvailability;
  securityLabel: string;
  nextAvailable?: string; /* shown when Booked */
  maintenanceNote?: string; /* shown when Maintenance */
}

/* ── Static data ─────────────────────────────────────────────────────────── */
const RESOURCES: Resource[] = [
  {
    id: "resource-gpu-cluster-alpha",
    category: "COMP-NODE",
    name: "GPU Cluster Alpha",
    description:
      "High-performance computing node equipped with 4x A100 GPUs for deep learning workloads.",
    availability: "Available",
    securityLabel: "Secured Node",
  },
  {
    id: "resource-spectrometer-bx200",
    category: "LAB-EQP",
    name: "Spectrometer BX-200",
    description:
      "Mass spectrometer configured for high-resolution isotope ratio analysis.",
    availability: "Booked",
    securityLabel: "Next available: 14:00",
    nextAvailable: "14:00",
  },
  {
    id: "resource-war-room-c",
    category: "MEETING",
    name: "War Room C",
    description:
      "Secure meeting facility with faraday cage shielding and encrypted A/V setup.",
    availability: "Maintenance",
    maintenanceNote: "AV System Upgrade",
    securityLabel: "AV System Upgrade",
  },
  {
    id: "resource-data-pipeline-server-2",
    category: "COMP-NODE",
    name: "Data Pipeline Server 2",
    description:
      "Dedicated ETL server for processing large-scale genomic datasets.",
    availability: "Available",
    securityLabel: "Secured Node",
  },
];

/* ── Availability dot colours ────────────────────────────────────────────── */
const AVAIL_DOT: Record<ResourceAvailability, string> = {
  Available: "#22c55e",
  Booked: "#f59e0b",
  Maintenance: "#9e9e9e",
};

const AVAIL_BADGE: Record<ResourceAvailability, React.CSSProperties> = {
  Available: {
    background: "transparent",
    color: "#161616",
    border: "1px solid #d0d0d0",
  },
  Booked: {
    background: "transparent",
    color: "#161616",
    border: "1px solid #d0d0d0",
  },
  Maintenance: {
    background: "transparent",
    color: "#9e9e9e",
    border: "1px solid #e0e0e0",
  },
};

/* ════════════════════════════════════════════════════════════════════════════
   Resources & Booking Page
═══════════════════════════════════════════════════════════════════════════ */
export default function ResourcesPage() {
  const [activeTab, setActiveTab] = useState<ActiveTab>("Browse Resources");
  const [search, setSearch] = useState("");
  const [typeFilter] = useState("All Types");
  const [statusFilter] = useState("Any Status");

  const filtered = RESOURCES.filter((r) =>
    r.name.toLowerCase().includes(search.toLowerCase()) ||
    r.description.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div>
      {/* ── Page header ──────────────────────────────────────────────────── */}
      <div style={s.pageHeader}>
        <div>
          <h1 style={s.pageTitle}>Resources &amp; Booking</h1>
          <p style={s.pageSubtitle}>
            <svg width="13" height="13" viewBox="0 0 13 13" fill="none" stroke="currentColor" strokeWidth="1.3" style={{ verticalAlign: "middle", marginRight: 4 }}>
              <rect x="1.5" y="4.5" width="10" height="7" rx="1" />
              <path d="M4.5 4.5V3a2 2 0 0 1 4 0v1.5" strokeLinecap="round" />
            </svg>
            End-to-end encrypted scheduling
          </p>
        </div>
      </div>

      {/* ── Divider ──────────────────────────────────────────────────────── */}
      <div style={s.divider} />

      {/* ── Tabs ─────────────────────────────────────────────────────────── */}
      <div style={s.tabRow}>
        {(["Browse Resources", "My Bookings"] as ActiveTab[]).map((tab) => (
          <button
            key={tab}
            id={`tab-${tab.toLowerCase().replace(/\s/g, "-")}`}
            style={activeTab === tab ? s.tabActive : s.tab}
            onClick={() => setActiveTab(tab)}
          >
            {tab}
          </button>
        ))}
      </div>

      {activeTab === "Browse Resources" && (
        <>
          {/* ── Search + Filters ───────────────────────────────────────── */}
          <div style={s.searchFilterRow}>
            {/* Search */}
            <div style={s.searchWrap}>
              <svg width="13" height="13" viewBox="0 0 13 13" fill="none" stroke="#9e9e9e" strokeWidth="1.4" strokeLinecap="round" style={{ flexShrink: 0 }}>
                <circle cx="5.5" cy="5.5" r="4" />
                <line x1="9" y1="9" x2="12" y2="12" />
              </svg>
              <input
                id="input-search-resources"
                type="text"
                placeholder="Search resources..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                style={s.searchInput}
              />
            </div>

            {/* Filters */}
            <div style={s.filterGroup}>
              <button id="dropdown-type" style={s.dropdown}>
                {typeFilter}
                <svg width="11" height="11" viewBox="0 0 11 11" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round">
                  <path d="M2.5 4l3 3 3-3" />
                </svg>
              </button>
              <button id="dropdown-status" style={s.dropdown}>
                {statusFilter}
                <svg width="11" height="11" viewBox="0 0 11 11" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round">
                  <path d="M2.5 4l3 3 3-3" />
                </svg>
              </button>
            </div>
          </div>

          {/* ── Resource Cards Grid ────────────────────────────────────── */}
          <div style={s.grid}>
            {filtered.map((r) => (
              <ResourceCard key={r.id} resource={r} />
            ))}
          </div>
        </>
      )}

      {activeTab === "My Bookings" && (
        <div style={s.emptyState}>
          <p style={s.emptyText}>No active bookings</p>
          <p style={s.emptySubtext}>Browse resources above to make a booking.</p>
        </div>
      )}
    </div>
  );
}

/* ── Resource Card ───────────────────────────────────────────────────────── */
function ResourceCard({ resource: r }: { resource: Resource }) {
  return (
    <div id={r.id} style={s.card}>
      {/* Top: category badge + availability badge */}
      <div style={s.cardTop}>
        <span style={s.categoryBadge}>{r.category}</span>
        <span style={{ ...s.availBadge, ...AVAIL_BADGE[r.availability] }}>
          <span
            style={{
              display: "inline-block",
              width: 7,
              height: 7,
              borderRadius: "50%",
              background: AVAIL_DOT[r.availability],
              marginRight: 5,
              flexShrink: 0,
            }}
          />
          {r.availability}
        </span>
      </div>

      {/* Name */}
      <h3 style={s.cardName}>{r.name}</h3>

      {/* Description */}
      <p style={s.cardDesc}>{r.description}</p>

      {/* Bottom: security label + action button */}
      <div style={s.cardBottom}>
        <span style={s.securityLabel}>
          {r.availability === "Booked" ? (
            <>
              {/* Clock icon */}
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.3" style={{ marginRight: 4, verticalAlign: "middle" }}>
                <circle cx="6" cy="6" r="5" />
                <path d="M6 3v3l2 2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              Next available: {r.nextAvailable}
            </>
          ) : r.availability === "Maintenance" ? (
            <>
              {/* Wrench icon */}
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.3" style={{ marginRight: 4, verticalAlign: "middle" }}>
                <path d="M8.5 1a3 3 0 0 0-2.83 4L1.5 9.17a1 1 0 0 0 1.33 1.33L7 6.33A3 3 0 0 0 8.5 1z" strokeLinejoin="round" />
              </svg>
              {r.maintenanceNote}
            </>
          ) : (
            <>
              {/* Lock icon */}
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.3" style={{ marginRight: 4, verticalAlign: "middle" }}>
                <rect x="1.5" y="5" width="9" height="6.5" rx="1" />
                <path d="M3.5 5V3.5a2.5 2.5 0 0 1 5 0V5" strokeLinecap="round" />
              </svg>
              {r.securityLabel}
            </>
          )}
        </span>

        {r.availability === "Available" ? (
          <button
            id={`btn-book-${r.id}`}
            style={s.bookBtn}
          >
            Book
          </button>
        ) : r.availability === "Booked" ? (
          <button id={`btn-booked-${r.id}`} style={s.bookedBtn} disabled>
            Booked
          </button>
        ) : (
          <button id={`btn-unavailable-${r.id}`} style={s.unavailableBtn} disabled>
            Unavailable
          </button>
        )}
      </div>
    </div>
  );
}

/* ── Styles ─────────────────────────────────────────────────────────────── */
const s: Record<string, React.CSSProperties> = {
  /* Page header */
  pageHeader: {
    marginBottom: 16,
  },
  pageTitle: {
    fontSize: 28,
    fontWeight: 700,
    color: "#161616",
    letterSpacing: "-0.5px",
    marginBottom: 4,
  },
  pageSubtitle: {
    fontSize: 13,
    color: "#9e9e9e",
    display: "flex",
    alignItems: "center",
  },

  divider: {
    height: 1,
    background: "#e8e8e8",
    marginBottom: 20,
  },

  /* Tabs */
  tabRow: {
    display: "flex",
    gap: 0,
    borderBottom: "1px solid #e8e8e8",
    marginBottom: 20,
  },
  tab: {
    padding: "10px 18px",
    fontSize: 13,
    fontWeight: 500,
    color: "#9e9e9e",
    background: "transparent",
    border: "none",
    borderBottom: "2px solid transparent",
    cursor: "pointer",
    marginBottom: -1,
  },
  tabActive: {
    padding: "10px 18px",
    fontSize: 13,
    fontWeight: 600,
    color: "#161616",
    background: "transparent",
    border: "none",
    borderBottom: "2px solid #161616",
    cursor: "pointer",
    marginBottom: -1,
  },

  /* Search + filters */
  searchFilterRow: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    marginBottom: 20,
  },
  searchWrap: {
    display: "flex",
    alignItems: "center",
    gap: 8,
    background: "#ffffff",
    border: "1px solid #d8d8d8",
    borderRadius: 6,
    padding: "7px 12px",
    width: 280,
  },
  searchInput: {
    border: "none",
    outline: "none",
    background: "transparent",
    fontSize: 13,
    color: "#161616",
    width: "100%",
  },
  filterGroup: {
    display: "flex",
    gap: 8,
  },
  dropdown: {
    display: "flex",
    alignItems: "center",
    gap: 6,
    padding: "7px 14px",
    fontSize: 13,
    fontWeight: 500,
    color: "#424242",
    background: "#ffffff",
    border: "1px solid #d0d0d0",
    borderRadius: 6,
    cursor: "pointer",
  },

  /* Grid */
  grid: {
    display: "grid",
    gridTemplateColumns: "repeat(3, 1fr)",
    gap: 16,
  },

  /* Resource Card */
  card: {
    background: "#ffffff",
    border: "1px solid #e0e0e0",
    borderRadius: 8,
    padding: "16px 18px",
    display: "flex",
    flexDirection: "column" as const,
    gap: 10,
  },
  cardTop: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
  },
  categoryBadge: {
    fontSize: 10,
    fontWeight: 700,
    letterSpacing: "0.5px",
    color: "#616161",
    background: "#f0f0f0",
    borderRadius: 3,
    padding: "3px 7px",
  },
  availBadge: {
    display: "inline-flex",
    alignItems: "center",
    fontSize: 12,
    fontWeight: 500,
    borderRadius: 20,
    padding: "3px 10px",
    whiteSpace: "nowrap" as const,
  },
  cardName: {
    fontSize: 17,
    fontWeight: 700,
    color: "#161616",
    letterSpacing: "-0.2px",
    lineHeight: 1.3,
  },
  cardDesc: {
    fontSize: 13,
    color: "#616161",
    lineHeight: 1.55,
    flex: 1,
  },
  cardBottom: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
    marginTop: 4,
    paddingTop: 12,
    borderTop: "1px solid #f0f0f0",
  },
  securityLabel: {
    display: "flex",
    alignItems: "center",
    fontSize: 12,
    color: "#9e9e9e",
  },

  /* Buttons */
  bookBtn: {
    padding: "7px 22px",
    fontSize: 13,
    fontWeight: 600,
    color: "#ffffff",
    background: "#161616",
    border: "none",
    borderRadius: 6,
    cursor: "pointer",
    flexShrink: 0,
  },
  bookedBtn: {
    padding: "7px 18px",
    fontSize: 13,
    fontWeight: 500,
    color: "#9e9e9e",
    background: "transparent",
    border: "1px solid #e0e0e0",
    borderRadius: 6,
    cursor: "not-allowed",
    flexShrink: 0,
  },
  unavailableBtn: {
    padding: "7px 12px",
    fontSize: 13,
    fontWeight: 500,
    color: "#bdbdbd",
    background: "transparent",
    border: "1px solid #e8e8e8",
    borderRadius: 6,
    cursor: "not-allowed",
    flexShrink: 0,
  },

  /* Empty state (My Bookings tab) */
  emptyState: {
    textAlign: "center" as const,
    padding: "80px 0",
  },
  emptyText: {
    fontSize: 15,
    fontWeight: 600,
    color: "#616161",
    marginBottom: 6,
  },
  emptySubtext: {
    fontSize: 13,
    color: "#9e9e9e",
  },
};
