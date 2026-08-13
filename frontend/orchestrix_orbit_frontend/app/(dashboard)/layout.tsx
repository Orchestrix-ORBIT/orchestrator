"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useTenant } from "@/context/TenantContext";

const S = {
  layout: {
    display: "flex",
    minHeight: "100vh",
    width: "100%",
  },
  sidebar: (isOpen: boolean) => ({
    width: "220px",
    background: "var(--navy-900)",
    color: "var(--white)",
    position: "fixed" as const,
    top: 0,
    left: 0,
    bottom: 0,
    display: "flex",
    flexDirection: "column" as const,
    zIndex: 40,
    transition: "transform 0.3s ease",
    transform: isOpen ? "translateX(0)" : "translateX(-100%)",
  }),
  logoContainer: {
    padding: "24px",
    borderBottom: "1px solid rgba(255,255,255,0.1)",
    display: "flex",
    alignItems: "center",
    gap: "12px",
    fontWeight: 600,
    fontSize: "18px",
    letterSpacing: "-0.02em",
  },
  nav: {
    padding: "24px 0",
    display: "flex",
    flexDirection: "column" as const,
    flex: 1,
  },
  navItem: (isActive: boolean) => ({
    display: "flex",
    alignItems: "center",
    gap: "12px",
    padding: "12px 24px",
    color: isActive ? "var(--white)" : "rgba(255,255,255,0.55)",
    borderLeft: isActive ? "4px solid var(--navy-700)" : "4px solid transparent",
    background: isActive ? "rgba(255,255,255,0.05)" : "transparent",
    transition: "all 0.2s ease",
    fontWeight: isActive ? 500 : 400,
    textDecoration: "none",
    cursor: "pointer",
  }),
  logoutContainer: {
    padding: "24px",
    borderTop: "1px solid rgba(255,255,255,0.1)",
  },
  logoutBtn: {
    background: "transparent",
    border: "none",
    color: "rgba(255,255,255,0.55)",
    display: "flex",
    alignItems: "center",
    gap: "8px",
    cursor: "pointer",
    fontSize: "14px",
    padding: 0,
  },
  main: {
    flex: 1,
    marginLeft: "220px",
    display: "flex",
    flexDirection: "column" as const,
    minHeight: "100vh",
    transition: "margin-left 0.3s ease",
  },
  topbar: {
    height: "64px",
    background: "var(--white)",
    borderBottom: "1px solid var(--border)",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "0 32px",
    position: "sticky" as const,
    top: 0,
    zIndex: 30,
  },
  pageTitle: {
    fontSize: "18px",
    fontWeight: 600,
    color: "var(--navy-900)",
    textTransform: "capitalize" as const,
  },
  tenantBadge: {
    background: "var(--navy-100)",
    color: "var(--navy-900)",
    padding: "4px 12px",
    borderRadius: "20px",
    fontSize: "13px",
    fontWeight: 500,
    display: "flex",
    alignItems: "center",
    gap: "6px",
  },
  content: {
    padding: "32px",
    background: "var(--off-white)",
    flex: 1,
  },
  menuToggle: {
    display: "none",
    background: "transparent",
    border: "none",
    fontSize: "24px",
    cursor: "pointer",
    padding: "0 16px 0 0",
  }
};

const NAV_LINKS = [
  { href: "/projects", label: "Projects", icon: "📁" },
  { href: "/tasks", label: "Tasks", icon: "✅" },
  { href: "/resources", label: "Resources", icon: "🗓️" },
  { href: "/team", label: "Team", icon: "👥" },
  { href: "/documents", label: "Documents", icon: "📄" },
];

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { tenantSlug } = useTenant();
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const handleResize = () => {
      const mobile = window.innerWidth < 768;
      setIsMobile(mobile);
      if (mobile) setIsSidebarOpen(false);
      else setIsSidebarOpen(true);
    };
    
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const handleLogout = () => {
    localStorage.removeItem("authToken");
    localStorage.removeItem("tenantSlug");
    router.push("/");
  };

  const getPageTitle = () => {
    const path = pathname.split('/')[1];
    return path || "Dashboard";
  };

  // Close sidebar on mobile when navigating
  useEffect(() => {
    if (isMobile) setIsSidebarOpen(false);
  }, [pathname, isMobile]);

  return (
    <div style={S.layout}>
      {/* Sidebar */}
      <div style={{...S.sidebar(isSidebarOpen), ...(isMobile ? { transform: isSidebarOpen ? 'translateX(0)' : 'translateX(-100%)' } : { transform: 'translateX(0)' })}}>
        <div style={S.logoContainer}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10"></circle>
            <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"></path>
            <path d="M2 12h20"></path>
          </svg>
          ORBIT
        </div>
        
        <div style={S.nav}>
          {NAV_LINKS.map(link => {
            const isActive = pathname.startsWith(link.href);
            return (
              <Link key={link.href} href={link.href} style={S.navItem(isActive)}>
                <span style={{ fontSize: "18px" }}>{link.icon}</span>
                {link.label}
              </Link>
            );
          })}
        </div>

        <div style={S.logoutContainer}>
          <button onClick={handleLogout} style={S.logoutBtn}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
              <polyline points="16 17 21 12 16 7"></polyline>
              <line x1="21" y1="12" x2="9" y2="12"></line>
            </svg>
            Logout
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div style={{...S.main, ...(isMobile ? { marginLeft: 0 } : {})}}>
        <header style={S.topbar}>
          <div style={{ display: "flex", alignItems: "center" }}>
            {isMobile && (
              <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} style={{...S.menuToggle, display: "block"}}>
                ☰
              </button>
            )}
            <h1 style={S.pageTitle}>{getPageTitle()}</h1>
          </div>
          
          {tenantSlug && (
            <div style={S.tenantBadge}>
              <div style={{ width: 6, height: 6, borderRadius: "50%", background: "var(--navy-900)" }} />
              {tenantSlug}
            </div>
          )}
        </header>

        <main style={S.content}>
          {children}
        </main>
      </div>

      {/* Mobile overlay */}
      {isMobile && isSidebarOpen && (
        <div 
          style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 30 }}
          onClick={() => setIsSidebarOpen(false)}
        />
      )}
    </div>
  );
}
