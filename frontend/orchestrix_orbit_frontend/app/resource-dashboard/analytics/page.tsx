"use client";

import React from "react";

export default function UsageAnalyticsPage() {
  return (
    <div>
      {/* ── Page Header ────────────────────────────────────────────────────── */}
      <div style={s.headerRow}>
        <div>
          <h1 style={s.pageTitle}>Usage & Capacity Analytics</h1>
          <p style={s.pageSub}>
            Historical hardware utilization, peak booking hours, and cross-project compute quotas (FR-RES-01).
          </p>
        </div>

        <button style={s.btnSecondary}>
          📥 Export Monthly Telemetry Report
        </button>
      </div>

      {/* ── Metric Stat Cards ────────────────────────────────────────────────── */}
      <div style={s.statGrid}>
        <div style={s.statCard}>
          <span style={s.statLabel}>AVG GPU UTILIZATION</span>
          <span style={s.statValue}>84.2%</span>
          <span style={s.statSub}>Across 12x A100 Nodes</span>
        </div>
        <div style={s.statCard}>
          <span style={s.statLabel}>TOTAL HOURS BOOKED</span>
          <span style={s.statValue}>482 hrs</span>
          <span style={s.statSub}>Current month to date</span>
        </div>
        <div style={s.statCard}>
          <span style={s.statLabel}>SCHEDULE CONFLICTS</span>
          <span style={s.statValue}>0</span>
          <span style={s.statSub}>100% database lock accuracy</span>
        </div>
        <div style={s.statCard}>
          <span style={s.statLabel}>AVG QUEUE LATENCY</span>
          <span style={s.statValue}>&lt; 320ms</span>
          <span style={s.statSub}>Resolution speed (NFR-PERF-02)</span>
        </div>
      </div>

      {/* ── Visual Analytics Breakdown ───────────────────────────────────────── */}
      <div style={s.chartGrid}>
        {/* Utilization by Asset Category */}
        <div style={s.chartCard}>
          <p style={s.sectionLabel}>FLEET UTILIZATION BY CATEGORY</p>

          <div style={{ display: "flex", flexDirection: "column", gap: 16, padding: "16px 20px" }}>
            <div>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, marginBottom: 6 }}>
                <strong>GPU Compute Clusters (A100 SXM4)</strong>
                <span style={{ fontWeight: 600 }}>88% utilized</span>
              </div>
              <div style={s.progressBarBg}>
                <div style={{ ...s.progressBarFill, width: "88%", background: "#161616" }} />
              </div>
            </div>

            <div>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, marginBottom: 6 }}>
                <strong>Cryo-EM & Microscopy Suites</strong>
                <span style={{ fontWeight: 600 }}>74% utilized</span>
              </div>
              <div style={s.progressBarBg}>
                <div style={{ ...s.progressBarFill, width: "74%", background: "#161616" }} />
              </div>
            </div>

            <div>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, marginBottom: 6 }}>
                <strong>Mass Spectrometers & Analytical Benches</strong>
                <span style={{ fontWeight: 600 }}>52% utilized</span>
              </div>
              <div style={s.progressBarBg}>
                <div style={{ ...s.progressBarFill, width: "52%", background: "#161616" }} />
              </div>
            </div>

            <div>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, marginBottom: 6 }}>
                <strong>Cleanroom Photolithography Bay</strong>
                <span style={{ fontWeight: 600 }}>61% utilized</span>
              </div>
              <div style={s.progressBarBg}>
                <div style={{ ...s.progressBarFill, width: "61%", background: "#161616" }} />
              </div>
            </div>
          </div>
        </div>

        {/* Project Quota Consumption */}
        <div style={s.chartCard}>
          <p style={s.sectionLabel}>HOURS BOOKED BY RESEARCH PROJECT</p>

          <table style={s.table}>
            <thead>
              <tr>
                <th style={s.th}>Project Workspace</th>
                <th style={s.th}>Hours</th>
                <th style={s.th}>Quota Share</th>
              </tr>
            </thead>
            <tbody>
              <tr style={s.tr}>
                <td style={s.td}>
                  <strong>Project Alpha Core</strong>
                  <span style={{ display: "block", fontSize: 11, color: "#9e9e9e" }}>Dinuka K. (Lead)</span>
                </td>
                <td style={s.td}>214 hrs</td>
                <td style={s.td}>44.4%</td>
              </tr>
              <tr style={s.tr}>
                <td style={s.td}>
                  <strong>Nexus Protocol</strong>
                  <span style={{ display: "block", fontSize: 11, color: "#9e9e9e" }}>Amara P. (Researcher)</span>
                </td>
                <td style={s.td}>168 hrs</td>
                <td style={s.td}>34.8%</td>
              </tr>
              <tr style={s.tr}>
                <td style={s.td}>
                  <strong>Beta Synthesis</strong>
                  <span style={{ display: "block", fontSize: 11, color: "#9e9e9e" }}>Marcus N. (Archival)</span>
                </td>
                <td style={s.td}>100 hrs</td>
                <td style={s.td}>20.8%</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

const s: Record<string, React.CSSProperties> = {
  headerRow: { display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: 24 },
  pageTitle: { fontSize: 28, fontWeight: 700, color: "#161616", letterSpacing: "-0.5px", marginBottom: 4 },
  pageSub: { fontSize: 13, color: "#9e9e9e" },
  btnSecondary: { background: "#ffffff", color: "#424242", border: "1px solid #d0d0d0", borderRadius: 4, padding: "8px 14px", fontSize: 13, fontWeight: 500, cursor: "pointer" },
  statGrid: { display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16, marginBottom: 32 },
  statCard: { background: "#ffffff", border: "1px solid #e0e0e0", borderRadius: 6, padding: "18px 20px 20px", display: "flex", flexDirection: "column", gap: 6 },
  statLabel: { fontSize: 11, fontWeight: 600, color: "#9e9e9e", letterSpacing: "0.5px", textTransform: "uppercase" as const },
  statValue: { fontSize: 32, fontWeight: 700, color: "#161616", letterSpacing: "-1px", lineHeight: 1.1 },
  statSub: { fontSize: 12, color: "#9e9e9e" },
  chartGrid: { display: "grid", gridTemplateColumns: "1.2fr 1fr", gap: 20 },
  chartCard: { background: "#ffffff", border: "1px solid #e0e0e0", borderRadius: 6, overflow: "hidden" },
  sectionLabel: { fontSize: 11, fontWeight: 600, color: "#9e9e9e", letterSpacing: "0.6px", textTransform: "uppercase" as const, padding: "14px 20px", borderBottom: "1px solid #eeeeee", background: "#fafafa", margin: 0 },
  progressBarBg: { height: 6, background: "#f0f0f0", borderRadius: 3, overflow: "hidden" },
  progressBarFill: { height: "100%", borderRadius: 3 },
  table: { width: "100%", borderCollapse: "collapse" as const, fontSize: 13 },
  th: { textAlign: "left" as const, padding: "10px 16px", fontSize: 12, fontWeight: 500, color: "#9e9e9e", borderBottom: "1px solid #eeeeee", background: "#fafafa" },
  tr: { borderBottom: "1px solid #f0f0f0" },
  td: { padding: "12px 16px", color: "#161616", fontSize: 13 },
};
