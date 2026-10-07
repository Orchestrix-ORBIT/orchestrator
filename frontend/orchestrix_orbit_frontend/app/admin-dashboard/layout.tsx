"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { AdminSidebar } from "@/components/layout/AdminSidebar";
import { getRole, getEmail, logout, isLoggedIn } from "@/lib/auth";

export default function AdminDashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [mounted, setMounted] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [authorized, setAuthorized] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [showSignOutConfirm, setShowSignOutConfirm] = useState(false);
  const router = useRouter();
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    if (!isLoggedIn()) { router.replace("/"); return; }
    setMounted(true);
    const role = (getRole() || "").toUpperCase();
    const isAdmin = role.includes("ADMIN") || role.includes("OWNER");
    if (!isAdmin) {
      if (role.includes("LEAD")) {
        router.replace("/lead-dashboard");
      } else {
        router.replace("/dashboard/researcher");
      }
    } else {
      setAuthorized(true);
    }
  }, [router]);

  if (!mounted || !authorized) {
    return <div style={{ minHeight: "100vh", background: "#f9fafb" }} suppressHydrationWarning />;
  }

  return (
    <div style={s.root} suppressHydrationWarning>
      {/* ── Fixed Admin Sidebar ────────────────────────────────────────── */}
      <AdminSidebar isCollapsed={isSidebarCollapsed} onToggle={() => setIsSidebarCollapsed(!isSidebarCollapsed)} />

      {/* ── Main Area ──────────────────────────────────────────────────── */}
      <div style={{ ...s.main, marginLeft: isSidebarCollapsed ? 104 : 244 }}>
        {/* Topbar */}
        <header style={s.topbar}>
          <div style={{ flex: 1 }} />
          <div style={s.topbarRight}>
            <div style={s.profileContainer} ref={dropdownRef}>
              <button 
                onClick={() => setMenuOpen(!menuOpen)}
                style={s.avatarBtn}
              >
                {getEmail()?.charAt(0).toUpperCase() || "A"}
              </button>

              {menuOpen && (
                <div style={s.dropdownMenu}>
                  <div style={s.dropdownHeader}>
                    <span style={s.dropdownEmail}>{getEmail() || "admin@example.com"}</span>
                  </div>
                  <button 
                    style={s.dropdownLogout}
                    className="btn-secondary-hover"
                    onClick={() => {
                      setMenuOpen(false);
                      setShowSignOutConfirm(true);
                    }}
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

        {/* Page Content */}
        <div style={s.content}>
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
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#64748b" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                <polyline points="16 17 21 12 16 7" />
                <line x1="21" y1="12" x2="9" y2="12" />
              </svg>
            </div>
            <h3 style={{ fontSize: 18, fontWeight: 700, color: "#0f172a", margin: "0 0 8px 0" }}>Sign Out</h3>
            <p style={{ fontSize: 14, color: "#64748b", margin: "0 0 24px 0", lineHeight: 1.5 }}>
              Are you sure you want to sign out of <strong>Orchestrix</strong>?<br/>
              Your session will be ended.
            </p>
            <div style={{ display: "flex", gap: 12 }}>
              <button onClick={() => setShowSignOutConfirm(false)} style={{ flex: 1, padding: "10px 16px", borderRadius: 8, border: "1px solid #e2e8f0", background: "#f8fafc", color: "#475569", fontSize: 14, fontWeight: 600, cursor: "pointer", transition: "all 0.2s" }} onMouseOver={(e) => { e.currentTarget.style.background = "#f1f5f9"; e.currentTarget.style.borderColor = "#cbd5e1"; }} onMouseOut={(e) => { e.currentTarget.style.background = "#f8fafc"; e.currentTarget.style.borderColor = "#e2e8f0"; }}>Cancel</button>
              <button onClick={() => { logout(); router.push("/"); }} style={{ flex: 1, padding: "10px 16px", borderRadius: 8, border: "none", background: "#0f172a", color: "#ffffff", fontSize: 14, fontWeight: 600, cursor: "pointer", transition: "background 0.2s" }} onMouseOver={(e) => (e.currentTarget.style.background = "#1e293b")} onMouseOut={(e) => (e.currentTarget.style.background = "#0f172a")}>Yes, Sign Out</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const s: Record<string, React.CSSProperties> = {
  root: { display: 'flex', height: '100vh', maxHeight: '100vh', overflow: 'hidden', background: '#f2f2f2', fontFamily: 'var(--font)' },
  main: { marginLeft: 244, transition: 'margin-left 0.2s cubic-bezier(0.4, 0, 0.2, 1)', flex: 1, display: 'flex', flexDirection: 'column', height: '100vh', maxHeight: '100vh', overflow: 'hidden', background: '#f2f2f2', position: 'relative' },
  topbar: { height: 48, background: 'rgba(242,242,242,0.85)', backdropFilter: 'blur(8px)', borderBottom: '1px solid rgba(0,0,0,0.07)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 32px', flexShrink: 0, zIndex: 10 },
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
    padding: "12px 16px",
    display: "flex",
    alignItems: "center",
    gap: 8,
    fontSize: 13,
    fontWeight: 600,
    color: "#ef4444",
    background: "transparent",
    border: "none",
    cursor: "pointer",
    textAlign: "left",
  },
  content: { flex: 1, padding: '20px 28px', display: 'flex', flexDirection: 'column', overflowY: 'auto' },
};