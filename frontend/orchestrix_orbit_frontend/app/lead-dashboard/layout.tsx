"use client";

import { useState, useEffect } from "react";
import { Sidebar } from "@/components/layout/Sidebar";

export default function LeadDashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return <div style={{ minHeight: "100vh", background: "#f5f5f5" }} suppressHydrationWarning />;
  }

  return (
    <div style={s.root} suppressHydrationWarning>
      {/* ── Fixed Sidebar ────────────────────────────────────────────────── */}
      <Sidebar />

      {/* ── Main Area ────────────────────────────────────────────────────── */}
      <div style={s.main}>
        {/* Topbar matching Researcher Dashboard */}
        <header style={s.topbar}>
          <div style={s.topbarRight}>
            <button id="btn-lock" style={s.iconBtn} title="End-to-end encrypted">
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
                <rect x="3" y="7" width="10" height="8" rx="1.5" />
                <path d="M5 7V5a3 3 0 0 1 6 0v2" strokeLinecap="round" />
              </svg>
            </button>
            <button id="btn-user" style={s.iconBtn} title="Research Lead (DK)">
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
                <circle cx="8" cy="5" r="3" />
                <path d="M2 14c0-3.31 2.69-6 6-6s6 2.69 6 6" strokeLinecap="round" />
              </svg>
            </button>
          </div>
        </header>

        {/* Page Content */}
        <div style={s.content}>
          {children}
        </div>
      </div>
    </div>
  );
}

const s: Record<string, React.CSSProperties> = {
  root: {
    display: "flex",
    minHeight: "100vh",
    background: "#f5f5f5",
    fontFamily: "var(--font)",
  },
  main: {
    marginLeft: 200,
    flex: 1,
    display: "flex",
    flexDirection: "column",
    minHeight: "100vh",
    background: "#f5f5f5",
  },
  topbar: {
    height: 48,
    background: "#f5f5f5",
    borderBottom: "1px solid #e0e0e0",
    display: "flex",
    alignItems: "center",
    justifyContent: "flex-end",
    padding: "0 32px",
    position: "sticky" as const,
    top: 0,
    zIndex: 10,
  },
  topbarRight: {
    display: "flex",
    alignItems: "center",
    gap: 6,
  },
  iconBtn: {
    background: "none",
    border: "none",
    cursor: "pointer",
    padding: 6,
    color: "#9e9e9e",
    display: "flex",
    alignItems: "center",
    borderRadius: 4,
    transition: "color 0.15s",
  },
  content: {
    flex: 1,
    padding: "32px 32px 48px",
  },
};
