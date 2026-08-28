"use client";

import React, { useState } from "react";
import Link from "next/link";

interface NotificationItem {
  id: string;
  title: string;
  category: "Task" | "Booking" | "AI Alert" | "Mention";
  sender: string;
  time: string;
  read: boolean;
  details: string;
  linkText?: string;
  linkHref?: string;
}

const INITIAL_NOTIFICATIONS: NotificationItem[] = [
  {
    id: "NOTIF-1",
    title: "AI Action Item ready for review: 'Recalibrate thermal sensors'",
    category: "AI Alert",
    sender: "AI Context Engine (LangChain)",
    time: "10m ago",
    read: false,
    details: "LangChain NLP extracted an urgent calibration task from Alpha Protocol Sec 4.2 with 96% match confidence.",
    linkText: "Review on Overview →",
    linkHref: "/lead-dashboard",
  },
  {
    id: "NOTIF-2",
    title: "Resource Booking Confirmed: GPU Lab Workstation 3",
    category: "Booking",
    sender: "Resource Manager",
    time: "1h ago",
    read: false,
    details: "Your reservation for Project Alpha Core (14:00 - 17:00) was locked with zero-conflict guarantee.",
    linkText: "View Schedule →",
    linkHref: "/lead-dashboard/resources",
  },
  {
    id: "NOTIF-3",
    title: "Task Moved: TASK-106 moved to COMPLETED",
    category: "Task",
    sender: "Marcus N.",
    time: "2h ago",
    read: false,
    details: "Marcus N. completed 'Initial workspace schema setup'. Project Alpha Core progress updated to 78%.",
    linkText: "Open Task Board →",
    linkHref: "/lead-dashboard/projects/1",
  },
  {
    id: "NOTIF-4",
    title: "You were mentioned in #alpha-core-general",
    category: "Mention",
    sender: "Dr. Aris",
    time: "Yesterday",
    read: true,
    details: "@DK (Lead) - Chamber 3 calibration logs uploaded to S3. Ready for SNR statistical review.",
    linkText: "Open Project Chat →",
    linkHref: "/lead-dashboard/chat",
  },
  {
    id: "NOTIF-5",
    title: "New document draft uploaded: 'Q3 Consensus Protocol v1.0'",
    category: "Task",
    sender: "Shehara K.",
    time: "2 days ago",
    read: true,
    details: "Shehara K. shared collaborative meeting minutes for committee review.",
    linkText: "Open Documents →",
    linkHref: "/lead-dashboard/documents",
  },
];

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState<NotificationItem[]>(INITIAL_NOTIFICATIONS);
  const [filter, setFilter] = useState<"ALL" | "UNREAD" | "Task" | "Booking" | "AI Alert">("ALL");

  const unreadCount = notifications.filter((n) => !n.read).length;

  const handleMarkAllAsRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  };

  const handleToggleRead = (id: string) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: !n.read } : n))
    );
  };

  const filteredNotifs = notifications.filter((n) => {
    if (filter === "ALL") return true;
    if (filter === "UNREAD") return !n.read;
    return n.category === filter;
  });

  return (
    <div>
      {/* ── Page Header ────────────────────────────────────────────────────── */}
      <div style={s.headerRow}>
        <div>
          <h1 style={s.pageTitle}>Notifications & Inbox</h1>
          <p style={s.pageSub}>
            Asynchronous task alerts, member mentions, and equipment booking notifications.
          </p>
        </div>

        {unreadCount > 0 && (
          <button onClick={handleMarkAllAsRead} style={s.btnSecondary}>
            ✓ Mark all as read
          </button>
        )}
      </div>

      {/* ── Metric Stat Cards ────────────────────────────────────────────────── */}
      <div style={s.statGrid}>
        <div style={s.statCard}>
          <span style={s.statLabel}>UNREAD ALERTS</span>
          <span style={s.statValue}>{unreadCount}</span>
          <span style={s.statSub}>Requires attention</span>
        </div>
        <div style={s.statCard}>
          <span style={s.statLabel}>TASK UPDATES</span>
          <span style={s.statValue}>
            {notifications.filter((n) => n.category === "Task").length}
          </span>
          <span style={s.statSub}>Kanban activity</span>
        </div>
        <div style={s.statCard}>
          <span style={s.statLabel}>BOOKING ALERTS</span>
          <span style={s.statValue}>
            {notifications.filter((n) => n.category === "Booking").length}
          </span>
          <span style={s.statSub}>Lab schedule events</span>
        </div>
        <div style={s.statCard}>
          <span style={s.statLabel}>AI SYNTHESIS ALERTS</span>
          <span style={s.statValue}>
            {notifications.filter((n) => n.category === "AI Alert").length}
          </span>
          <span style={s.statSub}>LangChain extractions</span>
        </div>
      </div>

      {/* ── Filter Bar ──────────────────────────────────────────────────────── */}
      <div style={s.filterBar}>
        <div style={s.filterGroup}>
          <span style={s.filterLabel}>FILTER:</span>
          {(["ALL", "UNREAD", "Task", "Booking", "AI Alert"] as const).map((cat) => (
            <button
              key={cat}
              onClick={() => setFilter(cat)}
              style={filter === cat ? s.filterBtnActive : s.filterBtn}
            >
              {cat === "ALL" ? "All Alerts" : cat === "UNREAD" ? `Unread (${unreadCount})` : cat}
            </button>
          ))}
        </div>
        <span style={s.countLabel}>{filteredNotifs.length} Notifications</span>
      </div>

      {/* ── Notifications List Card ─────────────────────────────────────────── */}
      <div style={s.tableCard}>
        <div style={s.notifList}>
          {filteredNotifs.length === 0 ? (
            <div style={s.emptyState}>
              <p style={{ fontSize: 14, fontWeight: 600, color: "#161616" }}>Inbox is clear</p>
              <p style={{ fontSize: 12, color: "#9e9e9e", marginTop: 4 }}>No notifications matching this filter.</p>
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
                        ...(item.category === "AI Alert"
                          ? s.badgeAi
                          : item.category === "Booking"
                          ? s.badgeBooking
                          : item.category === "Mention"
                          ? s.badgeMention
                          : s.badgeTask),
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
                  <span style={s.notifSender}>
                    From: <strong>{item.sender}</strong>
                  </span>

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
  notifBottom: { display: "flex", justifyContent: "space-between", alignItems: "center", paddingTop: 8, borderTop: "1px solid #f9f9f9" },
  notifSender: { fontSize: 11, color: "#9e9e9e" },
  notifActionLink: { fontSize: 12, fontWeight: 600, color: "#161616", textDecoration: "none" },
  btnToggleRead: { background: "none", border: "none", color: "#9e9e9e", fontSize: 11, cursor: "pointer" },
  categoryBadge: { fontSize: 10, fontWeight: 700, padding: "2px 6px", borderRadius: 3, textTransform: "uppercase" as const },
  badgeAi: { background: "#161616", color: "#ffffff" },
  badgeBooking: { background: "#e8f5e9", color: "#2e7d32", border: "1px solid #c8e6c9" },
  badgeTask: { background: "#f5f5f5", color: "#424242", border: "1px solid #e0e0e0" },
  badgeMention: { background: "#fff8e1", color: "#f57f17", border: "1px solid #ffe082" },
  emptyState: { padding: "48px 24px", textAlign: "center" as const },
};
