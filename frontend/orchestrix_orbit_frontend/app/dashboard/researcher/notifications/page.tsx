"use client";

import React, { useState, useEffect, useRef } from "react";
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

  const isMutating = useRef(false);

  useEffect(() => {
    const fetchNotifs = () => {
      if (isMutating.current) return; // skip poll while a write is in-flight
      NotificationsService.getAll()
        .then(list => setNotifications(list.map(mapBackend)))
        .catch(err => setError(err.message))
        .finally(() => setLoading(false));
    };

    fetchNotifs();
    const interval = setInterval(fetchNotifs, 5000);

    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return (
      <LoadingState variant="researcher-notifications" title="Loading Notifications & Activity…"
        subtitle="Fetching real-time workspace alerts, task updates, and system mentions"
      />
    );
  }

  const unreadCount = notifications.filter(n => !n.read).length;

  const handleMarkAllAsRead = async () => {
    setMarkingAll(true);
    isMutating.current = true;
    try {
      await NotificationsService.markAllRead();
      setNotifications(prev => prev.map(n => ({ ...n, read: true })));
      window.dispatchEvent(new Event("notifications_updated"));
    } catch {
      setNotifications(prev => prev.map(n => ({ ...n, read: true })));
      window.dispatchEvent(new Event("notifications_updated"));
    } finally {
      setMarkingAll(false);
      isMutating.current = false;
    }
  };

  const handleToggleRead = async (id: string) => {
    isMutating.current = true;
    // Optimistic update
    setNotifications(prev =>
      prev.map(n => (n.id === id ? { ...n, read: !n.read } : n))
    );
    try {
      await NotificationsService.toggleRead(id);
      window.dispatchEvent(new Event("notifications_updated"));
    } catch {
      // Revert on failure
      setNotifications(prev =>
        prev.map(n => (n.id === id ? { ...n, read: !n.read } : n))
      );
      window.dispatchEvent(new Event("notifications_updated"));
    } finally {
      isMutating.current = false;
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
          {error && <span style={{ fontSize: 13, fontWeight: 600, color: "#ef4444", background: "#fef2f2", padding: "6px 12px", borderRadius: 8 }}>⚠ {error}</span>}
          {unreadCount > 0 && (
            <button onClick={handleMarkAllAsRead} disabled={markingAll} style={s.btnSecondary} className="btn-secondary-hover btn-hover-flat">
              {markingAll ? "Marking…" : "✓ Mark all as read"}
            </button>
          )}
        </div>
      </div>

      {/* ── Metric Stat Cards ─────────────────────────────────────────────────── */}
      <div style={s.statGrid}>
        <div style={s.statCard} className="stat-card-hover">
          <span style={s.statLabel}>UNREAD ALERTS</span>
          <span style={s.statValue}>{unreadCount}</span>
          <span style={s.statSub}>Requires attention</span>
        </div>
        <div style={s.statCard} className="stat-card-hover">
          <span style={s.statLabel}>TASK UPDATES</span>
          <span style={s.statValue}>
            {notifications.filter(n => n.category === "Task").length}
          </span>
          <span style={s.statSub}>Kanban activity</span>
        </div>
        <div style={s.statCard} className="stat-card-hover">
          <span style={s.statLabel}>BOOKING ALERTS</span>
          <span style={s.statValue}>
            {notifications.filter(n => n.category === "Booking").length}
          </span>
          <span style={s.statSub}>Lab schedule events</span>
        </div>
        <div style={s.statCard} className="stat-card-hover">
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
              className="btn-hover-flat"
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
              <span style={{ fontSize: 36, display: "block", marginBottom: 12 }}>📭</span>
              <p style={{ fontSize: 16, fontWeight: 700, color: "#111827" }}>Inbox is clear</p>
              <p style={{ fontSize: 13, color: "#6b7280", marginTop: 4 }}>
                {filter === "ALL"
                  ? "You're all caught up! No new notifications."
                  : "No notifications matching this filter."}
              </p>
            </div>
          ) : (
            filteredNotifs.map((item, index) => {
              const isLast = index === filteredNotifs.length - 1;
              return (
                <div
                  key={item.id}
                  style={{
                    ...s.notifItem,
                    borderBottom: isLast ? "none" : "1px solid #f1f5f9",
                    background: item.read ? "#ffffff" : "#f8fafc",
                    borderLeft: item.read ? "3px solid transparent" : "3px solid #3b82f6",
                    cursor: "pointer",
                    transition: "background 0.2s ease, transform 0.1s ease",
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = item.read ? "#f9fafb" : "#eff6ff")}
                  onMouseLeave={(e) => (e.currentTarget.style.background = item.read ? "#ffffff" : "#f8fafc")}
                >
                  <div style={s.notifTop}>
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
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
                      <strong style={{ ...s.notifTitle, color: item.read ? "#475569" : "#111827" }}>{item.title}</strong>
                      {!item.read && <span style={s.newDot}>●</span>}
                    </div>
                    <span style={s.notifTime}>{item.time}</span>
                  </div>

                  <p style={{ ...s.notifDesc, color: item.read ? "#94a3b8" : "#475569" }}>{item.details}</p>

                  <div style={s.notifBottom}>
                    <div />
                    <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                      <button
                        onClick={(e) => { e.stopPropagation(); handleToggleRead(item.id); }}
                        style={{ ...s.btnToggleRead, color: item.read ? "#94a3b8" : "#3b82f6" }}
                        className="btn-hover-flat"
                      >
                        {item.read ? "Mark as unread" : "✓ Mark read"}
                      </button>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}

const s: Record<string, React.CSSProperties> = {
  headerRow:       { display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: 32 },
  pageTitle:       { fontSize: 32, fontWeight: 800, color: "#0f172a", letterSpacing: "-0.03em", marginBottom: 6 },
  pageSub:         { fontSize: 14, color: "#64748b", fontWeight: 500 },
  btnSecondary:    { background: "#ffffff", color: "#475569", border: "1px solid #cbd5e1", borderRadius: 8, padding: "10px 18px", fontSize: 13, fontWeight: 600, cursor: "pointer", boxShadow: "0 1px 2px rgba(0,0,0,0.05)", transition: "all 0.2s ease" },
  statGrid:        { display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 20, marginBottom: 32 },
  statCard:        { background: "#ffffff", border: "1px solid #e2e8f0", borderRadius: 16, padding: "20px 24px", display: "flex", flexDirection: "column", gap: 6, boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.02), 0 2px 4px -2px rgba(0, 0, 0, 0.02)", transition: "transform 0.2s, box-shadow 0.2s" },
  statLabel:       { fontSize: 11, fontWeight: 700, color: "#64748b", letterSpacing: "0.06em", textTransform: "uppercase" as const },
  statValue:       { fontSize: 36, fontWeight: 800, color: "#0f172a", letterSpacing: "-0.04em", lineHeight: 1 },
  statSub:         { fontSize: 13, color: "#94a3b8", fontWeight: 500 },
  filterBar:       { background: "#ffffff", border: "1px solid #e2e8f0", borderRadius: 12, padding: "14px 20px", display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24, boxShadow: "0 2px 4px rgba(0,0,0,0.02)" },
  filterGroup:     { display: "flex", alignItems: "center", gap: 10 },
  filterLabel:     { fontSize: 12, fontWeight: 700, color: "#64748b", letterSpacing: "0.05em", marginRight: 8, textTransform: "uppercase" },
  filterBtn:       { background: "transparent", border: "1px solid #cbd5e1", borderRadius: 6, padding: "6px 14px", fontSize: 12, fontWeight: 600, color: "#475569", cursor: "pointer", transition: "all 0.2s ease" },
  filterBtnActive: { background: "#0f172a", border: "1px solid #0f172a", borderRadius: 6, padding: "6px 14px", fontSize: 12, fontWeight: 600, color: "#ffffff", cursor: "pointer", boxShadow: "0 1px 2px rgba(15, 23, 42, 0.1)" },
  countLabel:      { fontSize: 13, color: "#64748b", fontWeight: 600 },
  tableCard:       { background: "#ffffff", border: "1px solid #e2e8f0", borderRadius: 16, overflow: "hidden", boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.02), 0 2px 4px -2px rgba(0, 0, 0, 0.02)" },
  notifList:       { display: "flex", flexDirection: "column" as const },
  notifItem:       { padding: "20px 24px", borderBottom: "1px solid #f1f5f9", display: "flex", flexDirection: "column" as const, gap: 8 },
  notifTop:        { display: "flex", justifyContent: "space-between", alignItems: "center" },
  notifTitle:      { fontSize: 14, color: "#0f172a", fontWeight: 700 },
  newDot:          { color: "#3b82f6", fontSize: 10, marginLeft: 4 },
  notifTime:       { fontSize: 12, color: "#94a3b8", fontWeight: 500 },
  notifDesc:       { fontSize: 13, color: "#475569", lineHeight: 1.5, marginTop: 2 },
  notifBottom:     { display: "flex", justifyContent: "space-between", alignItems: "center", paddingTop: 10, marginTop: 4 },
  btnToggleRead:   { background: "none", border: "none", color: "#64748b", fontSize: 12, fontWeight: 600, cursor: "pointer", transition: "color 0.2s ease" },
  categoryBadge:   { fontSize: 11, fontWeight: 700, padding: "3px 8px", borderRadius: 6, textTransform: "uppercase" as const, letterSpacing: "0.02em" },
  badgeAi:         { background: "#0f172a", color: "#f8fafc", boxShadow: "0 1px 2px rgba(0,0,0,0.1)" },
  badgeBooking:    { background: "#f0fdf4", color: "#166534", border: "1px solid #bbf7d0" },
  badgeTask:       { background: "#f1f5f9", color: "#475569", border: "1px solid #e2e8f0" },
  badgeMention:    { background: "#fffbeb", color: "#d97706", border: "1px solid #fde68a" },
  emptyState:      { padding: "64px 24px", textAlign: "center" as const },
};
