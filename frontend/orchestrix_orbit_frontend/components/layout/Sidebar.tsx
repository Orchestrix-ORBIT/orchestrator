"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

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

  return (
    <aside style={s.sidebar}>
      {/* Brand Header */}
      <div style={s.brand}>
        <span style={s.brandName}>Orchestrix</span>
        <span style={s.brandSub}>Research Lead</span>
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
            >
              <span style={active ? s.navIconActive : s.navIcon}>
                {item.icon}
              </span>
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>

      {/* Footer / Encryption Badge */}
      <div style={s.footer}>
        <div style={s.encryptBox}>
          <span style={s.encryptLabel}>ENCRYPTED SESSION</span>
          <span style={s.encryptSub}>AES-256 GCM</span>
        </div>
      </div>
    </aside>
  );
}

const s: Record<string, React.CSSProperties> = {
  sidebar: {
    width: 200,
    minWidth: 200,
    background: "#161616",
    display: "flex",
    flexDirection: "column",
    padding: "20px 0",
    position: "fixed" as const,
    top: 0,
    left: 0,
    bottom: 0,
    zIndex: 20,
    fontFamily: "var(--font)",
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
  encryptBox: {
    display: "flex",
    flexDirection: "column",
    gap: 2,
    padding: "8px 10px",
    background: "#1c1c1c",
    borderRadius: 4,
    border: "1px solid #262626",
  },
  encryptLabel: {
    fontSize: 9,
    fontWeight: 700,
    color: "#4ade80",
    letterSpacing: "0.6px",
  },
  encryptSub: {
    fontSize: 10,
    color: "#666666",
    fontFamily: "monospace",
  },
};
