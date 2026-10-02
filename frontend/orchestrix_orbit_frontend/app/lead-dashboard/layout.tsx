"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { Sidebar } from "@/components/layout/Sidebar";
import { getRole, getEmail, logout } from "@/lib/auth";

export default function LeadDashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [mounted, setMounted] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
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
    return <div style={{ minHeight: "100vh", background: "#f9fafb" }} suppressHydrationWarning />;
  }

  const isAdmin = !!(getRole() || "").toUpperCase().match(/ADMIN|OWNER/);

  return (
    <div style={s.root} suppressHydrationWarning>
      {/* ── Fixed Sidebar ────────────────────────────────────────────────── */}
      <Sidebar />

      {/* ── Main Area ────────────────────────────────────────────────────── */}
      <div style={s.main}>
        {/* Topbar matching Researcher Dashboard */}
        <header style={s.topbar}>
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
                    onClick={() => {
                      logout();
                      router.push("/");
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
    justifyContent: "flex-end",
    padding: "0 32px",
    flexShrink: 0,
    zIndex: 10,
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
};
