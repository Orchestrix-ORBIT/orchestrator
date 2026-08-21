"use client";

import { useState } from "react";

/* ── Types ───────────────────────────────────────────────────────────────── */
type DocStatus = "Encrypted" | "Shared" | "Archived";
type FileType = "pdf" | "docx" | "csv" | "folder";

interface Document {
  id: string;
  name: string;
  fileType: FileType;
  project: string;
  owner: string;
  dateModified: string;
  size: string;
  status: DocStatus;
}

interface RecentFile {
  id: string;
  name: string;
  fileType: FileType;
  editedLabel: string;
}

/* ── Static data ─────────────────────────────────────────────────────────── */
const RECENT_FILES: RecentFile[] = [
  { id: "recent-1", name: "Project_Alpha_Requirements.pdf", fileType: "pdf",    editedLabel: "Edited 2h ago"    },
  { id: "recent-2", name: "Q3_Financial_Review.docx",       fileType: "docx",   editedLabel: "Edited 5h ago"    },
  { id: "recent-3", name: "Dataset_V2_Cleaned.csv",         fileType: "csv",    editedLabel: "Edited Yesterday" },
];

const ALL_DOCUMENTS: Document[] = [
  {
    id: "doc-1",
    name: "Project_Alpha_Requirements.pdf",
    fileType: "pdf",
    project: "Alpha Development",
    owner: "Dr. E. Vance",
    dateModified: "Oct 24, 2023",
    size: "2.4 MB",
    status: "Encrypted",
  },
  {
    id: "doc-2",
    name: "Q3_Financial_Review.docx",
    fileType: "docx",
    project: "Finance Ops",
    owner: "A. Sterling",
    dateModified: "Oct 23, 2023",
    size: "1.1 MB",
    status: "Shared",
  },
  {
    id: "doc-3",
    name: "Dataset_V2_Cleaned.csv",
    fileType: "csv",
    project: "ML Training",
    owner: "S. Chen",
    dateModified: "Oct 20, 2023",
    size: "45.8 MB",
    status: "Encrypted",
  },
  {
    id: "doc-4",
    name: "Archived_Research_2022",
    fileType: "folder",
    project: "General",
    owner: "System",
    dateModified: "Dec 31, 2022",
    size: "--",
    status: "Archived",
  },
];

/* ── Status badge styles ─────────────────────────────────────────────────── */
const STATUS_BADGE: Record<DocStatus, React.CSSProperties> = {
  Encrypted: { background: "transparent", color: "#424242", border: "1px solid #d0d0d0" },
  Shared:    { background: "transparent", color: "#424242", border: "1px solid #d0d0d0" },
  Archived:  { background: "transparent", color: "#9e9e9e", border: "1px solid #e8e8e8" },
};

const STATUS_ICON: Record<DocStatus, React.ReactNode> = {
  Encrypted: (
    <svg width="11" height="11" viewBox="0 0 11 11" fill="none" stroke="currentColor" strokeWidth="1.2" style={{ marginRight: 4 }}>
      <rect x="1.5" y="4.5" width="8" height="5.5" rx="1" />
      <path d="M3.5 4.5V3.5a2 2 0 0 1 4 0v1" strokeLinecap="round" />
    </svg>
  ),
  Shared: (
    <svg width="11" height="11" viewBox="0 0 11 11" fill="none" stroke="currentColor" strokeWidth="1.2" style={{ marginRight: 4 }}>
      <circle cx="5.5" cy="3.5" r="2" />
      <path d="M1 9.5c0-2.5 2-4 4.5-4s4.5 1.5 4.5 4" strokeLinecap="round" />
    </svg>
  ),
  Archived: (
    <svg width="11" height="11" viewBox="0 0 11 11" fill="none" stroke="currentColor" strokeWidth="1.2" style={{ marginRight: 4 }}>
      <rect x="1" y="3" width="9" height="7" rx="1" />
      <path d="M1 3l1.5-2h6L10 3" strokeLinejoin="round" />
      <line x1="4" y1="6.5" x2="7" y2="6.5" strokeLinecap="round" />
    </svg>
  ),
};

/* ── File type icons ─────────────────────────────────────────────────────── */
function FileIcon({ type, size = 16 }: { type: FileType; size?: number }) {
  if (type === "folder") {
    return (
      <svg width={size} height={size} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round">
        <path d="M1 4.5C1 3.67 1.67 3 2.5 3H6l1.5 1.5H13.5C14.33 4.5 15 5.17 15 6v7c0 .83-.67 1.5-1.5 1.5h-11C1.67 14.5 1 13.83 1 13V4.5z" />
      </svg>
    );
  }
  if (type === "pdf") {
    return (
      <svg width={size} height={size} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round">
        <path d="M3 1h7l3 3v11H3V1z" />
        <path d="M10 1v3h3" />
        <rect x="4.5" y="8.5" width="7" height="1.5" rx="0.5" fill="currentColor" stroke="none" opacity="0.5" />
        <rect x="4.5" y="11" width="5" height="1.5" rx="0.5" fill="currentColor" stroke="none" opacity="0.5" />
      </svg>
    );
  }
  if (type === "csv") {
    return (
      <svg width={size} height={size} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round">
        <rect x="1" y="1" width="14" height="14" rx="2" />
        <line x1="1" y1="5.5" x2="15" y2="5.5" />
        <line x1="1" y1="9.5" x2="15" y2="9.5" />
        <line x1="5.5" y1="5.5" x2="5.5" y2="15" />
        <line x1="10" y1="5.5" x2="10" y2="15" />
      </svg>
    );
  }
  /* docx */
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round">
      <path d="M3 1h7l3 3v11H3V1z" />
      <path d="M10 1v3h3" />
      <line x1="5" y1="8" x2="11" y2="8" strokeLinecap="round" />
      <line x1="5" y1="11" x2="9" y2="11" strokeLinecap="round" />
    </svg>
  );
}

/* ════════════════════════════════════════════════════════════════════════════
   Documents Page
═══════════════════════════════════════════════════════════════════════════ */
export default function DocumentsPage() {
  const [search, setSearch] = useState("");

  const filtered = ALL_DOCUMENTS.filter((d) =>
    d.name.toLowerCase().includes(search.toLowerCase()) ||
    d.project.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div>
      {/* ── Recent Files ──────────────────────────────────────────────────── */}
      <div style={s.sectionHeader}>
        <h2 style={s.sectionTitle}>Recent Files</h2>
        <button id="btn-view-all" style={s.viewAllBtn}>
          View All →
        </button>
      </div>

      <div style={s.recentGrid}>
        {RECENT_FILES.map((f) => (
          <div key={f.id} id={f.id} style={s.recentCard}>
            <span style={s.recentIcon}>
              <FileIcon type={f.fileType} size={18} />
            </span>
            <p style={s.recentName}>{f.name}</p>
            <p style={s.recentEdited}>{f.editedLabel}</p>
          </div>
        ))}

        {/* New Document card */}
        <button id="btn-new-document" style={s.newDocCard}>
          <span style={s.newDocPlus}>+</span>
          <span style={s.newDocLabel}>New Document</span>
        </button>
      </div>

      {/* ── All Documents ─────────────────────────────────────────────────── */}
      <div style={s.allDocsHeader}>
        <h2 style={s.sectionTitle}>All Documents</h2>
        <button id="btn-filter-docs" style={s.filterBtn}>
          <svg width="13" height="13" viewBox="0 0 13 13" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round">
            <line x1="1" y1="3.5" x2="12" y2="3.5" />
            <line x1="3" y1="6.5" x2="10" y2="6.5" />
            <line x1="5" y1="9.5" x2="8"  y2="9.5" />
          </svg>
          Filter
        </button>
      </div>

      {/* Table */}
      <div style={s.tableWrap}>
        <table id="all-documents-table" style={s.table}>
          <thead>
            <tr>
              {["Name", "Project", "Owner", "Date Modified", "Size", "Status", "Actions"].map(
                (col) => (
                  <th key={col} style={s.th}>
                    {col}
                  </th>
                )
              )}
            </tr>
          </thead>
          <tbody>
            {filtered.map((doc) => (
              <tr key={doc.id} id={doc.id} style={s.tr}>
                {/* Name */}
                <td style={s.td}>
                  <span style={s.nameCell}>
                    <span style={s.fileIconWrap}>
                      <FileIcon type={doc.fileType} size={14} />
                    </span>
                    <span style={s.docName}>{doc.name}</span>
                  </span>
                </td>
                {/* Project */}
                <td style={{ ...s.td, color: "#9e9e9e" }}>{doc.project}</td>
                {/* Owner */}
                <td style={{ ...s.td, color: "#9e9e9e" }}>{doc.owner}</td>
                {/* Date Modified */}
                <td style={{ ...s.td, color: "#616161" }}>{doc.dateModified}</td>
                {/* Size */}
                <td style={{ ...s.td, fontVariantNumeric: "tabular-nums", color: "#9e9e9e", fontFamily: "monospace" }}>
                  {doc.size}
                </td>
                {/* Status */}
                <td style={s.td}>
                  <span style={{ ...s.statusBadge, ...STATUS_BADGE[doc.status] }}>
                    {STATUS_ICON[doc.status]}
                    {doc.status}
                  </span>
                </td>
                {/* Actions */}
                <td style={s.td}>
                  <div style={s.actionsWrap}>
                    <button
                      id={`btn-action-${doc.id}`}
                      style={s.actionBtn}
                      title="More actions"
                    >
                      •••
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* ── Styles ─────────────────────────────────────────────────────────────── */
const s: Record<string, React.CSSProperties> = {
  /* Section headers */
  sectionHeader: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 700,
    color: "#161616",
    letterSpacing: "-0.2px",
  },
  viewAllBtn: {
    fontSize: 13,
    fontWeight: 500,
    color: "#616161",
    background: "transparent",
    border: "none",
    cursor: "pointer",
  },

  /* Recent files grid */
  recentGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(4, 1fr)",
    gap: 14,
    marginBottom: 36,
  },
  recentCard: {
    background: "#ffffff",
    border: "1px solid #e0e0e0",
    borderRadius: 8,
    padding: "18px 16px 16px",
    display: "flex",
    flexDirection: "column" as const,
    gap: 8,
    cursor: "pointer",
  },
  recentIcon: {
    color: "#616161",
    display: "flex",
  },
  recentName: {
    fontSize: 13,
    fontWeight: 600,
    color: "#161616",
    lineHeight: 1.4,
    wordBreak: "break-word" as const,
  },
  recentEdited: {
    fontSize: 12,
    color: "#9e9e9e",
    marginTop: "auto",
  },

  /* New Document card */
  newDocCard: {
    background: "transparent",
    border: "1px dashed #d0d0d0",
    borderRadius: 8,
    padding: "18px 16px 16px",
    display: "flex",
    flexDirection: "column" as const,
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    cursor: "pointer",
    minHeight: 110,
  },
  newDocPlus: {
    fontSize: 22,
    color: "#9e9e9e",
    lineHeight: 1,
  },
  newDocLabel: {
    fontSize: 13,
    fontWeight: 500,
    color: "#9e9e9e",
  },

  /* All Documents section */
  allDocsHeader: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 14,
  },
  filterBtn: {
    display: "flex",
    alignItems: "center",
    gap: 6,
    padding: "6px 12px",
    fontSize: 12,
    fontWeight: 500,
    color: "#616161",
    background: "transparent",
    border: "1px solid #e0e0e0",
    borderRadius: 6,
    cursor: "pointer",
  },

  /* Table */
  tableWrap: {
    background: "#ffffff",
    border: "1px solid #e0e0e0",
    borderRadius: 8,
    overflow: "hidden" as const,
  },
  table: {
    width: "100%",
    borderCollapse: "collapse" as const,
    fontSize: 13,
  },
  th: {
    textAlign: "left" as const,
    padding: "10px 16px",
    fontSize: 12,
    fontWeight: 500,
    color: "#9e9e9e",
    background: "#fafafa",
    borderBottom: "1px solid #eeeeee",
    whiteSpace: "nowrap" as const,
  },
  tr: {
    borderBottom: "1px solid #f5f5f5",
  },
  td: {
    padding: "12px 16px",
    color: "#161616",
    fontSize: 13,
    verticalAlign: "middle" as const,
  },
  nameCell: {
    display: "flex",
    alignItems: "center",
    gap: 10,
  },
  fileIconWrap: {
    color: "#616161",
    display: "flex",
    flexShrink: 0,
  },
  docName: {
    fontWeight: 500,
    color: "#161616",
  },
  statusBadge: {
    display: "inline-flex",
    alignItems: "center",
    padding: "3px 10px",
    borderRadius: 4,
    fontSize: 12,
    fontWeight: 500,
    whiteSpace: "nowrap" as const,
  },
  actionsWrap: {
    display: "flex",
    justifyContent: "flex-end",
  },
  actionBtn: {
    fontSize: 14,
    color: "#9e9e9e",
    background: "none",
    border: "none",
    cursor: "pointer",
    padding: "2px 6px",
    letterSpacing: 1,
  },
};
