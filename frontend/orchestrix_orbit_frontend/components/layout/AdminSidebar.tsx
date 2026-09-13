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
    borderRight: "1px solid #e8e8e8",
    display: "flex",
    flexDirection: "column",
    minHeight: "100vh",
    position: "sticky",
    top: 0,
    height: "100vh",
  },
  brand: {
    padding: "20px 20px 16px",
    display: "flex",
    flexDirection: "column",
    gap: 2,
    borderBottom: "1px solid #f0f0f0",
  },
  brandName: {
    fontSize: 16,
    fontWeight: 700,
    color: "#161616",
    letterSpacing: "-0.3px",
  },
  brandSub: {
    fontSize: 11,
    fontWeight: 600,
    color: "#4f46e5",
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
    padding: "8px 12px",
    borderRadius: 6,
    fontSize: 13,
    fontWeight: 500,
    color: "#616161",
    textDecoration: "none",
    transition: "all 0.15s ease",
  },
  navItemActive: {
    background: "#f5f5f5",
    color: "#161616",
    fontWeight: 600,
  },
  icon: {
    display: "flex",
    alignItems: "center",
    color: "#9e9e9e",
  },
  iconActive: {
    color: "#161616",
  },
  footer: {
    padding: "16px 12px",
    borderTop: "1px solid #f0f0f0",
  },
  logoutBtn: {
    display: "flex",
    alignItems: "center",
    gap: 10,
    width: "100%",
    padding: "8px 12px",
    borderRadius: 6,
    border: "none",
    background: "transparent",
    color: "#e53935",
    fontSize: 13,
    fontWeight: 500,
    cursor: "pointer",
  },
};
