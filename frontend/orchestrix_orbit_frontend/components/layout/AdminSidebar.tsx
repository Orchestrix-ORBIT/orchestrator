"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { logout } from "@/lib/auth";

const ADMIN_NAV = [
  {
    href: "/admin-dashboard",
    label: "Admin Overview",
    icon: (
      <svg width="15" height="15" viewBox="0 0 15 15" fill="currentColor">
        <rect x="0" y="0" width="6" height="6" rx="1" />
        <rect x="9" y="0" width="6" height="6" rx="1" />
        <rect x="0" y="9" width="6" height="6" rx="1" />
        <rect x="9" y="9" width="6" height="6" rx="1" />
      </svg>
    ),
  },
  {
    href: "/lead-dashboard",
    label: "Research Lead View",
    icon: (
      <svg width="15" height="15" viewBox="0 0 15 15" fill="none" stroke="currentColor" strokeWidth="1.4">
        <path d="M1 4.5C1 3.67 1.67 3 2.5 3H6l1.5 1.5H12.5C13.33 4.5 14 5.17 14 6v6c0 .83-.67 1.5-1.5 1.5h-10C1.67 13.5 1 12.83 1 12V4.5z" />
      </svg>
    ),
  },
];

export function AdminSidebar({ isCollapsed = false, onToggle }: { isCollapsed?: boolean; onToggle?: () => void }) {
  const pathname = usePathname();
  const router = useRouter();
  const [showSignOutConfirm, setShowSignOutConfirm] = useState(false);

  function handleLogout() {
    setShowSignOutConfirm(true);
  }

  const confirmLogout = () => {
    logout();
    router.push("/");
  };

  return (
    <>
    <aside style={{ ...s.sidebar, width: isCollapsed ? 80 : 220, minWidth: isCollapsed ? 80 : 220, transition: "width 0.2s cubic-bezier(0.4, 0, 0.2, 1)" }}>
      {/* Brand Header */}
      <div style={{ ...s.brand, padding: isCollapsed ? "0 0 20px" : "0 18px 20px", alignItems: isCollapsed ? "center" : "flex-start" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: isCollapsed ? "center" : "space-between", width: "100%" }}>
          {!isCollapsed && (
            <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
              <span style={s.brandName}>Orchestrix</span>
              <span style={s.brandSub}>System Administrator</span>
            </div>
          )}
          {isCollapsed && <span style={{ ...s.brandName, fontSize: 18 }}>O</span>}
          
          {/* Toggle Button */}
          {onToggle && (
            <button
              onClick={onToggle}
              style={{
                background: "transparent",
                border: "none",
                cursor: "pointer",
                color: "#9ca3af",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                padding: 4,
                borderRadius: 4,
                marginTop: isCollapsed ? 12 : 0
              }}
              className="nav-item-dark-hover"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ transform: isCollapsed ? "rotate(180deg)" : "rotate(0deg)", transition: "transform 0.2s" }}>
                <polyline points="15 18 9 12 15 6"></polyline>
              </svg>
            </button>
          )}
        </div>
      </div>

      {/* Navigation */}
      <nav style={s.nav}>
        {ADMIN_NAV.map((item) => {
          const active =
            item.href === "/admin-dashboard"
              ? pathname === "/admin-dashboard"
              : pathname.startsWith(item.href);

          return (
            <Link
              key={item.href}
              href={item.href}
              className={!active ? "nav-item-dark-hover" : ""}
              title={isCollapsed ? item.label : undefined}
              style={{
                ...s.navItem,
                ...(active ? s.navItemActive : {}),
                justifyContent: isCollapsed ? "center" : "flex-start",
                padding: isCollapsed ? "12px" : "9px 12px"
              }}
            >
              <span style={{ ...s.icon, ...(active ? s.iconActive : {}) }}>
                {item.icon}
              </span>
              {!isCollapsed && <span>{item.label}</span>}
            </Link>
          );
        })}
      </nav>

      {/* User / Logout Footer */}
      <div style={s.footer}>
        <button 
          onClick={handleLogout} 
          className="nav-item-dark-hover" 
          title={isCollapsed ? "Sign Out" : undefined}
          style={{
            ...s.logoutBtn,
            justifyContent: isCollapsed ? "center" : "flex-start",
            padding: isCollapsed ? "12px" : "9px 12px"
          }}
        >
          <svg width="15" height="15" viewBox="0 0 15 15" fill="none" stroke="currentColor" strokeWidth="1.4">
            <path d="M6 2H3a1 1 0 0 0-1 1v9a1 1 0 0 0 1 1h3M10 4.5L13 7.5 10 10.5M13 7.5H5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          {!isCollapsed && <span>Sign out</span>}
        </button>
      </div>
    </aside>

      {/* ── Sign Out Confirmation Modal ──────────────────────────────────────── */}
      {showSignOutConfirm && (
        <div
          style={{
            position: "fixed", inset: 0,
            background: "rgba(15, 23, 42, 0.5)",
            display: "flex", alignItems: "center", justifyContent: "center",
            zIndex: 1000, backdropFilter: "blur(4px)",
          }}
          onClick={() => setShowSignOutConfirm(false)}
        >
          <div
            style={{
              background: "#ffffff", borderRadius: 16, padding: 32,
              width: "100%", maxWidth: 400, textAlign: "center",
              boxShadow: "0 20px 25px -5px rgba(0,0,0,0.15), 0 8px 10px -6px rgba(0,0,0,0.1)",
              border: "1px solid #e2e8f0", position: "relative",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Close button */}
            <button
              onClick={() => setShowSignOutConfirm(false)}
              style={{ position: "absolute", top: 14, right: 16, background: "none", border: "none", color: "#94a3b8", cursor: "pointer", fontSize: 20, lineHeight: 1, transition: "color 0.2s" }}
              onMouseOver={(e) => (e.currentTarget.style.color = "#475569")}
              onMouseOut={(e) => (e.currentTarget.style.color = "#94a3b8")}
            >×</button>

            {/* Icon */}
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
              <button
                onClick={() => setShowSignOutConfirm(false)}
                style={{ flex: 1, padding: "10px 16px", borderRadius: 8, border: "1px solid #e2e8f0", background: "#f8fafc", color: "#475569", fontSize: 14, fontWeight: 600, cursor: "pointer", transition: "all 0.2s" }}
                onMouseOver={(e) => { e.currentTarget.style.background = "#f1f5f9"; e.currentTarget.style.borderColor = "#cbd5e1"; }}
                onMouseOut={(e) => { e.currentTarget.style.background = "#f8fafc"; e.currentTarget.style.borderColor = "#e2e8f0"; }}
              >
                Cancel
              </button>
              <button
                onClick={confirmLogout}
                style={{ flex: 1, padding: "10px 16px", borderRadius: 8, border: "none", background: "#0f172a", color: "#ffffff", fontSize: 14, fontWeight: 600, cursor: "pointer", transition: "background 0.2s" }}
                onMouseOver={(e) => (e.currentTarget.style.background = "#1e293b")}
                onMouseOut={(e) => (e.currentTarget.style.background = "#0f172a")}
              >
                Yes, Sign Out
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

const s: Record<string, React.CSSProperties> = {
  sidebar: {
    width: 220,
    minWidth: 220,
    background: "#0f172a",
    display: "flex",
    flexDirection: "column",
    padding: "20px 0",
    position: "fixed",
    top: 12,
    left: 12,
    bottom: 12,
    height: "calc(100vh - 24px)",
    zIndex: 20,
    userSelect: "none",
    borderRight: "1px solid rgba(255,255,255,0.05)",
    boxShadow: "1px 0 10px rgba(0,0,0,0.1)",
    borderRadius: 16,
  },
  brand: {
    display: "flex",
    flexDirection: "column",
    gap: 2,
    padding: "0 18px 20px",
    borderBottom: "1px solid rgba(255,255,255,0.05)",
    marginBottom: 10,
  },
  brandName: {
    fontSize: 15,
    fontWeight: 600,
    color: "#ffffff",
    letterSpacing: "-0.2px",
  },
  brandSub: {
    fontSize: 11,
    color: "#94a3b8",
    fontWeight: 500,
  },
  nav: {
    padding: "0 8px",
    display: "flex",
    flexDirection: "column",
    gap: 2,
    flex: 1,
  },
  navItem: {
    position: "relative",
    display: "flex",
    alignItems: "center",
    gap: 12,
    padding: "9px 12px",
    borderRadius: 8,
    fontSize: 13,
    color: "#94a3b8",
    fontWeight: 500,
    transition: "background 0.1s, color 0.1s",
    cursor: "pointer",
    textDecoration: "none",
  },
  navItemActive: {
    position: "relative",
    display: "flex",
    alignItems: "center",
    gap: 12,
    padding: "9px 12px",
    borderRadius: 8,
    fontSize: 13,
    color: "#ffffff",
    fontWeight: 600,
    background: "rgba(255, 255, 255, 0.1)",
  },
  icon: {
    color: "#64748b",
    display: "flex",
    alignItems: "center",
    flexShrink: 0,
  },
  iconActive: {
    color: "#ffffff",
  },
  footer: {
    padding: "12px 8px 0",
    marginTop: "auto",
    borderTop: "1px solid rgba(255,255,255,0.05)",
    display: "flex",
    flexDirection: "column",
    gap: 6,
  },
  logoutBtn: {
    width: "100%",
    display: "flex",
    alignItems: "center",
    justifyContent: "flex-start",
    gap: 8,
    padding: "9px 12px",
    background: "transparent",
    border: "none",
    borderRadius: 8,
    color: "#94a3b8",
    fontSize: 13,
    fontWeight: 500,
    cursor: "pointer",
    transition: "background 0.1s ease, color 0.1s ease",
  },
};
