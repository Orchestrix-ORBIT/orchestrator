"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import LoadingState from "@/components/ui/LoadingState";
import { NotificationsService, type Notification as BackendNotif } from "@/lib/services/notifications";

// Map backend type → display category
type DisplayCategory = "Task" | "Booking" | "AI Alert" | "Mention" | "System";

function mapType(type: string): DisplayCategory {
  const t = (type || "").toUpperCase();
  if (t.includes("TASK"))    return "Task";
  if (t.includes("BOOK") || t.includes("RESOURCE")) return "Booking";
  if (t.includes("AI") || t.includes("ALERT"))      return "AI Alert";
  if (t.includes("MENTION")) return "Mention";
  return "System";
}

function timeAgo(isoString: string): string {
  try {
    const diff = Date.now() - new Date(isoString).getTime();
    const mins  = Math.floor(diff / 60000);
    if (mins < 1)   return "Just now";
    if (mins < 60)  return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24)   return `${hrs}h ago`;
    const days = Math.floor(hrs / 24);
    if (days === 1) return "Yesterday";
    return `${days} days ago`;
  } catch {
    return "";
  }
}

interface DisplayNotif {
  id: string;
  category: DisplayCategory;
  title: string;
  details: string;
  time: string;
  read: boolean;
}

function mapBackend(n: BackendNotif): DisplayNotif {
  return {
    id:       n.id,
    category: mapType(n.type),
    title:    n.title,
    details:  n.message,
    time:     timeAgo(n.createdAt),
    read:     n.read,
  };
}

export default function NotificationsPage() {
  const [loading, setLoading]             = useState(true);
  const [error, setError]                 = useState<string | null>(null);
  const [notifications, setNotifications] = useState<DisplayNotif[]>([]);
  const [filter, setFilter]               = useState<"ALL" | "UNREAD" | DisplayCategory>("ALL");
  const [markingAll, setMarkingAll]       = useState(false);

  useEffect(() => {
    NotificationsService.getAll()
      .then(list => setNotifications(list.map(mapBackend)))
      .catch(err => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <LoadingState
        title="Loading Notifications & Activity…"
        subtitle="Fetching real-time workspace alerts, task updates, and system mentions"
      />
    );
  }

  const unreadCount = notifications.filter(n => !n.read).length;

  const handleMarkAllAsRead = async () => {
    setMarkingAll(true);
    try {
      await NotificationsService.markAllRead();
      setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    } catch {
      // optimistic fallback — still update locally
      setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    } finally {
      setMarkingAll(false);
    }
  };

  const handleToggleRead = async (id: string) => {
    // Optimistic update
    setNotifications(prev =>
      prev.map(n => (n.id === id ? { ...n, read: !n.read } : n))
    );
    try {
      await NotificationsService.toggleRead(id);
    } catch {
      // Revert on failure
      setNotifications(prev =>
        prev.map(n => (n.id === id ? { ...n, read: !n.read } : n))
      );
    }
  };

  const filteredNotifs = notifications.filter(n => {
    if (filter === "ALL")    return true;
    if (filter === "UNREAD") return !n.read;
    return n.category === filter;
  });

  return (
    <div>
      {/* ── Page Header ──────────────────────────────────────────────────────── */}
      <div style={s.headerRow}>
        <div>
          <h1 style={s.pageTitle}>Notifications & Inbox</h1>
          <p style={s.pageSub}>
            Asynchronous task alerts, member mentions, and equipment booking notifications.
          </p>
        </div>

        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
          {error && <span style={{ fontSize: 12, color: "#c62828" }}>⚠ {error}</span>}
          {unreadCount > 0 && (
            <button onClick={handleMarkAllAsRead} disabled={markingAll} style={s.btnSecondary}>
              {markingAll ? "Marking…" : "✓ Mark all as read"}
            </button>
          )}
        </div>
      </div>

      {/* ── Metric Stat Cards ─────────────────────────────────────────────────── */}
      <div style={s.statGrid}>
        <div style={s.statCard}>
          <span style={s.statLabel}>UNREAD ALERTS</span>
          <span style={s.statValue}>{unreadCount}</span>
          <span style={s.statSub}>Requires attention</span>
        </div>
        <div style={s.statCard}>
          <span style={s.statLabel}>TASK UPDATES</span>
          <span style={s.statValue}>
            {notifications.filter(n => n.category === "Task").length}
          </span>
          <span style={s.statSub}>Kanban activity</span>
        </div>
        <div style={s.statCard}>
          <span style={s.statLabel}>BOOKING ALERTS</span>
          <span style={s.statValue}>
            {notifications.filter(n => n.category === "Booking").length}
          </span>
          <span style={s.statSub}>Lab schedule events</span>
        </div>
        <div style={s.statCard}>
          <span style={s.statLabel}>AI SYNTHESIS ALERTS</span>
          <span style={s.statValue}>
            {notifications.filter(n => n.category === "AI Alert").length}
          </span>
          <span style={s.statSub}>System extractions</span>
        </div>
      </div>

      {/* ── Filter Bar ───────────────────────────────────────────────────────── */}
      <div style={s.filterBar}>
        <div style={s.filterGroup}>
          <span style={s.filterLabel}>FILTER:</span>
          {(["ALL", "UNREAD", "Task", "Booking", "AI Alert", "Mention"] as const).map(cat => (
            <button
              key={cat}
              onClick={() => setFilter(cat as any)}
              style={filter === cat ? s.filterBtnActive : s.filterBtn}
            >
              {cat === "ALL" ? "All Alerts" : cat === "UNREAD" ? `Unread (${unreadCount})` : cat}
            </button>
          ))}
        </div>
        <span style={s.countLabel}>{filteredNotifs.length} Notifications</span>
      </div>

      {/* ── Notifications List ───────────────────────────────────────────────── */}
      <div style={s.tableCard}>
        <div style={s.notifList}>
          {filteredNotifs.length === 0 ? (
            <div style={s.emptyState}>
              <p style={{ fontSize: 14, fontWeight: 600, color: "#161616" }}>Inbox is clear</p>
              <p style={{ fontSize: 12, color: "#9e9e9e", marginTop: 4 }}>
                {filter === "ALL"
                  ? "No notifications yet."
                  : "No notifications matching this filter."}
              </p>
            </div>
          ) : (
            filteredNotifs.map(item => (
              <div
                key={item.id}
                style={{
                  ...s.notifItem,
                  background: item.read ? "#ffffff" : "#fafafa",
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
                  <div />
                  <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
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
  headerRow:       { display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: 24 },
  pageTitle:       { fontSize: 28, fontWeight: 700, color: "#161616", letterSpacing: "-0.5px", marginBottom: 4 },
  pageSub:         { fontSize: 13, color: "#9e9e9e" },
  btnSecondary:    { background: "#ffffff", color: "#424242", border: "1px solid #d0d0d0", borderRadius: 4, padding: "8px 14px", fontSize: 13, fontWeight: 500, cursor: "pointer" },
  statGrid:        { display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16, marginBottom: 32 },
  statCard:        { background: "#ffffff", border: "1px solid #e0e0e0", borderRadius: 6, padding: "18px 20px 20px", display: "flex", flexDirection: "column", gap: 6 },
  statLabel:       { fontSize: 11, fontWeight: 600, color: "#9e9e9e", letterSpacing: "0.5px", textTransform: "uppercase" as const },
  statValue:       { fontSize: 32, fontWeight: 700, color: "#161616", letterSpacing: "-1px", lineHeight: 1.1 },
  statSub:         { fontSize: 12, color: "#9e9e9e" },
  filterBar:       { background: "#ffffff", border: "1px solid #e0e0e0", borderRadius: 6, padding: "12px 18px", display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 },
  filterGroup:     { display: "flex", alignItems: "center", gap: 8 },
  filterLabel:     { fontSize: 11, fontWeight: 600, color: "#9e9e9e", letterSpacing: "0.5px", marginRight: 4 },
  filterBtn:       { background: "transparent", border: "1px solid #d0d0d0", borderRadius: 4, padding: "5px 12px", fontSize: 12, fontWeight: 500, color: "#616161", cursor: "pointer" },
  filterBtnActive: { background: "#161616", border: "1px solid #161616", borderRadius: 4, padding: "5px 12px", fontSize: 12, fontWeight: 600, color: "#ffffff", cursor: "pointer" },
  countLabel:      { fontSize: 12, color: "#9e9e9e", fontWeight: 500 },
  tableCard:       { background: "#ffffff", border: "1px solid #e0e0e0", borderRadius: 6, overflow: "hidden" },
  notifList:       { display: "flex", flexDirection: "column" as const },
  notifItem:       { padding: "16px 20px", borderBottom: "1px solid #f0f0f0", display: "flex", flexDirection: "column" as const, gap: 6 },
  notifTop:        { display: "flex", justifyContent: "space-between", alignItems: "center" },
  notifTitle:      { fontSize: 13, color: "#161616", fontWeight: 600 },
  newDot:          { color: "#161616", fontSize: 8 },
  notifTime:       { fontSize: 11, color: "#9e9e9e" },
  notifDesc:       { fontSize: 12, color: "#616161", lineHeight: 1.4 },
  notifBottom:     { display: "flex", justifyContent: "space-between", alignItems: "center", paddingTop: 8, borderTop: "1px solid #f9f9f9" },
  notifSender:     { fontSize: 11, color: "#9e9e9e" },
  notifActionLink: { fontSize: 12, fontWeight: 600, color: "#161616", textDecoration: "none" },
  btnToggleRead:   { background: "none", border: "none", color: "#9e9e9e", fontSize: 11, cursor: "pointer" },
  categoryBadge:   { fontSize: 10, fontWeight: 700, padding: "2px 6px", borderRadius: 3, textTransform: "uppercase" as const },
  badgeAi:         { background: "#161616", color: "#ffffff" },
  badgeBooking:    { background: "#e8f5e9", color: "#2e7d32", border: "1px solid #c8e6c9" },
  badgeTask:       { background: "#f5f5f5", color: "#424242", border: "1px solid #e0e0e0" },
  badgeMention:    { background: "#fff8e1", color: "#f57f17", border: "1px solid #ffe082" },
  emptyState:      { padding: "48px 24px", textAlign: "center" as const },
};
