"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { logout } from "@/lib/auth";

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

  function handleLogout() {
    logout();
    router.push("/");
  }

  return (
    <div style={s.root}>
      {/* ── Sidebar ──────────────────────────────────────────────────────────── */}
      <aside style={s.sidebar}>
        {/* Brand */}
        <div style={s.brand}>
          <span style={s.brandName}>Orchestrix</span>
          <span style={s.brandSub}>Resource Manager</span>
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
                style={active ? s.navItemActive : s.navItem}
              >
                <span style={active ? s.navIconActive : s.navIcon}>
                  {item.icon}
                </span>
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>

        {/* Footer / Privacy & Role Badge */}
        <div style={s.footer}>
          <div style={s.roleBox}>
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <span style={s.roleDot}>●</span>
              <span style={s.roleLabel}>RESOURCE ADMIN</span>
            </div>
            <span style={s.roleSub}>FR-AUTH-06 Data Isolation</span>
          </div>
          <button
            id="btn-rm-logout"
            type="button"
            onClick={handleLogout}
            style={s.logoutBtn}
          >
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.4">
              <path d="M5 1H2.5A1.5 1.5 0 0 0 1 2.5v9A1.5 1.5 0 0 0 2.5 13H5" strokeLinecap="round" />
              <path d="M9.5 10L12.5 7L9.5 4" strokeLinecap="round" strokeLinejoin="round" />
              <path d="M12.5 7H4.5" strokeLinecap="round" />
            </svg>
            Sign Out
          </button>
        </div>
      </aside>

      {/* ── Main Layout ──────────────────────────────────────────────────────── */}
      <div style={s.mainWrapper}>
        {/* Topbar */}
        <header style={s.topbar}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={s.topbarTenant}>FACILITIES & COMPUTE OPERATIONS</span>
            <span style={s.topbarDivider}>/</span>
            <span style={s.topbarStatus}>All Systems Monitored</span>
          </div>

          <div style={s.topbarRight}>
            <div style={s.topbarAvatar}>CK</div>
            <span style={{ fontSize: 13, fontWeight: 500, color: "#161616" }}>
              Operations
            </span>
            <button
              id="btn-topbar-rm-logout"
              type="button"
              onClick={handleLogout}
              style={s.topbarLogoutBtn}
            >
              Sign Out
            </button>
          </div>
        </header>

        {/* Page Content */}
        <main style={s.content}>{children}</main>
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
  sidebar: {
    width: 210,
    minWidth: 210,
    background: "#161616",
    display: "flex",
    flexDirection: "column",
    padding: "20px 0",
    position: "fixed" as const,
    top: 0,
    left: 0,
    bottom: 0,
    zIndex: 20,
    userSelect: "none",
  },
  brand: {
    display: "flex",
    flexDirection: "column",
    gap: 2,
    padding: "0 18px 20px",
    borderBottom: "1px solid #2a2a2a",
    marginBottom: 10,
  },
  brandName: {
    fontSize: 14,
    fontWeight: 600,
    color: "#ffffff",
    letterSpacing: "-0.2px",
  },
  brandSub: {
    fontSize: 11,
    color: "#888888",
    fontWeight: 400,
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
    borderRadius: 6,
    fontSize: 13,
    color: "#888888",
    fontWeight: 400,
    transition: "background 0.1s, color 0.1s",
    cursor: "pointer",
    textDecoration: "none",
  },
  navItemActive: {
    display: "flex",
    alignItems: "center",
    gap: 10,
    padding: "9px 12px",
    borderRadius: 6,
    fontSize: 13,
    color: "#ffffff",
    fontWeight: 500,
    background: "#2d2d2d",
    cursor: "pointer",
    textDecoration: "none",
  },
  navIcon: {
    color: "#888888",
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
  footer: {
    padding: "16px 12px 0",
    borderTop: "1px solid #2a2a2a",
  },
  roleBox: {
    display: "flex",
    flexDirection: "column",
    gap: 2,
    padding: "8px 10px",
    background: "#1c1c1c",
    borderRadius: 4,
    border: "1px solid #262626",
  },
  roleDot: {
    color: "#38bdf8",
    fontSize: 8,
  },
  roleLabel: {
    fontSize: 9,
    fontWeight: 700,
    color: "#38bdf8",
    letterSpacing: "0.6px",
  },
  roleSub: {
    fontSize: 10,
    color: "#666666",
    fontFamily: "monospace",
  },
  mainWrapper: {
    marginLeft: 210,
    flex: 1,
    display: "flex",
    flexDirection: "column",
    minHeight: "100vh",
  },
  topbar: {
    height: 48,
    background: "#ffffff",
    borderBottom: "1px solid #e0e0e0",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "0 32px",
    position: "sticky" as const,
    top: 0,
    zIndex: 10,
  },
  topbarTenant: {
    fontSize: 11,
    fontWeight: 700,
    color: "#161616",
    letterSpacing: "0.5px",
  },
  topbarDivider: {
    color: "#d0d0d0",
    fontSize: 12,
  },
  topbarStatus: {
    fontSize: 12,
    color: "#2e7d32",
    fontWeight: 500,
  },
  topbarRight: {
    display: "flex",
    alignItems: "center",
    gap: 10,
  },
  topbarAvatar: {
    width: 26,
    height: 26,
    borderRadius: "50%",
    background: "#161616",
    color: "#ffffff",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: 11,
    fontWeight: 600,
  },
  content: {
    flex: 1,
    padding: "32px 32px 48px",
    maxWidth: 1400,
    width: "100%",
    boxSizing: "border-box",
  },
  logoutBtn: {
    display: "flex",
    alignItems: "center",
    gap: 8,
    padding: "8px 10px",
    borderRadius: 6,
    fontSize: 12,
    fontWeight: 500,
    color: "#f87171",
    background: "none",
    border: "none",
    cursor: "pointer",
    width: "100%",
    textAlign: "left" as const,
    marginTop: 8,
  },
  topbarLogoutBtn: {
    padding: "5px 10px",
    borderRadius: 5,
    fontSize: 12,
    fontWeight: 600,
    color: "#c62828",
    background: "#fff0f0",
    border: "1px solid #f5c6cb",
    cursor: "pointer",
    marginLeft: 6,
  },
};
