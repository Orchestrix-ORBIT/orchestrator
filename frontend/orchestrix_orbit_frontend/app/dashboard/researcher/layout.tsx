"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { logout } from "@/lib/auth";

/* ── Researcher nav items ────────────────────────────────────────────────── */
const NAV = [
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

const BASE = "/dashboard/researcher";

export default function ResearcherLayout({ children }: { children: React.ReactNode }) {
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
        <div style={s.brand}>
          <span style={s.brandName}>Orchestrix</span>
          <span style={s.brandSub}>Research Workspace</span>
        </div>

        <nav style={s.nav}>
          {NAV.map((item) => {
            const active = pathname === item.href;
            return (
              <Link
                key={item.href}
                id={`nav-${item.label.toLowerCase().replace(/\s/g, "-")}`}
                href={item.href}
                style={active ? s.navItemActive : s.navItem}
                className={!active ? "nav-item-hover" : ""}
              >
                <span style={active ? s.navIconActive : s.navIcon}>
                  {item.icon}
                </span>
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>

        {/* ── Sidebar bottom ────────────────────────────────────────────── */}
        <div style={s.sidebarBottom}>
          <div style={s.sidebarDivider} />
          <button id="btn-encrypted-session" style={s.encryptedSession}>
            <span style={{ fontSize: 13 }}>🔒</span>
            Encrypted Session
          </button>
          <Link
            id="nav-settings"
            href={`${BASE}/settings`}
            style={s.settingsLink}
          >
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.4">
              <circle cx="7" cy="7" r="2" />
              <path d="M7 1v1.5M7 11.5V13M1 7h1.5M11.5 7H13M2.93 2.93l1.06 1.06M10.01 10.01l1.06 1.06M2.93 11.07l1.06-1.06M10.01 3.99l1.06-1.06" strokeLinecap="round" />
            </svg>
            Settings
          </Link>
          <button
            id="btn-logout-sidebar"
            type="button"
            onClick={handleLogout}
            style={s.logoutBtn}
            className="nav-item-hover"
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

      {/* ── Main area ────────────────────────────────────────────────────────── */}
      <div style={s.main}>
        {/* Top bar */}
        <header style={s.topbar}>
          <div style={s.topbarLeft}>
            {/* Context-aware search bar */}
            {(pathname === `${BASE}/projects` ||
              pathname === `${BASE}/resources` ||
              pathname === `${BASE}/documents` ||
              pathname === `${BASE}/ai-summaries`) && (
              <div style={s.searchWrap}>
                <svg width="13" height="13" viewBox="0 0 13 13" fill="none" stroke="#9e9e9e" strokeWidth="1.4" strokeLinecap="round" style={{ flexShrink: 0 }}>
                  <circle cx="5.5" cy="5.5" r="4" />
                  <line x1="9" y1="9" x2="12" y2="12" />
                </svg>
                <input
                  id="input-search-topbar"
                  type="text"
                  placeholder={
                    pathname === `${BASE}/resources`
                      ? "Search across workspace..."
                      : pathname === `${BASE}/documents`
                      ? "Search documents..."
                      : pathname === `${BASE}/ai-summaries`
                      ? "Search summaries..."
                      : "Search projects..."
                  }
                  style={s.searchInput}
                />
              </div>
            )}
          </div>
          <div style={s.topbarRight}>

            {/* Lock icon */}
            <button id="btn-lock" style={s.iconBtn} title="Encryption">
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
                <rect x="3" y="7" width="10" height="8" rx="1.5" />
                <path d="M5 7V5a3 3 0 0 1 6 0v2" strokeLinecap="round" />
              </svg>
            </button>
            {/* Sign out button */}
            <button
              id="btn-logout-topbar"
              type="button"
              onClick={handleLogout}
              style={s.topbarLogoutBtn}
              className="btn-secondary-hover"
              title="Sign Out"
            >
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M5 1H2.5A1.5 1.5 0 0 0 1 2.5v9A1.5 1.5 0 0 0 2.5 13H5" strokeLinecap="round" />
                <path d="M9.5 10L12.5 7L9.5 4" strokeLinecap="round" strokeLinejoin="round" />
                <path d="M12.5 7H4.5" strokeLinecap="round" />
              </svg>
              <span>Sign Out</span>
            </button>
          </div>
        </header>

        {/* Page content — no padding on chat page so split layout bleeds */}
        <div style={pathname === `${BASE}/chat` ? s.contentChat : s.content}>
          {children}
        </div>
      </div>
    </div>
  );
}

/* ── Styles ─────────────────────────────────────────────────────────────── */
const s: Record<string, React.CSSProperties> = {
  root: {
    display: "flex",
    minHeight: "100vh",
    fontFamily: "var(--font)",
    background: "#f2f2f2",
  },

  /* Sidebar */
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
    zIndex: 10,
    borderRadius: 12,
    border: "1px solid rgba(0,0,0,0.06)",
    boxShadow: "0 4px 16px rgba(0,0,0,0.08), 0 1px 4px rgba(0,0,0,0.05)",
  },
  brand: {
    display: "flex",
    flexDirection: "column",
    gap: 2,
    padding: "0 16px 20px",
    borderBottom: "1px solid #f3f4f6",
    marginBottom: 8,
  },
  brandName: {
    fontSize: 15,
    fontWeight: 600,
    color: "#111827",
    letterSpacing: "-0.1px",
  },
  brandSub: {
    fontSize: 11,
    color: "#6b7280",
    fontWeight: 500,
  },
  nav: {
    display: "flex",
    flexDirection: "column",
    gap: 1,
    padding: "0 8px",
    flex: 1,
  },
  navItem: {
    display: "flex",
    alignItems: "center",
    gap: 10,
    padding: "9px 10px",
    borderRadius: 12,
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
    padding: "9px 10px",
    borderRadius: 12,
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

  /* Main */
  main: {
    marginLeft: 244,
    flex: 1,
    display: "flex",
    flexDirection: "column",
    minHeight: "100vh",
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
    padding: "0 24px",
    position: "sticky" as const,
    top: 0,
    zIndex: 5,
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
    gap: 8,
  },
  uploadDocBtn: {
    display: "flex",
    alignItems: "center",
    padding: "7px 14px",
    fontSize: 13,
    fontWeight: 600,
    color: "#ffffff",
    background: "#161616",
    border: "none",
    borderRadius: 6,
    cursor: "pointer",
    whiteSpace: "nowrap" as const,
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
  contentChat: {
    flex: 1,
    padding: 0,
    display: "flex",
    overflow: "hidden" as const,
  },

  /* Sidebar bottom */
  sidebarBottom: {
    padding: "0 8px 8px",
    display: "flex",
    flexDirection: "column" as const,
    gap: 2,
  },
  sidebarDivider: {
    height: 1,
    background: "#e5e7eb",
    marginBottom: 8,
  },
  encryptedSession: {
    display: "flex",
    alignItems: "center",
    gap: 8,
    padding: "9px 10px",
    borderRadius: 12,
    fontSize: 12,
    fontWeight: 500,
    color: "#d97706",
    background: "#fffbeb",
    border: "none",
    cursor: "default",
    width: "100%",
    textAlign: "left" as const,
  },
  settingsLink: {
    display: "flex",
    alignItems: "center",
    gap: 10,
    padding: "9px 10px",
    borderRadius: 12,
    fontSize: 13,
    color: "#4b5563",
    fontWeight: 500,
    cursor: "pointer",
    textDecoration: "none",
  },
  logoutBtn: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    padding: "8px 12px",
    borderRadius: 12,
    fontSize: 12,
    color: "#374151",
    fontWeight: 500,
    background: "transparent",
    border: "1px solid #f3f4f6",
    cursor: "pointer",
    width: "100%",
    marginTop: 8,
    transition: "background 0.15s",
  },
  topbarLogoutBtn: {
    display: "flex",
    alignItems: "center",
    gap: 6,
    padding: "6px 12px",
    borderRadius: 6,
    fontSize: 12,
    fontWeight: 600,
    color: "#c62828",
    background: "#fff0f0",
    border: "1px solid #f5c6cb",
    cursor: "pointer",
  },
};
