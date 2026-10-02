"use client";

import { useState, useEffect } from "react";
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

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const [orgName, setOrgName] = useState<string>("");
  const [role, setRole] = useState<string>("");
  const [unreadCount, setUnreadCount] = useState<number>(0);

  // read role once on mount
  useEffect(() => { setRole(getRole() ?? ""); }, []);

  useEffect(() => {
    NotificationsService.getAll()
      .then((list) => {
        const unread = list.filter((n) => !n.read).length;
        setUnreadCount(unread);
      })
      .catch(() => {});
  }, [pathname]);

  const handleLogout = () => {
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
    <aside style={s.sidebar}>
      {/* Brand Header */}
      <div style={s.brand}>
        <span style={s.brandName}>Orchestrix</span>
        <span style={s.brandSub}>🏢 {orgName || "MYORG"} (LEAD)</span>
      </div>

      {/* Navigation */}
      <nav style={s.nav}>
        {NAV.map((item) => {
          const active =
            item.href === "/lead-dashboard"
              ? pathname === "/lead-dashboard"
              : pathname.startsWith(item.href);

          return (
            <Link
              key={item.href}
              id={`nav-lead-${item.label.toLowerCase().replace(/\s/g, "-")}`}
              href={item.href}
              style={active ? s.navItemActive : s.navItem}
              className={!active ? "nav-item-hover" : ""}
            >
              <span style={active ? s.navIconActive : s.navIcon}>
                {item.icon}
              </span>
              <span style={{ flex: 1 }}>{item.label}</span>
              {item.label === "Notifications" && unreadCount > 0 && (
                <span style={{ background: "#ef4444", color: "#fff", fontSize: 10, fontWeight: 700, padding: "2px 6px", borderRadius: 10 }}>
                  {unreadCount}
                </span>
              )}
            </Link>
          );
        })}
      </nav>

      {/* Footer: Sign Out */}
      <div style={{ padding: "12px 8px 0", marginTop: "auto", borderTop: "1px solid #f3f4f6", display: "flex", flexDirection: "column", gap: 6 }}>
        <button
          onClick={handleLogout}
          className="nav-item-hover"
          style={{
            width: "100%",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 8,
            padding: "8px 12px",
            background: "transparent",
            border: "1px solid #d1d5db",
            borderRadius: 6,
            color: "#6b7280",
            fontSize: 12,
            cursor: "pointer",
            transition: "background 0.15s ease, color 0.15s ease",
          }}
        >
          Sign Out
        </button>
      </div>
    </aside>
  );
}

const s: Record<string, React.CSSProperties> = {
  sidebar: {
    width: 220,
    minWidth: 220,
    background: "#ffffff",
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
    borderRadius: 12,
    border: "1px solid rgba(0,0,0,0.06)",
    boxShadow: "0 4px 16px rgba(0,0,0,0.08), 0 1px 4px rgba(0,0,0,0.05)",
  },
  brand: {
    display: "flex",
    flexDirection: "column",
    gap: 2,
    padding: "0 18px 20px",
    borderBottom: "1px solid #f3f4f6",
    marginBottom: 10,
  },
  brandName: {
    fontSize: 15,
    fontWeight: 600,
    color: "#111827",
    letterSpacing: "-0.2px",
  },
  brandSub: {
    fontSize: 11,
    color: "#6b7280",
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
    display: "flex",
    alignItems: "center",
    gap: 10,
    padding: "9px 12px",
    borderRadius: 8,
    fontSize: 13,
    color: "#4b5563",
    fontWeight: 500,
    transition: "background 0.1s, color 0.1s",
    cursor: "pointer",
    textDecoration: "none",
  },
  navItemActive: {
    display: "flex",
    alignItems: "center",
    gap: 10,
    padding: "9px 12px",
    borderRadius: 8,
    fontSize: 13,
    color: "#4f46e5",
    fontWeight: 600,
    background: "#eef2ff",
    cursor: "pointer",
    textDecoration: "none",
  },
  navIcon: {
    color: "#6b7280",
    display: "flex",
    alignItems: "center",
    flexShrink: 0,
  },
  navIconActive: {
    color: "#4f46e5",
    display: "flex",
    alignItems: "center",
    flexShrink: 0,
  },
};
