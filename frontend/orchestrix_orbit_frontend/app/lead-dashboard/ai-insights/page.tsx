"use client";

import React, { useState } from "react";
import Link from "next/link";

interface AiSummary {
  id: string;
  topic: string;
  project: string;
  model: string;
  confidence: number;
  date: string;
  status: "Pending Approval" | "Executed" | "Archived";
  summary: string;
  keyFindings: string[];
}

const INSIGHTS: AiSummary[] = [
  {
    id: "AI-101",
    topic: "Chamber 3 Thermal Decoherence Anomaly",
    project: "Project Alpha Core",
    model: "Llama-3-70b-Orchestrator",
    confidence: 96,
    date: "Aug 20, 2026",
    status: "Pending Approval",
    summary: "Telemetry analysis detected 1.4°C thermal drift during peak quantum simulation cycles exceeding tolerance thresholds.",
    keyFindings: [
      "Chamber 3 cryo-coolant manifold shows 1.4°C fluctuation",
      "Correlates with higher token batch processing during evening hours",
      "Recalibration required before executing Next Batch #44"
    ]
  },
  {
    id: "AI-102",
    topic: "Multi-Tenant Localized Enclave Computation",
    project: "Nexus Protocol",
    model: "Mistral-Large-Privacy",
    confidence: 91,
    date: "Aug 19, 2026",
    status: "Pending Approval",
    summary: "Aggregated user feedback shows 80% of node operators require zero-knowledge localized compute enclaves before federating telemetry.",
    keyFindings: [
      "High demand for tenant-isolated Docker PostgreSQL instances",
      "Enclave latency overhead estimated under 12ms",
      "Draft proposal prepared for Q4 Steering Committee review"
    ]
  },
  {
    id: "AI-103",
    topic: "Entanglement SNR Statistical Variance Synthesis",
    project: "Project Alpha Core",
    model: "DeepSeek-R1-Math",
    confidence: 98,
    date: "Aug 16, 2026",
    status: "Executed",
    summary: "Statistical proof completed for 128-channel Bell state fidelity measurements showing p < 0.001 significance.",
    keyFindings: [
      "Variance reduced by 22% using Kalman filter preprocessing",
      "Dataset hash validated and committed to encrypted cold storage",
      "Pre-print updated and signed with SHA-256"
    ]
  },
  {
    id: "AI-104",
    topic: "AES-256 GCM Key Distribution Benchmarks",
    project: "Beta Synthesis",
    model: "Llama-3-70b-Orchestrator",
    confidence: 94,
    date: "Aug 12, 2026",
    status: "Executed",
    summary: "Benchmarked session token throughput under 10,000 concurrent encrypted handshakes.",
    keyFindings: [
      "Average token issuance time: 1.8ms",
      "Zero key leakage detected during fuzz testing",
      "Cryptographic assertions verified with university advisor"
    ]
  },
];

export default function AiInsightsPage() {
  const [selectedItem, setSelectedItem] = useState<AiSummary | null>(null);

  return (
    <div>
      {/* ── Page Header ────────────────────────────────────────────────────── */}
      <div style={s.headerRow}>
        <div>
          <h1 style={s.pageTitle}>AI Summaries</h1>
          <p style={s.pageSub}>Automated experiment synthesis, anomaly detection, and LLM telemetry pipelines.</p>
        </div>

        <Link href="/lead-dashboard" style={s.btnPrimary}>
          Review Pending Approvals →
        </Link>
      </div>

      {/* ── Stat Cards ──────────────────────────────────────────────────────── */}
      <div style={s.statGrid}>
        <div style={s.statCard}>
          <span style={s.statLabel}>SYNTHESIZED INSIGHTS</span>
          <span style={s.statValue}>{INSIGHTS.length}</span>
          <span style={s.statSub}>Across all projects</span>
        </div>
        <div style={s.statCard}>
          <span style={s.statLabel}>AVG CONFIDENCE</span>
          <span style={s.statValue}>94.8%</span>
          <span style={s.statSub}>Statistical validation</span>
        </div>
        <div style={s.statCard}>
          <span style={s.statLabel}>PENDING APPROVALS</span>
          <span style={s.statValue}>2</span>
          <span style={s.statSub}>Awaiting lead review</span>
        </div>
        <div style={s.statCard}>
          <span style={s.statLabel}>ACTIVE LLM MODELS</span>
          <span style={s.statValue}>3</span>
          <span style={s.statSub}>Isolated local instances</span>
        </div>
      </div>

      {/* ── Main Summaries Table Card ───────────────────────────────────────── */}
      <div style={s.tableCard}>
        <div style={s.tableHeaderRow}>
          <p style={s.sectionLabel}>AI SYNTHESIS LOG & EXPERIMENT SUMMARIES</p>
          <span style={{ fontSize: 12, color: "#9e9e9e", marginRight: 16 }}>{INSIGHTS.length} Entries</span>
        </div>

        <table style={s.table}>
          <thead>
            <tr>
              <th style={s.th}>Synthesis Topic</th>
              <th style={s.th}>Target Project</th>
              <th style={s.th}>LLM Pipeline / Model</th>
              <th style={s.th}>Confidence</th>
              <th style={s.th}>Date</th>
              <th style={{ ...s.th, textAlign: "right" }}>Status</th>
            </tr>
          </thead>
          <tbody>
            {INSIGHTS.map((item) => (
              <tr 
                key={item.id} 
                style={s.tr}
                onClick={() => setSelectedItem(item)}
                className="cursor-pointer hover:bg-slate-50"
              >
                <td style={s.td}>
                  <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                    <span style={s.topicName}>{item.topic}</span>
                    <span style={s.topicSub}>{item.id} • Click to inspect details</span>
                  </div>
                </td>
                <td style={{ ...s.td, color: "#616161", fontWeight: 500 }}>{item.project}</td>
                <td style={{ ...s.td, color: "#616161", fontFamily: "monospace", fontSize: 12 }}>
                  {item.model}
                </td>
                <td style={s.td}>
                  <span style={s.confidenceBadge}>{item.confidence}% Match</span>
                </td>
                <td style={{ ...s.td, color: "#9e9e9e" }}>{item.date}</td>
                <td style={{ ...s.td, textAlign: "right" }}>
                  <span
                    style={{
                      ...s.badge,
                      ...(item.status === "Executed" ? s.badgeDone : s.badgePending),
                    }}
                  >
                    {item.status}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* ── Detail Modal ────────────────────────────────────────────────────── */}
      {selectedItem && (
        <div style={m.overlay}>
          <div style={m.modal}>
            <div style={m.header}>
              <div>
                <h3 style={m.title}>{selectedItem.topic}</h3>
                <p style={m.sub}>
                  {selectedItem.id} • Generated by <strong>{selectedItem.model}</strong> ({selectedItem.confidence}% confidence)
                </p>
              </div>
              <button onClick={() => setSelectedItem(null)} style={m.closeBtn}>✕</button>
            </div>

            <div style={m.body}>
              <div style={m.section}>
                <span style={m.label}>TARGET PROJECT</span>
                <p style={{ fontSize: 14, fontWeight: 600, color: "#161616", marginTop: 4 }}>
                  {selectedItem.project} • Logged on {selectedItem.date}
                </p>
              </div>

              <div style={m.section}>
                <span style={m.label}>EXECUTIVE SUMMARY</span>
                <p style={m.text}>{selectedItem.summary}</p>
              </div>

              <div style={{ ...m.section, borderBottom: "none", paddingBottom: 0 }}>
                <span style={m.label}>KEY FINDINGS & ACTION ITEMS</span>
                <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 8 }}>
                  {selectedItem.keyFindings.map((finding, i) => (
                    <div key={i} style={{ display: "flex", gap: 8, fontSize: 13, color: "#161616" }}>
                      <span style={{ color: "#9e9e9e", fontWeight: 700 }}>•</span>
                      <span>{finding}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div style={m.footer}>
              <span style={{ fontSize: 12, color: "#9e9e9e" }}>
                Status: <strong>{selectedItem.status}</strong>
              </span>
              <button onClick={() => setSelectedItem(null)} style={m.btnPrimary}>
                Close
              </button>
            </div>
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
    textDecoration: "none",
    display: "inline-block",
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
    cursor: "pointer",
  },
  td: {
    padding: "12px 16px",
    color: "#161616",
    fontSize: 13,
    verticalAlign: "middle" as const,
  },
  topicName: {
    fontWeight: 600,
    color: "#161616",
  },
  topicSub: {
    fontSize: 11,
    color: "#9e9e9e",
  },
  confidenceBadge: {
    fontSize: 11,
    fontWeight: 600,
    color: "#2e7d32",
    background: "#e8f5e9",
    padding: "2px 6px",
    borderRadius: 3,
  },
  badge: {
    fontSize: 11,
    fontWeight: 600,
    padding: "3px 8px",
    borderRadius: 4,
  },
  badgeDone: {
    background: "#161616",
    color: "#ffffff",
  },
  badgePending: {
    background: "#fff8e1",
    color: "#f57f17",
    border: "1px solid #ffe082",
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
    border: "1px solid #e0e0e0",
    borderRadius: 6,
    width: "100%",
    maxWidth: 560,
    boxShadow: "0 10px 25px rgba(0, 0, 0, 0.1)",
  },
  header: {
    padding: "18px 24px",
    borderBottom: "1px solid #eeeeee",
    display: "flex",
    alignItems: "flex-start",
    justifyContent: "space-between",
  },
  title: {
    fontSize: 16,
    fontWeight: 700,
    color: "#161616",
  },
  sub: {
    fontSize: 12,
    color: "#9e9e9e",
    marginTop: 2,
  },
  closeBtn: {
    background: "none",
    border: "none",
    fontSize: 15,
    color: "#9e9e9e",
    cursor: "pointer",
  },
  body: {
    padding: "20px 24px",
    display: "flex",
    flexDirection: "column",
    gap: 14,
  },
  section: {
    borderBottom: "1px solid #f0f0f0",
    paddingBottom: 12,
  },
  label: {
    fontSize: 11,
    fontWeight: 600,
    color: "#9e9e9e",
    letterSpacing: "0.5px",
    display: "block",
  },
  text: {
    fontSize: 13,
    color: "#424242",
    lineHeight: 1.5,
    marginTop: 4,
  },
  footer: {
    padding: "14px 24px",
    borderTop: "1px solid #eeeeee",
    background: "#fafafa",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
  },
  btnPrimary: {
    padding: "8px 16px",
    background: "#161616",
    color: "#ffffff",
    border: "none",
    borderRadius: 4,
    fontSize: 13,
    fontWeight: 600,
    cursor: "pointer",
  },
};
