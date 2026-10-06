"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { getTenantSlug, getToken, getRole, logout } from "@/lib/auth";
import { NotificationsService } from "@/lib/services/notifications";

const NAV = [
  {
    href: "/lead-dashboard",
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
    href: "/lead-dashboard/projects",
    label: "Projects",
    icon: (
      <svg width="15" height="15" viewBox="0 0 15 15" fill="none" stroke="currentColor" strokeWidth="1.4">
        <path d="M1 4.5C1 3.67 1.67 3 2.5 3H6l1.5 1.5H12.5C13.33 4.5 14 5.17 14 6v6c0 .83-.67 1.5-1.5 1.5h-10C1.67 13.5 1 12.83 1 12V4.5z" />
      </svg>
    ),
  },
  {
    href: "/lead-dashboard/team",
    label: "Team & Roster",
    icon: (
      <svg width="15" height="15" viewBox="0 0 15 15" fill="none" stroke="currentColor" strokeWidth="1.4">
        <circle cx="5" cy="4" r="2.5" />
        <path d="M1 12.5c0-2.2 1.8-4 4-4s4 1.8 4 4" strokeLinecap="round" />
        <path d="M10 2.5a2.5 2.5 0 0 1 0 5M11 9c1.8.3 3 1.8 3 3.5" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    href: "/lead-dashboard/resources",
    label: "Resources",
    icon: (
      <svg width="15" height="15" viewBox="0 0 15 15" fill="none" stroke="currentColor" strokeWidth="1.4">
        <rect x="1" y="2" width="13" height="9" rx="1.5" />
        <path d="M5 13h5M7.5 11v2" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    href: "/lead-dashboard/chat",
    label: "Chat",
    icon: (
      <svg width="15" height="15" viewBox="0 0 15 15" fill="none" stroke="currentColor" strokeWidth="1.4">
        <path d="M1 2.5C1 1.67 1.67 1 2.5 1h10c.83 0 1.5.67 1.5 1.5v8c0 .83-.67 1.5-1.5 1.5H5L1 14V2.5z" strokeLinejoin="round" />
      </svg>
    ),
  },
  {
    href: "/lead-dashboard/documents",
    label: "Documents",
    icon: (
      <svg width="15" height="15" viewBox="0 0 15 15" fill="none" stroke="currentColor" strokeWidth="1.4">
        <path d="M3 1h6l3 3v10H3V1z" strokeLinejoin="round" />
        <path d="M9 1v3h3" strokeLinejoin="round" />
        <path d="M5 7h5M5 9.5h3" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    href: "/lead-dashboard/ai-insights",
    label: "AI Summaries",
    icon: (
      <svg width="15" height="15" viewBox="0 0 15 15" fill="currentColor">
        <path d="M7.5 1l1 3h3l-2.5 1.8 1 3L7.5 7 5 8.8l1-3L3.5 4h3z" />
        <path d="M12 9.5l.5 1.5h1.5l-1.2.9.5 1.5-1.3-.9-1.3.9.5-1.5-1.2-.9H11z" />
        <path d="M3 9l.4 1.2H4.6l-1 .7.4 1.2-1-.7-1 .7.4-1.2-1-.7H2.6z" />
      </svg>
    ),
  },
  {
    href: "/lead-dashboard/notifications",
    label: "Notifications",
    icon: (
      <svg width="15" height="15" viewBox="0 0 15 15" fill="none" stroke="currentColor" strokeWidth="1.4">
        <path d="M7.5 1.5a5 5 0 0 1 5 5v3l1 1.5H1.5L2.5 9.5v-3a5 5 0 0 1 5-5z" strokeLinejoin="round" />
        <path d="M6 12.5a1.5 1.5 0 0 0 3 0" strokeLinecap="round" />
      </svg>
    ),
  },
];

const NAV_RESEARCHER = [
  {
    href: "/dashboard/researcher",
    label: "Home",
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
    href: "/dashboard/researcher/projects",
    label: "My Projects",
    icon: (
      <svg width="15" height="15" viewBox="0 0 15 15" fill="none" stroke="currentColor" strokeWidth="1.4">
        <path d="M1 4.5C1 3.67 1.67 3 2.5 3H6l1.5 1.5H12.5C13.33 4.5 14 5.17 14 6v6c0 .83-.67 1.5-1.5 1.5h-10C1.67 13.5 1 12.83 1 12V4.5z" />
      </svg>
    ),
  },
  {
    href: "/dashboard/researcher/tasks",
    label: "My Tasks",
    icon: (
      <svg width="15" height="15" viewBox="0 0 15 15" fill="none" stroke="currentColor" strokeWidth="1.4">
        <rect x="1" y="1" width="13" height="13" rx="2" />
        <path d="M4 7.5l2.5 2.5L11 5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
  },
  {
    href: "/dashboard/researcher/resources",
    label: "Resources",
    icon: (
      <svg width="15" height="15" viewBox="0 0 15 15" fill="none" stroke="currentColor" strokeWidth="1.4">
        <rect x="1" y="2" width="13" height="9" rx="1.5" />
        <path d="M5 13h5M7.5 11v2" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    href: "/dashboard/researcher/chat",
    label: "Chat",
    icon: (
      <svg width="15" height="15" viewBox="0 0 15 15" fill="none" stroke="currentColor" strokeWidth="1.4">
        <path d="M1 2.5C1 1.67 1.67 1 2.5 1h10c.83 0 1.5.67 1.5 1.5v8c0 .83-.67 1.5-1.5 1.5H5L1 14V2.5z" strokeLinejoin="round" />
      </svg>
    ),
  },
  {
    href: "/dashboard/researcher/documents",
    label: "Documents",
    icon: (
      <svg width="15" height="15" viewBox="0 0 15 15" fill="none" stroke="currentColor" strokeWidth="1.4">
        <path d="M3 1h6l3 3v10H3V1z" strokeLinejoin="round" />
        <path d="M9 1v3h3" strokeLinejoin="round" />
        <path d="M5 7h5M5 9.5h3" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    href: "/dashboard/researcher/ai-summaries",
    label: "AI Summaries",
    icon: (
      <svg width="15" height="15" viewBox="0 0 15 15" fill="currentColor">
        <path d="M7.5 1l1 3h3l-2.5 1.8 1 3L7.5 7 5 8.8l1-3L3.5 4h3z" />
        <path d="M12 9.5l.5 1.5h1.5l-1.2.9.5 1.5-1.3-.9-1.3.9.5-1.5-1.2-.9H11z" />
        <path d="M3 9l.4 1.2H4.6l-1 .7.4 1.2-1-.7-1 .7.4-1.2-1-.7H2.6z" />
      </svg>
    ),
  },
  {
    href: "/dashboard/researcher/notifications",
    label: "Notifications",
    icon: (
      <svg width="15" height="15" viewBox="0 0 15 15" fill="none" stroke="currentColor" strokeWidth="1.4">
        <path d="M7.5 1.5a5 5 0 0 1 5 5v3l1 1.5H1.5L2.5 9.5v-3a5 5 0 0 1 5-5z" strokeLinejoin="round" />
        <path d="M6 12.5a1.5 1.5 0 0 0 3 0" strokeLinecap="round" />
      </svg>
    ),
  },
];

export function Sidebar({ isCollapsed = false, onToggle }: { isCollapsed?: boolean; onToggle?: () => void }) {
  const pathname = usePathname();
  const router = useRouter();
  const [orgName, setOrgName] = useState<string>("");
  const [role, setRole] = useState<string>("");
  const [unreadCount, setUnreadCount] = useState<number>(0);
  const [showSignOutConfirm, setShowSignOutConfirm] = useState(false);

  // read role once on mount
  useEffect(() => { setRole(getRole() ?? ""); }, []);

  useEffect(() => {
    const fetchUnread = () => {
      NotificationsService.getAll()
        .then((list) => {
          let unreadList = list.filter((n) => !n.read);
          
          // Managers shouldn't see booking notifications in their total counts
          if (pathname.startsWith("/resource-dashboard")) {
            unreadList = unreadList.filter((n) => {
              const typeStr = String(n.type || "").toUpperCase();
              const titleStr = String(n.title || "").toUpperCase();
              return !typeStr.includes("BOOKING") && !titleStr.includes("BOOKING");
            });
          }
          
          setUnreadCount(unreadList.length);
        })
        .catch(() => {});
    };

    fetchUnread(); // Initial fetch

    // Local event listener (for immediate updates when marked read on the same client)
    window.addEventListener("notifications_updated", fetchUnread);
    
    // Real-time polling to catch updates from the backend
    const intervalId = setInterval(fetchUnread, 5000);

    return () => {
      window.removeEventListener("notifications_updated", fetchUnread);
      clearInterval(intervalId);
    };
  }, [pathname]);

  const handleLogout = () => {
    setShowSignOutConfirm(true);
  };

  const confirmLogout = () => {
    logout();
    router.push("/");
  };

  useEffect(() => {
    const slug = getTenantSlug() || "myorg";
    fetch(`${process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8080"}/api/admin/tenants/${slug}`, {
      headers: { Authorization: `Bearer ${getToken() ?? ""}`, "X-Tenant-ID": slug },
    })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data && data.name) setOrgName(data.name);
        else setOrgName(slug.toUpperCase());
      })
      .catch(() => setOrgName(slug.toUpperCase()));
  }, []);

  return (
    <>
    <aside style={{ ...s.sidebar, width: isCollapsed ? 80 : 220, minWidth: isCollapsed ? 80 : 220, transition: "width 0.2s cubic-bezier(0.4, 0, 0.2, 1)" }}>
      {/* Brand Header */}
      <div style={{ ...s.brand, padding: isCollapsed ? "0 0 20px" : "0 18px 20px", alignItems: isCollapsed ? "center" : "flex-start" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: isCollapsed ? "center" : "space-between", width: "100%" }}>
          {!isCollapsed && (
            <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
              <span style={s.brandName}>Orchestrix</span>
              <span style={s.brandSub}>
                {pathname.startsWith("/dashboard/researcher") ? "Research Workspace" : `🏢 ${orgName || "MYORG"}`}
              </span>
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
        {(pathname.startsWith("/dashboard/researcher") ? NAV_RESEARCHER : NAV).map((item) => {
          const active =
            item.href === "/lead-dashboard" || item.href === "/dashboard/researcher"
              ? pathname === item.href
              : pathname.startsWith(item.href);

          return (
            <Link
              key={item.href}
              id={`nav-lead-${item.label.toLowerCase().replace(/\s/g, "-")}`}
              href={item.href}
              style={{ ...(active ? s.navItemActive : s.navItem), justifyContent: isCollapsed ? "center" : "flex-start", padding: isCollapsed ? "12px" : "9px 12px" }}
              className={!active ? "nav-item-dark-hover" : ""}
              title={isCollapsed ? item.label : undefined}
            >
              <span style={active ? s.navIconActive : s.navIcon}>
                {item.icon}
              </span>
              {!isCollapsed && <span style={{ flex: 1 }}>{item.label}</span>}
              {!isCollapsed && item.label === "Notifications" && unreadCount > 0 && (
                <span style={{ background: "#ef4444", color: "#fff", fontSize: 10, fontWeight: 700, padding: "2px 6px", borderRadius: 10 }}>
                  {unreadCount}
                </span>
              )}
              {isCollapsed && item.label === "Notifications" && unreadCount > 0 && (
                <span style={{ position: "absolute", top: 8, right: 8, width: 8, height: 8, background: "#ef4444", borderRadius: "50%" }} />
              )}
            </Link>
          );
        })}
      </nav>

      {/* Footer: Sign Out */}
      <div style={{ padding: "12px 8px 0", marginTop: "auto", borderTop: "1px solid rgba(255,255,255,0.05)", display: "flex", flexDirection: "column", gap: 6 }}>
        <button
          onClick={handleLogout}
          className="nav-item-dark-hover"
          title={isCollapsed ? "Sign Out" : undefined}
          style={{
            width: "100%",
            display: "flex",
            alignItems: "center",
            justifyContent: isCollapsed ? "center" : "flex-start",
            gap: 8,
            padding: isCollapsed ? "12px" : "9px 12px",
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
          {!isCollapsed && "Sign Out"}
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
              <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#475569" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                <polyline points="16 17 21 12 16 7" />
                <line x1="21" y1="12" x2="9" y2="12" />
              </svg>
            </div>

            <h2 style={{ fontSize: 20, fontWeight: 700, color: "#0f172a", marginBottom: 10 }}>Sign Out</h2>
            <p style={{ fontSize: 14, color: "#64748b", lineHeight: 1.6, margin: "0 0 28px 0" }}>
              Are you sure you want to sign out of <strong>Orchestrix</strong>? Your session will be ended.
            </p>

            <div style={{ display: "flex", gap: 12 }}>
              <button
                onClick={() => setShowSignOutConfirm(false)}
                style={{ flex: 1, padding: "12px", borderRadius: 8, background: "#f1f5f9", color: "#475569", fontSize: 14, fontWeight: 600, border: "none", cursor: "pointer", transition: "background 0.2s" }}
                onMouseOver={(e) => (e.currentTarget.style.background = "#e2e8f0")}
                onMouseOut={(e) => (e.currentTarget.style.background = "#f1f5f9")}
              >
                Cancel
              </button>
              <button
                onClick={confirmLogout}
                style={{ flex: 1, padding: "12px", borderRadius: 8, background: "#0f172a", color: "#ffffff", fontSize: 14, fontWeight: 600, border: "none", cursor: "pointer", transition: "background 0.2s" }}
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
    position: "fixed" as const,
    top: 12,
    left: 12,
    bottom: 12,
    height: "calc(100vh - 24px)",
    zIndex: 20,
    fontFamily: "var(--font)",
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
    background: "rgba(255,255,255,0.1)",
    cursor: "pointer",
    textDecoration: "none",
  },
  navIcon: {
    color: "#94a3b8",
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
};
