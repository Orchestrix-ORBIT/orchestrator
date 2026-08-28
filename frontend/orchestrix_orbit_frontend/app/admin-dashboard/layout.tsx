"use client";

import { useState, useEffect } from "react";
import { AdminSidebar } from "@/components/layout/AdminSidebar";

export default function AdminDashboardLayout({
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
      {/* ── Fixed Admin Sidebar ──────────────────────────────────────────── */}
      <AdminSidebar />

      {/* ── Main Area ────────────────────────────────────────────────────── */}
      <div style={s.main}>
        {/* Topbar */}
        <header style={s.topbar}>
          <div style={s.topbarRight}>
            <button id="btn-lock" style={s.iconBtn} title="System Administrator Portal">
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
                <rect x="3" y="7" width="10" height="8" rx="1.5" />
                <path d="M5 7V5a3 3 0 0 1 6 0v2" strokeLinecap="round" />
              </svg>
            </button>
            <button id="btn-user" style={s.iconBtn} title="System Administrator">
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
  },
  main: {
    flex: 1,
    display: "flex",
    flexDirection: "column",
    minWidth: 0,
  },
  topbar: {
    height: 48,
    background: "#ffffff",
    borderBottom: "1px solid #e8e8e8",
    display: "flex",
    alignItems: "center",
    justifyContent: "flex-end",
    padding: "0 24px",
    flexShrink: 0,
  },
  topbarRight: {
    display: "flex",
    alignItems: "center",
    gap: 8,
  },
  iconBtn: {
    width: 32,
    height: 32,
    borderRadius: 6,
    border: "1px solid #e8e8e8",
    background: "#ffffff",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    color: "#616161",
    cursor: "pointer",
  },
  content: {
    flex: 1,
    padding: "28px 36px",
    maxWidth: 1200,
    width: "100%",
  },
};
