"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";

interface ResourceNotification {
  id: string;
  title: string;
  category: "Booking Request" | "Collision Lock" | "Maintenance" | "Quota Alert";
  time: string;
  read: boolean;
  details: string;
  linkText?: string;
  linkHref?: string;
}

const INITIAL_NOTIFS: ResourceNotification[] = [
  {
    id: "RN-1",
    title: "Urgent Booking Request: Researcher requested Illumina NovaSeq 6000 Sequencer",
    category: "Booking Request",
    time: "5m ago",
    read: false,
    details: "Genomic Sequence Alignment project submitted booking request for Tomorrow (09:00 - 15:00). Requires manager approval.",
    linkText: "Review Bookings →",
    linkHref: "/resource-dashboard/bookings",
  },
  {
    id: "RN-2",
    title: "Concurrency Lock Enforced: Overlapping H100 GPU attempt rejected",
    category: "Collision Lock",
    time: "45m ago",
    read: false,
    details: "PostgreSQL row lock rejected overlapping request for NVIDIA H100 GPU in 280ms. Zero conflict.",
    linkText: "View Schedule →",
    linkHref: "/resource-dashboard/bookings",
  },
  {
    id: "RN-3",
    title: "Scheduled Maintenance Active: Thermo Scientific Orbitrap Mass Spectrometer",
    category: "Maintenance",
    time: "2h ago",
    read: false,
    details: "Downtime window active. Automated lockout applied to all booking APIs.",
    linkText: "View Maintenance Logs →",
    linkHref: "/resource-dashboard/maintenance",
  },
  {
    id: "RN-4",
    title: "Quota Threshold Reached: Active Project reached 80% weekly GPU cap",
    category: "Quota Alert",
    time: "1d ago",
    read: true,
    details: "Research Project has utilized 38/48 allocated hours for NVIDIA H100 SXM5 GPU compute nodes this week.",
    linkText: "Inspect Policies →",
    linkHref: "/resource-dashboard/policies",
  },
];

import { api } from "@/lib/api";

export default function ResourceNotificationsPage() {
  const [notifs, setNotifs] = useState<ResourceNotification[]>(INITIAL_NOTIFS);
  const [filter, setFilter] = useState<"ALL" | "UNREAD" | ResourceNotification["category"]>("ALL");
  const [loading, setLoading] = useState(true);

  const loadNotifications = async () => {
    setLoading(true);
    try {
      const data = await api.get<any[]>("/api/notifications");
      if (data && data.length > 0) {
        const mapped: ResourceNotification[] = data.map((n) => ({
          id: n.id,
          title: n.title || "Operations Alert",
          category: (n.type as any) || "Booking Request",
          time: n.createdAt ? new Date(n.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : "Just now",
          read: n.read ?? n.is_read ?? false,
          details: n.message || "Operational system event recorded.",
          linkText: n.type === "Maintenance" ? "View Maintenance Logs →" : "Review Bookings →",
          linkHref: n.type === "Maintenance" ? "/resource-dashboard/maintenance" : "/resource-dashboard/bookings",
        }));
        setNotifs(mapped);
      }
    } catch (err) {
      console.error("Failed to fetch notifications from DB:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadNotifications();
  }, []);

  const unreadCount = notifs.filter((n) => !n.read).length;

  const handleMarkAllRead = async () => {
    setNotifs((prev) => prev.map((n) => ({ ...n, read: true })));
    try {
      await api.patch("/api/notifications/read-all", {});
    } catch (err) {
      console.error("Failed to mark all read in DB:", err);
    }
  };

  const handleToggleRead = async (id: string) => {
    setNotifs((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: !n.read } : n))
    );
    try {
      await api.patch(`/api/notifications/${id}/read`, {});
    } catch (err) {
      console.error("Failed to toggle read state in DB:", err);
    }
  };

  const filteredNotifs = notifs.filter((n) => {
    if (filter === "ALL") return true;
    if (filter === "UNREAD") return !n.read;
    return n.category === filter;
  });

  if (loading) return <p style={{ padding: 40, color: "#888", fontSize: 14 }}>Loading operational notifications…</p>;

  return (
    <div>
      {/* ── Page Header ────────────────────────────────────────────────────── */}
      <div style={s.headerRow}>
        <div>
          <h1 style={s.pageTitle}>Operations Alerts & Notices</h1>
          <p style={s.pageSub}>
            Real-time alerts for booking approvals, race-condition rejections, and maintenance triggers.
          </p>
        </div>

        {unreadCount > 0 && (
          <button onClick={handleMarkAllRead} style={s.btnSecondary}>
            ✓ Mark all as read
          </button>
        )}
      </div>

      {/* ── Metric Stat Cards ────────────────────────────────────────────────── */}
      <div style={s.statGrid}>
        <div style={s.statCard}>
          <span style={s.statLabel}>UNREAD NOTICES</span>
          <span style={s.statValue}>{unreadCount}</span>
          <span style={s.statSub}>Requires attention</span>
        </div>
        <div style={s.statCard}>
          <span style={s.statLabel}>PENDING REQUESTS</span>
          <span style={s.statValue}>
            {notifs.filter((n) => n.category === "Booking Request").length}
          </span>
          <span style={s.statSub}>Awaiting manager review</span>
        </div>
        <div style={s.statCard}>
          <span style={s.statLabel}>LOCK COLLISIONS BLOCKED</span>
          <span style={s.statValue}>
            {notifs.filter((n) => n.category === "Collision Lock").length}
          </span>
          <span style={s.statSub}>Auto-rejected conflicts</span>
        </div>
        <div style={s.statCard}>
          <span style={s.statLabel}>DOWNTIME ALERTS</span>
          <span style={s.statValue}>
            {notifs.filter((n) => n.category === "Maintenance").length}
          </span>
          <span style={s.statSub}>Service lockout notices</span>
        </div>
      </div>

      {/* ── Filter Bar ──────────────────────────────────────────────────────── */}
      <div style={s.filterBar}>
        <div style={s.filterGroup}>
          <span style={s.filterLabel}>FILTER:</span>
          {(["ALL", "UNREAD", "Booking Request", "Collision Lock", "Maintenance", "Quota Alert"] as const).map((cat) => (
            <button
              key={cat}
              onClick={() => setFilter(cat)}
              style={filter === cat ? s.filterBtnActive : s.filterBtn}
            >
              {cat === "ALL" ? "All Alerts" : cat === "UNREAD" ? `Unread (${unreadCount})` : cat}
            </button>
          ))}
        </div>
        <span style={s.countLabel}>{filteredNotifs.length} Alerts</span>
      </div>

      {/* ── Notifications List Card ─────────────────────────────────────────── */}
      <div style={s.tableCard}>
        <div style={s.notifList}>
          {filteredNotifs.length === 0 ? (
            <div style={s.emptyState}>
              <p style={{ fontSize: 14, fontWeight: 600, color: "#161616" }}>No notifications</p>
              <p style={{ fontSize: 12, color: "#9e9e9e", marginTop: 4 }}>All operations alerts are cleared.</p>
            </div>
          ) : (
            filteredNotifs.map((item) => (
              <div
                key={item.id}
                style={{
                  ...s.notifItem,
                  background: item.read ? "#ffffff" : "#fdfdfd",
                  borderLeft: item.read ? "3px solid transparent" : "3px solid #161616",
                }}
              >
                <div style={s.notifTop}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <span
                      style={{
                        ...s.categoryBadge,
                        ...(item.category === "Collision Lock"
                          ? s.badgeCollision
                          : item.category === "Maintenance"
                          ? s.badgeMaint
                          : item.category === "Booking Request"
                          ? s.badgeReq
                          : s.badgeQuota),
                      }}
                    >
                      {item.category}
                    </span>
                    <strong style={s.notifTitle}>{item.title}</strong>
                    {!item.read && <span style={s.newDot}>●</span>}
                  </div>
                  <span style={s.notifTime}>{item.time}</span>
                </div>

                <p style={s.notifDesc}>{item.details}</p>

                <div style={s.notifBottom}>
                  <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                    {item.linkHref && item.linkText && (
                      <Link href={item.linkHref} style={s.notifActionLink}>
                        {item.linkText}
                      </Link>
                    )}

                    <button
                      onClick={() => handleToggleRead(item.id)}
                      style={s.btnToggleRead}
                    >
                      {item.read ? "Mark as unread" : "Mark read"}
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

const s: Record<string, React.CSSProperties> = {
  headerRow: { display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: 24 },
  pageTitle: { fontSize: 28, fontWeight: 700, color: "#161616", letterSpacing: "-0.5px", marginBottom: 4 },
  pageSub: { fontSize: 13, color: "#9e9e9e" },
  btnSecondary: { background: "#ffffff", color: "#424242", border: "1px solid #d0d0d0", borderRadius: 4, padding: "8px 14px", fontSize: 13, fontWeight: 500, cursor: "pointer" },
  statGrid: { display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16, marginBottom: 32 },
  statCard: { background: "#ffffff", border: "1px solid #e0e0e0", borderRadius: 6, padding: "18px 20px 20px", display: "flex", flexDirection: "column", gap: 6 },
  statLabel: { fontSize: 11, fontWeight: 600, color: "#9e9e9e", letterSpacing: "0.5px", textTransform: "uppercase" as const },
  statValue: { fontSize: 32, fontWeight: 700, color: "#161616", letterSpacing: "-1px", lineHeight: 1.1 },
  statSub: { fontSize: 12, color: "#9e9e9e" },
  filterBar: {
    background: "#ffffff",
    border: "1px solid #e0e0e0",
    borderRadius: 6,
    padding: "12px 18px",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 20,
  },
  filterGroup: { display: "flex", alignItems: "center", gap: 8 },
  filterLabel: { fontSize: 11, fontWeight: 600, color: "#9e9e9e", letterSpacing: "0.5px", marginRight: 4 },
  filterBtn: { background: "transparent", border: "1px solid #d0d0d0", borderRadius: 4, padding: "5px 12px", fontSize: 12, fontWeight: 500, color: "#616161", cursor: "pointer" },
  filterBtnActive: { background: "#161616", border: "1px solid #161616", borderRadius: 4, padding: "5px 12px", fontSize: 12, fontWeight: 600, color: "#ffffff", cursor: "pointer" },
  countLabel: { fontSize: 12, color: "#9e9e9e", fontWeight: 500 },
  tableCard: { background: "#ffffff", border: "1px solid #e0e0e0", borderRadius: 6, overflow: "hidden" },
  notifList: { display: "flex", flexDirection: "column" },
  notifItem: { padding: "16px 20px", borderBottom: "1px solid #f0f0f0", display: "flex", flexDirection: "column", gap: 6 },
  notifTop: { display: "flex", justifyContent: "space-between", alignItems: "center" },
  notifTitle: { fontSize: 13, color: "#161616", fontWeight: 600 },
  newDot: { color: "#161616", fontSize: 8 },
  notifTime: { fontSize: 11, color: "#9e9e9e" },
  notifDesc: { fontSize: 12, color: "#616161", lineHeight: 1.4 },
  notifBottom: { display: "flex", justifyContent: "flex-end", alignItems: "center", paddingTop: 8, borderTop: "1px solid #f9f9f9" },
  notifActionLink: { fontSize: 12, fontWeight: 600, color: "#161616", textDecoration: "none" },
  btnToggleRead: { background: "none", border: "none", color: "#9e9e9e", fontSize: 11, cursor: "pointer", whiteSpace: "nowrap" as const },
  categoryBadge: { fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 3, textTransform: "uppercase" as const, whiteSpace: "nowrap" as const, display: "inline-block", flexShrink: 0 },
  badgeReq: { background: "#161616", color: "#ffffff" },
  badgeCollision: { background: "#fee2e2", color: "#dc2626", border: "1px solid #fca5a5" },
  badgeMaint: { background: "#fff8e1", color: "#f57f17", border: "1px solid #ffe082" },
  badgeQuota: { background: "#eff6ff", color: "#1d4ed8", border: "1px solid #bfdbfe" },
  emptyState: { padding: "48px 24px", textAlign: "center" as const },
};
