"use client";

import { useState } from "react";

/* ── Types ───────────────────────────────────────────────────────────────── */
type NotifCategory = "All" | "Tasks" | "Bookings" | "Chat" | "AI";
type NotifType = "task" | "message" | "ai" | "booking";

interface Notification {
  id: string;
  type: NotifType;
  title: string;
  description: string;
  time: string;
  tag: string;
  tagExtra?: string;
  isUnread?: boolean;
  categories: NotifCategory[];
}

/* ── Static data ─────────────────────────────────────────────────────────── */
const NOTIFICATIONS: Notification[] = [
  {
    id: "notif-1",
    type: "task",
    title: "Task Completed",
    description: "Dr. Aris reviewed the genomic sequence alignment report.",
    time: "10m ago",
    tag: "PROJECT ALPHA",
    tagExtra: "Encrypted",
    isUnread: true,
    categories: ["All", "Tasks"],
  },
  {
    id: "notif-2",
    type: "message",
    title: "New Message",
    description: '"Can we schedule a sync regarding the synthesis phase?" - Sarah',
    time: "1h ago",
    tag: "LAB SETUP",
    isUnread: true,
    categories: ["All", "Chat"],
  },
  {
    id: "notif-3",
    type: "ai",
    title: "AI Summary Ready",
    description: "Your weekly literature review synthesis is available for reading.",
    time: "Yesterday",
    tag: "LITERATURE",
    isUnread: false,
    categories: ["All", "AI"],
  },
  {
    id: "notif-4",
    type: "booking",
    title: "Booking Confirmed",
    description: "Equipment 'Electron Microscope A' reserved for 14:00 - 16:00.",
    time: "Oct 24",
    tag: "EQUIPMENT",
    isUnread: false,
    categories: ["All", "Bookings"],
  },
];

const TABS: NotifCategory[] = ["All", "Tasks", "Bookings", "Chat", "AI"];

/* ── Type icon map ───────────────────────────────────────────────────────── */
function NotifIcon({ type }: { type: NotifType }) {
  if (type === "task") {
    return (
      <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.5">
        <circle cx="9" cy="9" r="8" />
        <path d="M6 9l2.5 2.5L12.5 6" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    );
  }
  if (type === "message") {
    return (
      <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.5">
        <path d="M1 3C1 2.17 1.67 1.5 2.5 1.5h13c.83 0 1.5.67 1.5 1.5v9c0 .83-.67 1.5-1.5 1.5H5.5L1 17V3z" strokeLinejoin="round" />
      </svg>
    );
  }
  if (type === "ai") {
    return (
      <svg width="18" height="18" viewBox="0 0 18 18" fill="currentColor">
        <path d="M9 1.5l1.2 3.6h3.8l-3 2.2 1.2 3.6L9 8.7 5.8 10.9l1.2-3.6-3-2.2h3.8z" />
        <path d="M14 11.5l.6 1.8H16.4l-1.5 1.1.6 1.8-1.5-1.1-1.5 1.1.6-1.8-1.5-1.1h1.8z" />
        <path d="M4 11.5l.6 1.8H6.4L4.9 14.4l.6 1.8-1.5-1.1-1.5 1.1.6-1.8-1.5-1.1h1.8z" />
      </svg>
    );
  }
  /* booking */
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.5">
      <rect x="1.5" y="3" width="15" height="13.5" rx="1.5" />
      <path d="M1.5 7.5h15M5.5 1.5v3M12.5 1.5v3" strokeLinecap="round" />
    </svg>
  );
}

/* ════════════════════════════════════════════════════════════════════════════
   Notifications Page
═══════════════════════════════════════════════════════════════════════════ */
export default function NotificationsPage() {
  const [activeTab, setActiveTab] = useState<NotifCategory>("All");

  const filtered = NOTIFICATIONS.filter((n) =>
    n.categories.includes(activeTab)
  );

  return (
    <div>
      {/* ── Page header ──────────────────────────────────────────────────── */}
      <div style={s.pageHeader}>
        <h1 style={s.pageTitle}>Notifications</h1>
        <button id="btn-mark-all-read" style={s.markAllBtn}>
          Mark all as read
        </button>
      </div>

      {/* ── Filter tabs ───────────────────────────────────────────────────── */}
      <div style={s.tabRow}>
        {TABS.map((tab) => (
          <button
            key={tab}
            id={`tab-notif-${tab.toLowerCase()}`}
            style={activeTab === tab ? s.tabActive : s.tab}
            onClick={() => setActiveTab(tab)}
          >
            {tab === "AI" ? (
              <span style={{ display: "flex", alignItems: "center", gap: 5 }}>
                <svg width="11" height="11" viewBox="0 0 11 11" fill="currentColor">
                  <path d="M5.5 1l.7 2.1h2.2l-1.8 1.3.7 2.1-1.8-1.3-1.8 1.3.7-2.1-1.8-1.3h2.2z" />
                  <path d="M9 7l.4 1.2H10.6l-1 .7.4 1.2-1-.7-1 .7.4-1.2-1-.7H8.6z" />
                  <path d="M2 7l.4 1.2H3.6l-1 .7.4 1.2-1-.7-1 .7.4-1.2-1-.7H1.6z" />
                </svg>
                AI
              </span>
            ) : tab}
          </button>
        ))}
      </div>

      {/* ── Notification list ─────────────────────────────────────────────── */}
      <div style={s.notifList}>
        {filtered.map((notif) => (
          <NotifRow key={notif.id} notif={notif} />
        ))}
      </div>

      {/* ── Footer ───────────────────────────────────────────────────────── */}
      <div style={s.footer}>
        <svg width="13" height="13" viewBox="0 0 13 13" fill="none" stroke="currentColor" strokeWidth="1.2" style={{ marginRight: 6 }}>
          <rect x="1.5" y="5" width="10" height="7" rx="1" />
          <path d="M4 5V3.5a2.5 2.5 0 0 1 5 0V5" strokeLinecap="round" />
        </svg>
        End-to-end encrypted connection
      </div>
    </div>
  );
}

/* ── Notification Row ────────────────────────────────────────────────────── */
function NotifRow({ notif }: { notif: Notification }) {
  return (
    <div id={notif.id} style={s.notifRow}>
      {/* Unread indicator */}
      <div style={s.unreadDot}>
        {notif.isUnread && <span style={s.dot} />}
      </div>

      {/* Icon */}
      <div style={s.iconWrap}>
        <NotifIcon type={notif.type} />
      </div>

      {/* Content */}
      <div style={s.notifContent}>
        <div style={s.notifTop}>
          <span style={s.notifTitle}>{notif.title}</span>
          <span style={s.notifTime}>{notif.time}</span>
        </div>
        <p style={s.notifDesc}>{notif.description}</p>
        <div style={s.tagRow}>
          <span style={s.tag}>{notif.tag}</span>
          {notif.tagExtra && (
            <span style={s.encryptedTag}>
              <svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="1.2" style={{ marginRight: 3 }}>
                <rect x="1.5" y="4" width="7" height="5" rx="0.8" />
                <path d="M3 4V3a2 2 0 0 1 4 0v1" strokeLinecap="round" />
              </svg>
              {notif.tagExtra}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

/* ── Styles ─────────────────────────────────────────────────────────────── */
const s: Record<string, React.CSSProperties> = {
  /* Page header */
  pageHeader: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 20,
  },
  pageTitle: {
    fontSize: 28,
    fontWeight: 700,
    color: "#161616",
    letterSpacing: "-0.5px",
  },
  markAllBtn: {
    fontSize: 13,
    fontWeight: 500,
    color: "#616161",
    background: "transparent",
    border: "none",
    cursor: "pointer",
  },

  /* Tabs */
  tabRow: {
    display: "flex",
    gap: 0,
    borderBottom: "1px solid #e8e8e8",
    marginBottom: 0,
  },
  tab: {
    padding: "10px 18px",
    fontSize: 13,
    fontWeight: 500,
    color: "#9e9e9e",
    background: "transparent",
    border: "none",
    borderBottom: "2px solid transparent",
    cursor: "pointer",
    marginBottom: -1,
  },
  tabActive: {
    padding: "10px 18px",
    fontSize: 13,
    fontWeight: 600,
    color: "#161616",
    background: "transparent",
    border: "none",
    borderBottom: "2px solid #161616",
    cursor: "pointer",
    marginBottom: -1,
    display: "flex",
    alignItems: "center",
  },

  /* Notification list */
  notifList: {
    background: "#ffffff",
    border: "1px solid #e0e0e0",
    borderRadius: 8,
    overflow: "hidden" as const,
    marginTop: 20,
  },

  /* Notification row */
  notifRow: {
    display: "flex",
    alignItems: "flex-start",
    gap: 0,
    padding: "18px 20px",
    borderBottom: "1px solid #f0f0f0",
    transition: "background 0.1s",
  },
  unreadDot: {
    width: 20,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    paddingTop: 4,
    flexShrink: 0,
  },
  dot: {
    display: "block",
    width: 7,
    height: 7,
    borderRadius: "50%",
    background: "#161616",
  },
  iconWrap: {
    width: 40,
    height: 40,
    borderRadius: 8,
    background: "#f5f5f5",
    border: "1px solid #e8e8e8",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    color: "#424242",
    flexShrink: 0,
    marginRight: 16,
  },
  notifContent: {
    flex: 1,
    display: "flex",
    flexDirection: "column" as const,
    gap: 4,
  },
  notifTop: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  notifTitle: {
    fontSize: 14,
    fontWeight: 700,
    color: "#161616",
  },
  notifTime: {
    fontSize: 12,
    color: "#9e9e9e",
    whiteSpace: "nowrap" as const,
    flexShrink: 0,
  },
  notifDesc: {
    fontSize: 13,
    color: "#616161",
    lineHeight: 1.5,
  },
  tagRow: {
    display: "flex",
    alignItems: "center",
    gap: 8,
    marginTop: 2,
  },
  tag: {
    fontSize: 10,
    fontWeight: 700,
    letterSpacing: "0.5px",
    color: "#616161",
    background: "#f0f0f0",
    borderRadius: 3,
    padding: "2px 7px",
  },
  encryptedTag: {
    display: "flex",
    alignItems: "center",
    fontSize: 11,
    color: "#9e9e9e",
  },

  /* Footer */
  footer: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 40,
    fontSize: 12,
    color: "#9e9e9e",
  },
};
