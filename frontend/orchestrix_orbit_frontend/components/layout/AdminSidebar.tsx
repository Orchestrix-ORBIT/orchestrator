"use client";

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

export function AdminSidebar() {
  const pathname = usePathname();
  const router = useRouter();

  function handleLogout() {
    logout();
    router.push("/");
  }

  return (
    <aside style={s.sidebar}>
      {/* Brand Header */}
      <div style={s.brand}>
        <span style={s.brandName}>Orchestrix</span>
        <span style={s.brandSub}>System Administrator</span>
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
              style={{
                ...s.navItem,
                ...(active ? s.navItemActive : {}),
              }}
            >
              <span style={{ ...s.icon, ...(active ? s.iconActive : {}) }}>
                {item.icon}
              </span>
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>

      {/* User / Logout Footer */}
      <div style={s.footer}>
        <button onClick={handleLogout} style={s.logoutBtn}>
          <svg width="15" height="15" viewBox="0 0 15 15" fill="none" stroke="currentColor" strokeWidth="1.4">
            <path d="M6 2H3a1 1 0 0 0-1 1v9a1 1 0 0 0 1 1h3M10 4.5L13 7.5 10 10.5M13 7.5H5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          <span>Sign out</span>
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
    position: "fixed",
    top: 16,
    left: 16,
    bottom: 16,
    height: "calc(100vh - 32px)",
    borderRadius: 12,
    border: "1px solid #e5e7eb",
    boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.05)",
  },
  brand: {
    padding: "20px 20px 16px",
    display: "flex",
    flexDirection: "column",
    gap: 2,
    borderBottom: "1px solid #f3f4f6",
  },
  brandName: {
    fontSize: 15,
    fontWeight: 600,
    color: "#111827",
    letterSpacing: "-0.1px",
  },
  brandSub: {
    fontSize: 11,
    fontWeight: 600,
    color: "#6b7280",
    textTransform: "uppercase",
    letterSpacing: "0.5px",
  },
  nav: {
    padding: "16px 12px",
    display: "flex",
    flexDirection: "column",
    gap: 4,
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
    background: "#eef2ff",
    color: "#4f46e5",
    fontWeight: 600,
  },
  icon: {
    color: "#6b7280",
    display: "flex",
    alignItems: "center",
    flexShrink: 0,
  },
  iconActive: {
    color: "#4f46e5",
  },
  footer: {
    padding: "16px 12px",
    borderTop: "1px solid #f3f4f6",
  },
  logoutBtn: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    width: "100%",
    padding: "8px 12px",
    borderRadius: 8,
    border: "1px solid #e5e7eb",
    background: "transparent",
    color: "#374151",
    fontSize: 12,
    fontWeight: 500,
    cursor: "pointer",
    transition: "background 0.15s",
  },
};
