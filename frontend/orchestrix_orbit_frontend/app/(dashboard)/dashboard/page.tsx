"use client";

import React, { useState, useEffect } from "react";
import { useTenant } from "@/context/TenantContext";

const S = {
  container: {
    display: "flex",
    flexDirection: "column" as const,
    gap: "32px",
    height: "100%",
  },
  header: {
    display: "flex",
    flexDirection: "column" as const,
    gap: "8px",
  },
  title: {
    fontSize: "28px",
    fontWeight: 700,
    color: "var(--navy-900)",
    margin: 0,
  },
  subtitle: {
    fontSize: "14px",
    color: "var(--text-muted)",
  },
  grid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))",
    gap: "24px",
  },
  card: {
    background: "var(--white)",
    borderRadius: "var(--radius)",
    border: "1px solid var(--border)",
    padding: "24px",
    display: "flex",
    flexDirection: "column" as const,
    gap: "16px",
    boxShadow: "var(--shadow-sm)",
  },
  metricCard: {
    background: "var(--white)",
    borderRadius: "var(--radius)",
    border: "1px solid var(--border)",
    padding: "24px",
    display: "flex",
    flexDirection: "column" as const,
    alignItems: "center",
    justifyContent: "center",
    gap: "8px",
    boxShadow: "var(--shadow-sm)",
    textAlign: "center" as const,
  },
  metricValue: {
    fontSize: "36px",
    fontWeight: 700,
    color: "var(--navy-900)",
    margin: 0,
  },
  metricLabel: {
    fontSize: "13px",
    color: "var(--text-muted)",
    fontWeight: 500,
    textTransform: "uppercase" as const,
    letterSpacing: "0.5px",
  },
  sectionTitle: {
    fontSize: "16px",
    fontWeight: 600,
    color: "var(--navy-900)",
    margin: 0,
    paddingBottom: "12px",
    borderBottom: "1px solid var(--border)",
  },
  list: {
    display: "flex",
    flexDirection: "column" as const,
    gap: "12px",
  },
  listItem: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    fontSize: "14px",
    padding: "8px 0",
    borderBottom: "1px dashed var(--border)",
  },
  badgeOk: {
    background: "#dcfce7",
    color: "#15803d",
    padding: "4px 8px",
    borderRadius: "4px",
    fontSize: "11px",
    fontWeight: 600,
  },
  badgeWarn: {
    background: "#fef08a",
    color: "#a16207",
    padding: "4px 8px",
    borderRadius: "4px",
    fontSize: "11px",
    fontWeight: 600,
  }
};

export default function UnifiedDashboard() {
  const { tenantSlug } = useTenant();
  const [userRole, setUserRole] = useState<string>("Researcher");
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const role = localStorage.getItem("userRole");
    if (role) setUserRole(role);
    setIsLoading(false);
  }, []);

  if (isLoading) return null;

  return (
    <div style={S.container} className="animate-fade-up">
      <header style={S.header}>
        <h2 style={S.title}>Overview</h2>
        <span style={S.subtitle}>
          Welcome to the <strong>{tenantSlug}</strong> workspace. You are viewing the personalized <strong>{userRole}</strong> dashboard.
        </span>
      </header>
      
      {userRole === "Institute Admin" && <AdminView />}
      {userRole === "Team Lead" && <LeadView />}
      {userRole === "Researcher" && <ResearcherView />}
      {userRole === "Resource Manager" && <ResourceView />}
    </div>
  );
}

function AdminView() {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
      <div style={S.grid}>
        <div style={S.metricCard}>
          <span style={S.metricValue}>124</span>
          <span style={S.metricLabel}>Total Users</span>
        </div>
        <div style={S.metricCard}>
          <span style={S.metricValue}>12</span>
          <span style={S.metricLabel}>Active Projects</span>
        </div>
        <div style={S.metricCard}>
          <span style={S.metricValue}>85%</span>
          <span style={S.metricLabel}>Resource Utilization</span>
        </div>
        <div style={S.metricCard}>
          <span style={S.metricValue}>3</span>
          <span style={S.metricLabel}>Pending Requests</span>
        </div>
      </div>

      <div style={S.grid}>
        <div style={S.card}>
          <h3 style={S.sectionTitle}>System Health</h3>
          <div style={S.list}>
            <div style={S.listItem}>
              <span>API Gateway Status</span>
              <span style={S.badgeOk}>Operational</span>
            </div>
            <div style={S.listItem}>
              <span>Database Cluster</span>
              <span style={S.badgeOk}>Operational</span>
            </div>
            <div style={S.listItem}>
              <span>AI Context Engine</span>
              <span style={S.badgeWarn}>High Load</span>
            </div>
          </div>
        </div>
        <div style={S.card}>
          <h3 style={S.sectionTitle}>Recent Activity</h3>
          <div style={S.list}>
            <div style={S.listItem}>
              <span>New user <strong>Dr. Smith</strong> joined.</span>
              <span style={{ color: "var(--text-muted)", fontSize: "12px" }}>2h ago</span>
            </div>
            <div style={S.listItem}>
              <span>Project <strong>Quantum Privacy</strong> created.</span>
              <span style={{ color: "var(--text-muted)", fontSize: "12px" }}>5h ago</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function LeadView() {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
      <div style={S.grid}>
        <div style={S.card}>
          <h3 style={S.sectionTitle}>Project Progress (Quantum Privacy)</h3>
          <div style={{ height: "12px", background: "var(--navy-100)", borderRadius: "6px", overflow: "hidden", marginTop: "12px" }}>
            <div style={{ height: "100%", width: "68%", background: "#0ea5e9" }}></div>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: "12px", marginTop: "8px", color: "var(--text-muted)" }}>
            <span>68% Completed</span>
            <span>Est. Delivery: Oct 2026</span>
          </div>
        </div>
        <div style={S.metricCard}>
          <span style={S.metricValue}>4</span>
          <span style={S.metricLabel}>Blockers Reported</span>
        </div>
        <div style={S.metricCard}>
          <span style={S.metricValue}>18</span>
          <span style={S.metricLabel}>Tasks Completed This Week</span>
        </div>
      </div>

      <div style={S.card}>
        <h3 style={S.sectionTitle}>Team Action Items (Extracted by AI)</h3>
        <div style={S.list}>
          <div style={S.listItem}>
            <span>Review GPU allocation request from Alex</span>
            <button style={{ padding: "4px 8px", fontSize: "11px", background: "var(--navy-900)", color: "white", borderRadius: "4px", border: "none", cursor: "pointer" }}>Review</button>
          </div>
          <div style={S.listItem}>
            <span>Approve finalized research draft</span>
            <button style={{ padding: "4px 8px", fontSize: "11px", background: "var(--navy-900)", color: "white", borderRadius: "4px", border: "none", cursor: "pointer" }}>Review</button>
          </div>
        </div>
      </div>
    </div>
  );
}

function ResearcherView() {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
      <div style={S.grid}>
        <div style={S.card}>
          <h3 style={S.sectionTitle}>My Upcoming Tasks</h3>
          <div style={S.list}>
            <div style={S.listItem}>
              <div style={{ display: "flex", gap: "12px", alignItems: "center" }}>
                <input type="checkbox" />
                <span>Write literature review on Zero-Knowledge</span>
              </div>
              <span style={S.badgeWarn}>Due Tomorrow</span>
            </div>
            <div style={S.listItem}>
              <div style={{ display: "flex", gap: "12px", alignItems: "center" }}>
                <input type="checkbox" />
                <span>Collect metrics from Server Rack A</span>
              </div>
              <span style={{ fontSize: "12px", color: "var(--text-muted)" }}>Due in 3 days</span>
            </div>
          </div>
        </div>
        
        <div style={S.card}>
          <h3 style={S.sectionTitle}>My Resource Bookings</h3>
          <div style={S.list}>
            <div style={S.listItem}>
              <span>Server Rack A (Compute)</span>
              <span style={S.badgeOk}>Active Now</span>
            </div>
            <div style={S.listItem}>
              <span>CRISPR Machine</span>
              <span style={{ fontSize: "12px", color: "var(--text-muted)" }}>Aug 15 - Aug 16</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function ResourceView() {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
      <div style={S.grid}>
        <div style={S.metricCard}>
          <span style={S.metricValue}>12</span>
          <span style={S.metricLabel}>Total Resources Managed</span>
        </div>
        <div style={S.metricCard}>
          <span style={{...S.metricValue, color: "#b91c1c"}}>2</span>
          <span style={S.metricLabel}>Maintenance Alerts</span>
        </div>
      </div>

      <div style={S.grid}>
        <div style={S.card}>
          <h3 style={S.sectionTitle}>Pending Booking Requests</h3>
          <div style={S.list}>
            <div style={S.listItem}>
              <span><strong>Alex</strong> requests GPU Cluster</span>
              <div style={{ display: "flex", gap: "6px" }}>
                <button style={{ padding: "4px 8px", fontSize: "11px", background: "var(--navy-900)", color: "white", borderRadius: "4px", border: "none", cursor: "pointer" }}>Approve</button>
                <button style={{ padding: "4px 8px", fontSize: "11px", background: "#ef4444", color: "white", borderRadius: "4px", border: "none", cursor: "pointer" }}>Deny</button>
              </div>
            </div>
          </div>
        </div>
        
        <div style={S.card}>
          <h3 style={S.sectionTitle}>Equipment Status</h3>
          <div style={S.list}>
            <div style={S.listItem}>
              <span>GPU Cluster</span>
              <span style={S.badgeWarn}>Overheating</span>
            </div>
            <div style={S.listItem}>
              <span>Server Rack B</span>
              <span style={S.badgeOk}>Online</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
