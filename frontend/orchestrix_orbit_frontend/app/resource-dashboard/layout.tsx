"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { logout, getEmail, isLoggedIn } from "@/lib/auth";
import { NotificationsService } from "@/lib/services/notifications";

const NAV = [
  {
    href: "/resource-dashboard",
    label: "Overview",
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
    href: "/resource-dashboard/assets",
    label: "Asset Catalog",
    icon: (
      <svg width="15" height="15" viewBox="0 0 15 15" fill="none" stroke="currentColor" strokeWidth="1.4">
        <rect x="1" y="2" width="13" height="9" rx="1.5" />
        <path d="M5 13h5M7.5 11v2" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    href: "/resource-dashboard/bookings",
    label: "Bookings & Approvals",
    icon: (
      <svg width="15" height="15" viewBox="0 0 15 15" fill="none" stroke="currentColor" strokeWidth="1.4">
        <rect x="1.5" y="2.5" width="12" height="11" rx="1.5" />
        <path d="M1.5 6h12M4.5 1v3M10.5 1v3" strokeLinecap="round" />
        <path d="M5 9.5l1.5 1.5 3.5-3.5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
  },
  {
    href: "/resource-dashboard/maintenance",
    label: "Maintenance",
    icon: (
      <svg width="15" height="15" viewBox="0 0 15 15" fill="none" stroke="currentColor" strokeWidth="1.4">
        <path d="M10.5 1.5l3 3-2 2-3-3 2-2z" strokeLinejoin="round" />
        <path d="M8.5 3.5L2 10v3h3l6.5-6.5" strokeLinejoin="round" />
      </svg>
    ),
  },
  {
    href: "/resource-dashboard/notifications",
    label: "Notifications",
    icon: (
      <svg width="15" height="15" viewBox="0 0 15 15" fill="none" stroke="currentColor" strokeWidth="1.4">
        <path d="M7.5 1.5a5 5 0 0 1 5 5v3l1 1.5H1.5L2.5 9.5v-3a5 5 0 0 1 5-5z" strokeLinejoin="round" />
        <path d="M6 12.5a1.5 1.5 0 0 0 3 0" strokeLinecap="round" />
      </svg>
    ),
  },
];

export default function ResourceDashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [showSignOutConfirm, setShowSignOutConfirm] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    if (!isLoggedIn()) {
      router.replace("/");
    } else {
      setMounted(true);
    }
  }, [router]);

  // Fetch unread count + poll
  useEffect(() => {
    const fetchUnread = () => {
      NotificationsService.getAll()
        .then((list) => {
          const unreadList = list.filter((n) => {
            if (n.read) return false;
            const typeStr = String(n.type || "").toUpperCase();
            const titleStr = String(n.title || "").toUpperCase();
            if (typeStr.includes("BOOKING") || titleStr.includes("BOOKING")) return false;
            return true;
          });
          setUnreadCount(unreadList.length);
        })
        .catch(() => {});
    };
    fetchUnread();
    const id = setInterval(fetchUnread, 5000);
    window.addEventListener("notifications_updated", fetchUnread);
    return () => {
      clearInterval(id);
      window.removeEventListener("notifications_updated", fetchUnread);
    };
  }, [pathname]);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    }
    if (menuOpen) document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [menuOpen]);

  const confirmLogout = () => {
    logout();
    router.push("/");
  };

  if (!mounted) {
    return <div style={{ minHeight: "100vh", background: "#f9fafb" }} suppressHydrationWarning />;
  }

  return (
    <div style={s.root}>
      {/* ── Sidebar ──────────────────────────────────────────────────────────── */}
      <aside style={{ ...s.sidebar, width: isSidebarCollapsed ? 80 : 220, minWidth: isSidebarCollapsed ? 80 : 220, transition: "width 0.2s cubic-bezier(0.4, 0, 0.2, 1)" }}>
        {/* Brand */}
        <div style={{ ...s.brand, padding: isSidebarCollapsed ? "0 0 20px" : "0 18px 20px", alignItems: isSidebarCollapsed ? "center" : "flex-start" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: isSidebarCollapsed ? "center" : "space-between", width: "100%" }}>
            {!isSidebarCollapsed && (
              <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                <span style={s.brandName}>Orchestrix</span>
                <span style={s.brandSub}>Resource Manager</span>
              </div>
            )}
            {isSidebarCollapsed && <span style={{ ...s.brandName, fontSize: 18 }}>O</span>}
            <button
              onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
              style={{ background: "transparent", border: "none", cursor: "pointer", color: "#9ca3af", display: "flex", alignItems: "center", justifyContent: "center", padding: 4, borderRadius: 4, marginTop: isSidebarCollapsed ? 12 : 0 }}
              className="nav-item-dark-hover"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ transform: isSidebarCollapsed ? "rotate(180deg)" : "rotate(0deg)", transition: "transform 0.2s" }}>
                <polyline points="15 18 9 12 15 6"></polyline>
              </svg>
            </button>
          </div>
        </div>

        {/* Navigation */}
        <nav style={s.nav}>
          {NAV.map((item) => {
            const active =
              item.href === "/resource-dashboard"
                ? pathname === "/resource-dashboard"
                : pathname.startsWith(item.href);

            return (
              <Link
                key={item.href}
                id={`nav-rm-${item.label.toLowerCase().replace(/\s/g, "-")}`}
                href={item.href}
                style={{ ...(active ? s.navItemActive : s.navItem), justifyContent: isSidebarCollapsed ? "center" : "flex-start", padding: isSidebarCollapsed ? "12px" : "9px 12px" }}
                className={!active ? "nav-item-dark-hover" : ""}
                title={isSidebarCollapsed ? item.label : undefined}
              >
                <span style={active ? s.navIconActive : s.navIcon}>
                  {item.icon}
                </span>
                {!isSidebarCollapsed && <span style={{ flex: 1 }}>{item.label}</span>}
                {!isSidebarCollapsed && item.label === "Notifications" && unreadCount > 0 && (
                  <span style={{ background: "#ef4444", color: "#fff", fontSize: 10, fontWeight: 700, padding: "2px 6px", borderRadius: 10 }}>
                    {unreadCount}
                  </span>
                )}
                {isSidebarCollapsed && item.label === "Notifications" && unreadCount > 0 && (
                  <span style={{ position: "absolute", top: 8, right: 8, width: 8, height: 8, background: "#ef4444", borderRadius: "50%" }} />
                )}
              </Link>
            );
          })}
        </nav>

        {/* Footer: Sign Out */}
        <div style={{ padding: "12px 8px 0", marginTop: "auto", borderTop: "1px solid #f3f4f6", display: "flex", flexDirection: "column", gap: 6 }}>
          <button
            id="btn-rm-logout"
            type="button"
            onClick={() => setShowSignOutConfirm(true)}
            className="nav-item-dark-hover"
            title={isSidebarCollapsed ? "Sign Out" : undefined}
            style={{
              width: "100%",
              display: "flex",
              alignItems: "center",
              justifyContent: isSidebarCollapsed ? "center" : "flex-start",
              gap: 8,
              padding: isSidebarCollapsed ? "12px" : "9px 12px",
              background: "transparent",
              border: "none",
              borderRadius: 8,
              color: "#94a3b8",
              fontSize: 13,
              fontWeight: 500,
              cursor: "pointer",
              transition: "background 0.1s ease, color 0.1s ease",
            }}
          >
            <svg width="15" height="15" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.4">
              <path d="M5 1H2.5A1.5 1.5 0 0 0 1 2.5v9A1.5 1.5 0 0 0 2.5 13H5" strokeLinecap="round" />
              <path d="M9.5 10L12.5 7L9.5 4" strokeLinecap="round" strokeLinejoin="round" />
              <path d="M12.5 7H4.5" strokeLinecap="round" />
            </svg>
            {!isSidebarCollapsed && "Sign Out"}
          </button>
        </div>
      </aside>

      {/* ── Main Layout ──────────────────────────────────────────────────────── */}
      <div style={{ ...s.mainWrapper, marginLeft: isSidebarCollapsed ? 104 : 244 }}>
        {/* Topbar */}
        <header style={s.topbar}>
          <div style={s.topbarRight}>
            <div style={s.profileContainer} ref={dropdownRef}>
              <button
                onClick={() => setMenuOpen(!menuOpen)}
                style={s.avatarBtn}
              >
                {getEmail()?.charAt(0).toUpperCase() || "R"}
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
          <main style={s.contentInner}>{children}</main>
        </div>
      </div>

      {/* ── Sign Out Confirmation Modal ───────────────────────────────────────── */}
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
              <button onClick={confirmLogout} style={{ flex: 1, padding: "12px", borderRadius: 8, background: "#0f172a", color: "#ffffff", fontSize: 14, fontWeight: 600, border: "none", cursor: "pointer", transition: "background 0.2s" }} onMouseOver={(e) => (e.currentTarget.style.background = "#1e293b")} onMouseOut={(e) => (e.currentTarget.style.background = "#0f172a")}>Yes, Sign Out</button>
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
    display: "flex",
    flexDirection: "column",
    gap: 2,
    padding: "0 8px",
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
    cursor: "pointer",
    textDecoration: "none",
  },
  navIcon: {
    color: "#64748b",
    display: "flex",
    alignItems: "center",
    flexShrink: 0,
  },
  navIconActive: {
    color: "#ffffff",
    display: "flex",
    alignItems: "center",
    flexShrink: 0,
  },
  mainWrapper: {
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
    height: 72,
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
    gap: 12,
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
    background: "#ffffff",
    border: "1px solid #e2e8f0",
    borderRadius: 10,
    boxShadow: "0 8px 16px rgba(0,0,0,0.08)",
    minWidth: 200,
    zIndex: 50,
    overflow: "hidden",
  },
  dropdownHeader: {
    padding: "12px 16px",
    borderBottom: "1px solid #f1f5f9",
  },
  dropdownEmail: {
    fontSize: 12,
    color: "#475569",
    fontWeight: 500,
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
  contentInner: {
    maxWidth: 1400,
    width: "100%",
    margin: "0 auto",
  },
};
