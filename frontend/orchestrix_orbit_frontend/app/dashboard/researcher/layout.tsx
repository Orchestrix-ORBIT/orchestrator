"use client";

import React, { useState, useEffect, useRef } from "react";
import { usePathname, useRouter } from "next/navigation";
import { getEmail, logout } from "@/lib/auth";
import { Sidebar } from "@/components/layout/Sidebar";

const BASE = "/dashboard/researcher";

export default function ResearcherLayout({ children }: { children: React.ReactNode }) {
  const [mounted, setMounted] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [showSignOutConfirm, setShowSignOutConfirm] = useState(false);
  
  const pathname = usePathname();
  const router = useRouter();
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setMenuOpen(false);
      }
    }
    
    if (menuOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [menuOpen]);

  if (!mounted) {
    return <div style={{ minHeight: "100vh", background: "#f2f2f2" }} suppressHydrationWarning />;
  }

  function handleLogout() {
    setMenuOpen(false);
    setShowSignOutConfirm(true);
  }

  return (
    <div style={s.root} suppressHydrationWarning>
      {/* ── Fixed Sidebar ────────────────────────────────────────────────── */}
      <Sidebar isCollapsed={isSidebarCollapsed} onToggle={() => setIsSidebarCollapsed(!isSidebarCollapsed)} />

      {/* ── Main Area ────────────────────────────────────────────────────── */}
      <div style={{ ...s.main, marginLeft: isSidebarCollapsed ? 104 : 244 }}>
        {/* Topbar */}
        <header style={s.topbar}>
          <div style={s.topbarLeft}>
            {/* Context-aware search bar removed */}
          </div>
          <div style={s.topbarRight}>
            <div style={s.profileContainer} ref={dropdownRef}>
              <button 
                onClick={() => setMenuOpen(!menuOpen)}
                style={s.avatarBtn}
              >
                {getEmail()?.charAt(0).toUpperCase() || "U"}
              </button>

              {menuOpen && (
                <div style={s.dropdownMenu}>
                  <div style={s.dropdownHeader}>
                    <span style={s.dropdownEmail}>{getEmail() || "user@example.com"}</span>
                  </div>
                  <button 
                    style={s.dropdownLogout}
                    className="btn-secondary-hover"
                    onClick={handleLogout}
                  >
                    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.4">
                      <path d="M5 1H2.5A1.5 1.5 0 0 0 1 2.5v9A1.5 1.5 0 0 0 2.5 13H5" strokeLinecap="round" />
                      <path d="M9.5 10L12.5 7L9.5 4" strokeLinecap="round" strokeLinejoin="round" />
                      <path d="M12.5 7H4.5" strokeLinecap="round" />
                    </svg>
                    Sign Out
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Page content */}
        <div style={pathname === `${BASE}/chat` ? s.contentChat : s.content}>
          {children}
        </div>
      </div>

      {/* ── Sign Out Confirmation Modal ─────────────────────────────────── */}
      {showSignOutConfirm && (
        <div
          style={{ position: "fixed", inset: 0, background: "rgba(15, 23, 42, 0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, backdropFilter: "blur(4px)" }}
          onClick={() => setShowSignOutConfirm(false)}
        >
          <div
            style={{ background: "#ffffff", borderRadius: 16, padding: 32, width: "100%", maxWidth: 400, textAlign: "center", boxShadow: "0 20px 25px -5px rgba(0,0,0,0.15), 0 8px 10px -6px rgba(0,0,0,0.1)", border: "1px solid #e2e8f0", position: "relative" }}
            onClick={(e) => e.stopPropagation()}
          >
            <button onClick={() => setShowSignOutConfirm(false)} style={{ position: "absolute", top: 14, right: 16, background: "none", border: "none", color: "#94a3b8", cursor: "pointer", fontSize: 20, lineHeight: 1, transition: "color 0.2s" }} onMouseOver={(e) => (e.currentTarget.style.color = "#475569")} onMouseOut={(e) => (e.currentTarget.style.color = "#94a3b8")}>×</button>
            <div style={{ width: 56, height: 56, borderRadius: "50%", background: "#f1f5f9", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 20px auto" }}>
              <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#475569" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                <polyline points="16 17 21 12 16 7" />
                <line x1="21" y1="12" x2="9" y2="12" />
              </svg>
            </div>
            <h2 style={{ fontSize: 20, fontWeight: 700, color: "#0f172a", marginBottom: 10 }}>Sign Out</h2>
            <p style={{ fontSize: 14, color: "#64748b", lineHeight: 1.6, margin: "0 0 28px 0" }}>Are you sure you want to sign out of <strong>Orchestrix</strong>? Your session will be ended.</p>
            <div style={{ display: "flex", gap: 12 }}>
              <button onClick={() => setShowSignOutConfirm(false)} style={{ flex: 1, padding: "12px", borderRadius: 8, background: "#f1f5f9", color: "#475569", fontSize: 14, fontWeight: 600, border: "none", cursor: "pointer", transition: "background 0.2s" }} onMouseOver={(e) => (e.currentTarget.style.background = "#e2e8f0")} onMouseOut={(e) => (e.currentTarget.style.background = "#f1f5f9")}>Cancel</button>
              <button onClick={() => { logout(); router.push("/"); }} style={{ flex: 1, padding: "12px", borderRadius: 8, background: "#0f172a", color: "#ffffff", fontSize: 14, fontWeight: 600, border: "none", cursor: "pointer", transition: "background 0.2s" }} onMouseOver={(e) => (e.currentTarget.style.background = "#1e293b")} onMouseOut={(e) => (e.currentTarget.style.background = "#0f172a")}>Yes, Sign Out</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const s: Record<string, React.CSSProperties> = {
  root: {
    display: "flex",
    height: "100vh",
    maxHeight: "100vh",
    overflow: "hidden",
    background: "#f2f2f2",
    fontFamily: "var(--font)",
  },
  main: {
    marginLeft: 244,
    transition: "margin-left 0.2s cubic-bezier(0.4, 0, 0.2, 1)",
    flex: 1,
    display: "flex",
    flexDirection: "column",
    height: "100vh",
    maxHeight: "100vh",
    overflow: "hidden",
    background: "#f2f2f2",
    position: "relative",
  },
  topbar: {
    height: 48,
    background: "rgba(242,242,242,0.85)",
    backdropFilter: "blur(8px)",
    borderBottom: "1px solid rgba(0,0,0,0.07)",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "0 32px",
    flexShrink: 0,
    zIndex: 10,
  },
  topbarLeft: {
    display: "flex",
    alignItems: "center",
  },
  searchWrap: {
    display: "flex",
    alignItems: "center",
    gap: 8,
    background: "#ffffff",
    border: "1px solid #d8d8d8",
    borderRadius: 6,
    padding: "5px 10px",
    width: 220,
  },
  searchInput: {
    border: "none",
    outline: "none",
    background: "transparent",
    fontSize: 13,
    color: "#111827",
    width: "100%",
  },
  topbarRight: {
    display: "flex",
    alignItems: "center",
  },
  profileContainer: {
    position: "relative",
  },
  avatarBtn: {
    width: 36,
    height: 36,
    borderRadius: "50%",
    background: "#111827",
    color: "#fff",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: 14,
    fontWeight: "700",
    cursor: "pointer",
    border: "2px solid transparent",
    outline: "none",
    transition: "opacity 0.15s",
    boxShadow: "0 2px 6px rgba(0,0,0,0.2)",
  },
  dropdownMenu: {
    position: "absolute",
    top: "calc(100% + 8px)",
    right: 0,
    width: 220,
    background: "#ffffff",
    border: "1px solid rgba(0,0,0,0.08)",
    borderRadius: 12,
    boxShadow: "0 8px 24px rgba(0,0,0,0.12), 0 2px 8px rgba(0,0,0,0.06)",
    display: "flex",
    flexDirection: "column",
    overflow: "hidden",
    zIndex: 20,
  },
  dropdownHeader: {
    padding: "12px 16px",
    borderBottom: "1px solid #f3f4f6",
    background: "#fafafa",
  },
  dropdownEmail: {
    fontSize: 13,
    color: "#374151",
    fontWeight: 500,
    wordBreak: "break-all",
  },
  dropdownLogout: {
    display: "flex",
    width: "100%",
    alignItems: "center",
    gap: 8,
    padding: "12px 16px",
    border: "none",
    background: "transparent",
    color: "#d32f2f",
    fontSize: 13,
    fontWeight: 500,
    cursor: "pointer",
    textAlign: "left",
    transition: "background 0.15s",
  },
  content: {
    flex: 1,
    padding: "20px 28px",
    display: "flex",
    flexDirection: "column",
    overflowY: "auto",
  },
  contentChat: {
    flex: 1,
    padding: 0,
    display: "flex",
    overflow: "hidden" as const,
  },
};
