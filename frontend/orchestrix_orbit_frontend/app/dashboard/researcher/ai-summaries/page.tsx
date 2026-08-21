"use client";

import { useState } from "react";

/* ── Types ───────────────────────────────────────────────────────────────── */
type SummaryCategory = "INTERVIEW TRANSCRIPTS" | "LITERATURE REVIEW" | "MEETING NOTES";

interface SummaryItem {
  id: string;
  category: SummaryCategory;
  title: string;
  preview: string;
  date: string;
  tags?: string[];
}

interface ActionItem {
  id: string;
  description: string;
  assignee: string;
  deadline: string;
}

interface SummaryDetail {
  id: string;
  source: string;
  title: string;
  date: string;
  generatedIn: string;
  body: React.ReactNode;
  actionItems: ActionItem[];
}

/* ── Static data ─────────────────────────────────────────────────────────── */
const SUMMARIES: SummaryItem[] = [
  {
    id: "sum-1",
    category: "INTERVIEW TRANSCRIPTS",
    title: "Project Alpha User Studies Q3",
    preview:
      "Key findings indicate a strong preference for localized data processing. Users expressed...",
    date: "Oct 24",
    tags: ["ALPHA", "UX"],
  },
  {
    id: "sum-2",
    category: "LITERATURE REVIEW",
    title: "Quantum Entanglement Patterns",
    preview:
      "Recent papers suggest novel approaches to stabilizing qubits at room temperature....",
    date: "Oct 22",
  },
  {
    id: "sum-3",
    category: "MEETING NOTES",
    title: "Weekly Sync: Core Engineering",
    preview:
      "Discussed upcoming deployment schedule and identified potential bottlenecks in the...",
    date: "Oct 20",
  },
];

const ACTION_ITEMS: ActionItem[] = [
  {
    id: "action-1",
    description: "Draft proposal for localized processing architecture.",
    assignee: "E. Chen",
    deadline: "Q4 Start",
  },
  {
    id: "action-2",
    description: "Review data ingestion module UI navigation.",
    assignee: "Design Team",
    deadline: "Next Sprint",
  },
  {
    id: "action-3",
    description: "Conduct follow-up interviews with enterprise client segment.",
    assignee: "A. Sterling",
    deadline: "Nov 5",
  },
];

const DETAIL: SummaryDetail = {
  id: "sum-1",
  source: "INTERVIEW TRANSCRIPTS • PROJECT ALPHA",
  title: "Project Alpha User Studies Q3 Summary",
  date: "Oct 24, 2023",
  generatedIn: "Generated in 4.2s",
  body: null,
  actionItems: ACTION_ITEMS,
};

/* ════════════════════════════════════════════════════════════════════════════
   AI Summaries Page
═══════════════════════════════════════════════════════════════════════════ */
export default function AiSummariesPage() {
  const [selectedId, setSelectedId] = useState("sum-1");

  return (
    <div>
      {/* ── Privacy notice banner ─────────────────────────────────────────── */}
      <div style={s.privacyBanner}>
        <svg width="13" height="13" viewBox="0 0 13 13" fill="none" stroke="currentColor" strokeWidth="1.3" style={{ marginRight: 8, flexShrink: 0 }}>
          <rect x="1.5" y="5" width="10" height="7" rx="1" />
          <path d="M4 5V3.5a2.5 2.5 0 0 1 5 0V5" strokeLinecap="round" />
        </svg>
        All summaries are generated locally using LangChain. Your research data is never transmitted to external servers.
      </div>

      {/* ── Page header ──────────────────────────────────────────────────── */}
      <div style={s.pageHeader}>
        <div>
          <h1 style={s.pageTitle}>AI Summaries</h1>
          <p style={s.pageSubtitle}>Review extracted insights and action items.</p>
        </div>
        <button id="btn-generate-summary" style={s.generateBtn}>
          <svg width="13" height="13" viewBox="0 0 13 13" fill="currentColor" style={{ marginRight: 6 }}>
            <path d="M6.5 1l.8 2.4h2.5l-2 1.5.8 2.4-2.1-1.5-2.1 1.5.8-2.4-2-1.5h2.5z" />
            <path d="M10.5 8l.4 1.2H12l-1 .7.4 1.2-1-.7-1 .7.4-1.2-1-.7h1.2z" />
            <path d="M2.5 8l.4 1.2H4l-1 .7.4 1.2-1-.7-1 .7.4-1.2-1-.7H2.1z" />
          </svg>
          Generate New Summary
        </button>
      </div>

      {/* ── Two-column layout ─────────────────────────────────────────────── */}
      <div style={s.columns}>
        {/* Left: summary list */}
        <div style={s.listCol}>
          {SUMMARIES.map((s2) => (
            <SummaryCard
              key={s2.id}
              item={s2}
              isActive={selectedId === s2.id}
              onClick={() => setSelectedId(s2.id)}
            />
          ))}
        </div>

        {/* Right: detail panel */}
        <div style={s.detailCol}>
          <DetailPanel detail={DETAIL} />
        </div>
      </div>
    </div>
  );
}

/* ── Summary Card ────────────────────────────────────────────────────────── */
function SummaryCard({
  item,
  isActive,
  onClick,
}: {
  item: SummaryItem;
  isActive: boolean;
  onClick: () => void;
}) {
  return (
    <button
      id={item.id}
      style={{ ...s.summaryCard, ...(isActive ? s.summaryCardActive : {}) }}
      onClick={onClick}
    >
      <div style={s.summaryCardTop}>
        <span style={s.categoryLabel}>{item.category}</span>
        <span style={s.summaryDate}>{item.date}</span>
      </div>
      <p style={s.summaryTitle}>{item.title}</p>
      <p style={s.summaryPreview}>{item.preview}</p>
      {item.tags && (
        <div style={s.tagRow}>
          {item.tags.map((t) => (
            <span key={t} style={s.tag}>{t}</span>
          ))}
        </div>
      )}
    </button>
  );
}

/* ── Detail Panel ────────────────────────────────────────────────────────── */
function DetailPanel({ detail }: { detail: SummaryDetail }) {
  return (
    <div style={s.detail}>
      {/* Source label */}
      <div style={s.detailSource}>
        <svg width="13" height="13" viewBox="0 0 13 13" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round" style={{ marginRight: 6, flexShrink: 0 }}>
          <path d="M2 1h7l3 3v8H2V1z" />
          <path d="M9 1v3h3" />
        </svg>
        SOURCE: {detail.source}
      </div>

      {/* Title */}
      <h2 style={s.detailTitle}>{detail.title}</h2>

      {/* Meta */}
      <div style={s.detailMeta}>
        <span style={s.detailMetaItem}>
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.2" style={{ marginRight: 4 }}>
            <rect x="1" y="1.5" width="10" height="9.5" rx="1.2" />
            <line x1="3.5" y1="1" x2="3.5" y2="2.5" strokeLinecap="round" />
            <line x1="8.5" y1="1" x2="8.5" y2="2.5" strokeLinecap="round" />
            <line x1="1" y1="4.5" x2="11" y2="4.5" />
          </svg>
          {detail.date}
        </span>
        <span style={s.detailMetaItem}>
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.2" style={{ marginRight: 4 }}>
            <circle cx="6" cy="6" r="5" />
            <path d="M6 3v3l2 2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          {detail.generatedIn}
        </span>
      </div>

      <div style={s.detailDivider} />

      {/* Body */}
      <div style={s.detailBody}>
        <p style={s.detailParagraph}>
          The consolidated interviews from Q3 highlight a critical pivot point for Project Alpha. Participants
          unanimously agreed that the interface&apos;s current iteration lacks intuitive navigation for complex
          workflows, specifically in the data ingestion module.
        </p>
        <p style={s.detailParagraph}>
          <strong>Security Concerns:</strong> A recurring theme was data sovereignty. Enterprise clients, representing
          80% of our interview pool, require on-premise or strictly localized processing capabilities. The
          current cloud-dependent architecture is viewed as a significant compliance risk.
        </p>
        <p style={s.detailParagraph}>
          <strong>Feature Requests:</strong> Enhanced filtering options and bulk export capabilities were requested by a
          majority of analysts. The ability to tag and categorize unstructured text during the ingestion
          phase was cited as a major workflow optimization.
        </p>
      </div>

      <div style={s.detailDivider} />

      {/* Action Items */}
      <div style={s.actionSection}>
        <div style={s.actionHeader}>
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
            <circle cx="8" cy="8" r="7" />
            <path d="M5 8l2.5 2.5L11 5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          <span style={s.actionHeaderText}>Extracted Action Items</span>
        </div>

        <table id="action-items-table" style={s.actionTable}>
          <thead>
            <tr>
              {["Action Item", "Assignee (Suggested)", "AI Deadline", "Action"].map((col) => (
                <th key={col} style={s.actionTh}>{col}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {detail.actionItems.map((item) => (
              <tr key={item.id} style={s.actionTr}>
                <td style={s.actionTd}>{item.description}</td>
                <td style={s.actionTd}>
                  <span style={s.assigneeCell}>
                    <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.2" style={{ marginRight: 4 }}>
                      <circle cx="6" cy="3.5" r="2.5" />
                      <path d="M1 11c0-2.76 2.24-5 5-5s5 2.24 5 5" strokeLinecap="round" />
                    </svg>
                    {item.assignee}
                  </span>
                </td>
                <td style={{ ...s.actionTd, fontStyle: "italic" as const, color: "#9e9e9e" }}>
                  {item.deadline}
                </td>
                <td style={s.actionTd}>
                  <button
                    id={`btn-add-kanban-${item.id}`}
                    style={s.addKanbanBtn}
                  >
                    + ADD TO KANBAN
                  </button>
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
  /* Privacy banner */
  privacyBanner: {
    display: "flex",
    alignItems: "center",
    fontSize: 12,
    color: "#616161",
    background: "#ffffff",
    border: "1px solid #e0e0e0",
    borderRadius: 6,
    padding: "10px 14px",
    marginBottom: 24,
  },

  /* Page header */
  pageHeader: {
    display: "flex",
    alignItems: "flex-start",
    justifyContent: "space-between",
    marginBottom: 24,
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
  },
  generateBtn: {
    display: "flex",
    alignItems: "center",
    padding: "8px 16px",
    fontSize: 13,
    fontWeight: 500,
    color: "#161616",
    background: "#ffffff",
    border: "1px solid #d0d0d0",
    borderRadius: 6,
    cursor: "pointer",
    whiteSpace: "nowrap" as const,
    flexShrink: 0,
  },

  /* Two-column layout */
  columns: {
    display: "grid",
    gridTemplateColumns: "300px 1fr",
    gap: 20,
    alignItems: "flex-start",
  },
  listCol: {
    display: "flex",
    flexDirection: "column" as const,
    gap: 10,
  },

  /* Summary Card */
  summaryCard: {
    display: "flex",
    flexDirection: "column" as const,
    gap: 6,
    padding: "14px 16px",
    background: "#ffffff",
    border: "1px solid #e0e0e0",
    borderRadius: 8,
    cursor: "pointer",
    textAlign: "left" as const,
    transition: "border-color 0.1s",
    width: "100%",
  },
  summaryCardActive: {
    border: "1px solid #161616",
    background: "#fafafa",
  },
  summaryCardTop: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 8,
  },
  categoryLabel: {
    fontSize: 10,
    fontWeight: 700,
    letterSpacing: "0.5px",
    color: "#9e9e9e",
    textTransform: "uppercase" as const,
  },
  summaryDate: {
    fontSize: 11,
    color: "#9e9e9e",
  },
  summaryTitle: {
    fontSize: 14,
    fontWeight: 700,
    color: "#161616",
    lineHeight: 1.35,
  },
  summaryPreview: {
    fontSize: 12,
    color: "#9e9e9e",
    lineHeight: 1.5,
  },
  tagRow: {
    display: "flex",
    gap: 6,
    marginTop: 4,
  },
  tag: {
    fontSize: 10,
    fontWeight: 600,
    letterSpacing: "0.4px",
    color: "#616161",
    background: "#f0f0f0",
    borderRadius: 3,
    padding: "2px 7px",
  },

  /* Detail panel */
  detailCol: {
    minHeight: 400,
  },
  detail: {
    background: "#ffffff",
    border: "1px solid #e0e0e0",
    borderRadius: 8,
    padding: "22px 24px",
  },
  detailSource: {
    display: "flex",
    alignItems: "center",
    fontSize: 10,
    fontWeight: 700,
    letterSpacing: "0.6px",
    color: "#9e9e9e",
    textTransform: "uppercase" as const,
    marginBottom: 10,
  },
  detailTitle: {
    fontSize: 20,
    fontWeight: 700,
    color: "#161616",
    letterSpacing: "-0.3px",
    marginBottom: 10,
  },
  detailMeta: {
    display: "flex",
    gap: 18,
    marginBottom: 14,
  },
  detailMetaItem: {
    display: "flex",
    alignItems: "center",
    fontSize: 12,
    color: "#9e9e9e",
  },
  detailDivider: {
    height: 1,
    background: "#eeeeee",
    margin: "18px 0",
  },
  detailBody: {
    display: "flex",
    flexDirection: "column" as const,
    gap: 14,
  },
  detailParagraph: {
    fontSize: 13,
    color: "#424242",
    lineHeight: 1.7,
  },

  /* Action items */
  actionSection: {
    display: "flex",
    flexDirection: "column" as const,
    gap: 14,
  },
  actionHeader: {
    display: "flex",
    alignItems: "center",
    gap: 8,
  },
  actionHeaderText: {
    fontSize: 14,
    fontWeight: 700,
    color: "#161616",
  },
  actionTable: {
    width: "100%",
    borderCollapse: "collapse" as const,
    fontSize: 13,
    border: "1px solid #e8e8e8",
    borderRadius: 6,
    overflow: "hidden" as const,
  },
  actionTh: {
    textAlign: "left" as const,
    padding: "10px 14px",
    fontSize: 11,
    fontWeight: 700,
    letterSpacing: "0.4px",
    color: "#9e9e9e",
    textTransform: "uppercase" as const,
    background: "#fafafa",
    borderBottom: "1px solid #e8e8e8",
    whiteSpace: "nowrap" as const,
  },
  actionTr: {
    borderBottom: "1px solid #f5f5f5",
  },
  actionTd: {
    padding: "12px 14px",
    color: "#161616",
    fontSize: 13,
    verticalAlign: "middle" as const,
  },
  assigneeCell: {
    display: "flex",
    alignItems: "center",
    color: "#616161",
  },
  addKanbanBtn: {
    fontSize: 11,
    fontWeight: 700,
    letterSpacing: "0.4px",
    color: "#9e9e9e",
    background: "none",
    border: "none",
    cursor: "pointer",
    padding: 0,
    whiteSpace: "nowrap" as const,
  },
};
