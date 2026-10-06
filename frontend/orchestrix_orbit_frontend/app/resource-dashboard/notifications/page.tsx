"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import LoadingState from "@/components/ui/LoadingState";
import { api } from "@/lib/api";
import { 
  CheckCheck, Bell, Calendar, ShieldAlert, Wrench, Activity, 
  ArrowRight, Circle, CheckCircle2 
} from "lucide-react";

interface ResourceNotification {
  id: string;
  title: string;
  category: "Collision Lock" | "Maintenance" | "Quota Alert";
  time: string;
  read: boolean;
  details: string;
  linkText?: string;
  linkHref?: string;
}

const INITIAL_NOTIFS: ResourceNotification[] = [];

export default function ResourceNotificationsPage() {
  const [notifs, setNotifs] = useState<ResourceNotification[]>(INITIAL_NOTIFS);
  const [filter, setFilter] = useState<"ALL" | "UNREAD" | ResourceNotification["category"]>("ALL");
  const [loading, setLoading] = useState(true);

  const loadNotifications = async () => {
    setLoading(true);
    try {
      const data = await api.get<any[]>("/api/notifications");
      if (Array.isArray(data)) {
        const mapped: ResourceNotification[] = data
          .filter((n) => {
            const typeStr = String(n.type || "").toUpperCase();
            const titleStr = String(n.title || "").toUpperCase();
            return !typeStr.includes("BOOKING") && !titleStr.includes("BOOKING");
          })
          .map((n) => ({
            id: n.id,
            title: n.title || "Operations Alert",
            category: (n.type as any) || "Quota Alert",
            time: n.createdAt ? new Date(n.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : "Just now",
            read: n.read ?? n.is_read ?? false,
            details: n.message || "Operational system event recorded.",
            linkText: n.type === "Maintenance" ? "View Maintenance Logs" : "View Details",
            linkHref: n.type === "Maintenance" ? "/resource-dashboard/maintenance" : "#",
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

  const getBadgeConfig = (category: string) => {
    switch(category) {
      case "Collision Lock": return { className: "badge badge-col", icon: <ShieldAlert size={12} /> };
      case "Maintenance": return { className: "badge badge-maint", icon: <Wrench size={12} /> };
      case "Booking Request": return { className: "badge badge-req", icon: <Calendar size={12} /> };
      default: return { className: "badge badge-quota", icon: <Activity size={12} /> };
    }
  }

  if (loading) return <LoadingState variant="manager-notifications" />;

  return (
    <div className="notif-page">
      <style dangerouslySetInnerHTML={{ __html: `
        .notif-page {
          animation: fadeIn 0.4s ease-out;
        }
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .header-row {
          display: flex;
          justify-content: space-between;
          align-items: flex-end;
          margin-bottom: 24px;
        }
        .page-title {
          font-size: 28px;
          font-weight: 700;
          color: #0f172a;
          letter-spacing: -0.5px;
          margin-bottom: 6px;
        }
        .page-sub {
          font-size: 14px;
          color: #64748b;
        }
        
        .btn-mark-all {
          background: #ffffff;
          color: #334155;
          border: 1px solid #cbd5e1;
          border-radius: 8px;
          padding: 8px 16px;
          font-size: 13px;
          font-weight: 600;
          cursor: pointer;
          display: flex;
          align-items: center;
          gap: 8px;
          transition: all 0.2s ease;
          box-shadow: 0 1px 2px rgba(0,0,0,0.05);
        }
        .btn-mark-all:hover {
          background: #f8fafc;
          border-color: #94a3b8;
          color: #0f172a;
          transform: translateY(-1px);
        }

        .stat-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 16px;
          margin-bottom: 32px;
        }
        .stat-card {
          background: #ffffff;
          border: 1px solid #e2e8f0;
          border-radius: 12px;
          padding: 20px;
          display: flex;
          flex-direction: column;
          gap: 8px;
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
          position: relative;
          overflow: hidden;
        }
        .stat-card:hover {
          transform: translateY(-4px);
          box-shadow: 0 12px 24px -8px rgba(0, 0, 0, 0.1);
          border-color: #cbd5e1;
        }
        .stat-label {
          font-size: 11px;
          font-weight: 600;
          color: #64748b;
          letter-spacing: 0.5px;
          text-transform: uppercase;
        }
        .stat-value {
          font-size: 36px;
          font-weight: 700;
          color: #0f172a;
          letter-spacing: -1px;
          line-height: 1.1;
        }
        .stat-sub {
          font-size: 13px;
          color: #64748b;
        }

        .filter-bar {
          background: #ffffff;
          border: 1px solid #e2e8f0;
          border-radius: 10px;
          padding: 10px 16px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 24px;
          box-shadow: 0 1px 3px rgba(0,0,0,0.05);
        }
        .filter-group {
          display: flex;
          align-items: center;
          gap: 6px;
        }
        .filter-label {
          font-size: 11px;
          font-weight: 600;
          color: #64748b;
          letter-spacing: 0.5px;
          margin-right: 8px;
          text-transform: uppercase;
        }
        .filter-btn {
          background: transparent;
          border: 1px solid transparent;
          border-radius: 20px;
          padding: 6px 14px;
          font-size: 13px;
          font-weight: 500;
          color: #64748b;
          cursor: pointer;
          transition: all 0.2s ease;
        }
        .filter-btn:hover {
          background: #f1f5f9;
          color: #334155;
        }
        .filter-btn.active {
          background: #0f172a;
          color: #ffffff;
          box-shadow: 0 4px 10px -2px rgba(15, 23, 42, 0.3);
        }
        .count-label {
          font-size: 13px;
          color: #64748b;
          font-weight: 500;
        }

        .table-card {
          background: #ffffff;
          border: 1px solid #e2e8f0;
          border-radius: 12px;
          overflow: hidden;
          box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -1px rgba(0, 0, 0, 0.03);
        }
        
        .notif-item {
          padding: 24px;
          border-bottom: 1px solid #f1f5f9;
          display: flex;
          flex-direction: column;
          gap: 12px;
          transition: all 0.2s ease;
          background: #ffffff;
          position: relative;
        }
        .notif-item:last-child {
          border-bottom: none;
        }
        .notif-item.unread {
          background: #f8fafc;
        }
        .notif-item:hover {
          background: #f1f5f9;
        }
        .notif-item::before {
          content: "";
          position: absolute;
          left: 0;
          top: 0;
          bottom: 0;
          width: 4px;
          background: transparent;
          transition: background 0.2s;
        }
        .notif-item.unread::before {
          background: #3b82f6;
        }
        .notif-top {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
        }
        .notif-title-wrap {
          display: flex;
          align-items: center;
          gap: 12px;
        }
        .notif-title {
          font-size: 15px;
          color: #0f172a;
          font-weight: 600;
        }
        .new-dot {
          color: #3b82f6;
          fill: #3b82f6;
          animation: pulse 2s infinite;
        }
        @keyframes pulse {
          0% { opacity: 1; }
          50% { opacity: 0.5; }
          100% { opacity: 1; }
        }
        .notif-time {
          font-size: 13px;
          color: #64748b;
          font-weight: 500;
        }
        .notif-desc {
          font-size: 14px;
          color: #475569;
          line-height: 1.5;
        }
        
        .notif-bottom {
          display: flex;
          justify-content: flex-end;
          align-items: center;
          padding-top: 12px;
          margin-top: 4px;
          border-top: 1px dashed #e2e8f0;
        }
        .notif-actions {
          display: flex;
          align-items: center;
          gap: 16px;
        }
        .link-action {
          font-size: 13px;
          font-weight: 600;
          color: #2563eb;
          text-decoration: none;
          display: flex;
          align-items: center;
          gap: 4px;
          transition: all 0.2s;
          padding: 6px 12px;
          border-radius: 6px;
          background: #eff6ff;
        }
        .link-action:hover {
          background: #dbeafe;
          color: #1d4ed8;
        }
        .btn-toggle-read {
          background: none;
          border: none;
          color: #64748b;
          font-size: 13px;
          font-weight: 500;
          cursor: pointer;
          display: flex;
          align-items: center;
          gap: 6px;
          transition: color 0.2s;
          padding: 6px;
        }
        .btn-toggle-read:hover {
          color: #3b82f6;
        }
        
        .badge {
          font-size: 11px;
          font-weight: 700;
          padding: 4px 10px;
          border-radius: 6px;
          text-transform: uppercase;
          display: inline-flex;
          align-items: center;
          gap: 6px;
          letter-spacing: 0.5px;
        }
        .badge-req { background: #e0e7ff; color: #4338ca; border: 1px solid #c7d2fe; }
        .badge-col { background: #fee2e2; color: #b91c1c; border: 1px solid #fecaca; }
        .badge-maint { background: #fef9c3; color: #a16207; border: 1px solid #fef08a; }
        .badge-quota { background: #f3e8ff; color: #7e22ce; border: 1px solid #e9d5ff; }
        
        .empty-state {
          padding: 64px 24px;
          text-align: center;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
        }
        .empty-icon {
          color: #94a3b8;
          margin-bottom: 16px;
        }
      `}} />

      {/* ── Page Header ────────────────────────────────────────────────────── */}
      <div className="header-row">
        <div>
          <h1 className="page-title">Operations Alerts & Notices</h1>
          <p className="page-sub">
            Real-time operations alerts for scheduled maintenance windows and asset downtime events.
          </p>
        </div>

        {unreadCount > 0 && (
          <button onClick={handleMarkAllRead} className="btn-mark-all">
            <CheckCheck size={16} /> Mark all as read
          </button>
        )}
      </div>

      {/* ── Metric Stat Cards ────────────────────────────────────────────────── */}
      <div className="stat-grid">
        <div className="stat-card">
          <span className="stat-label">UNREAD NOTICES</span>
          <span className="stat-value">{unreadCount}</span>
          <span className="stat-sub">Requires attention</span>
        </div>

        <div className="stat-card">
          <span className="stat-label">DOWNTIME ALERTS</span>
          <span className="stat-value">
            {notifs.filter((n) => n.category === "Maintenance").length}
          </span>
          <span className="stat-sub">Service lockout notices</span>
        </div>
      </div>

      {/* ── Filter Bar ──────────────────────────────────────────────────────── */}
      <div className="filter-bar">
        <div className="filter-group">
          <span className="filter-label">FILTER:</span>
          {(["ALL", "UNREAD", "Maintenance"] as const).map((cat) => (
            <button
              key={cat}
              onClick={() => setFilter(cat)}
              className={`filter-btn ${filter === cat ? "active" : ""}`}
            >
              {cat === "ALL" ? "All Alerts" : cat === "UNREAD" ? `Unread (${unreadCount})` : cat}
            </button>
          ))}
        </div>
        <span className="count-label"><Bell size={14} style={{ display: "inline", marginRight: 6, verticalAlign: "text-bottom" }} /> {filteredNotifs.length} Alerts</span>
      </div>

      {/* ── Notifications List Card ─────────────────────────────────────────── */}
      <div className="table-card">
        <div style={{ display: "flex", flexDirection: "column" }}>
          {filteredNotifs.length === 0 ? (
            <div className="empty-state">
              <CheckCircle2 size={48} className="empty-icon" strokeWidth={1.5} />
              <p style={{ fontSize: 16, fontWeight: 600, color: "#0f172a" }}>No notifications</p>
              <p style={{ fontSize: 14, color: "#64748b", marginTop: 4 }}>All operations alerts are cleared.</p>
            </div>
          ) : (
            filteredNotifs.map((item) => {
              const badge = getBadgeConfig(item.category);
              return (
                <div
                  key={item.id}
                  className={`notif-item ${!item.read ? 'unread' : ''}`}
                  onClick={() => {
                    if (!item.read) handleToggleRead(item.id);
                  }}
                  style={{ cursor: !item.read ? "pointer" : "default" }}
                >
                  <div className="notif-top">
                    <div className="notif-title-wrap">
                      <span className={badge.className}>
                        {badge.icon} {item.category}
                      </span>
                      <strong className="notif-title">{item.title}</strong>
                      {!item.read && <Circle size={10} className="new-dot" />}
                    </div>
                    <span className="notif-time">{item.time}</span>
                  </div>

                  <p className="notif-desc">{item.details}</p>

                  <div className="notif-bottom">
                    <div className="notif-actions">
                      {item.linkHref && item.linkText && (
                        <Link href={item.linkHref} className="link-action">
                          {item.linkText} <ArrowRight size={14} />
                        </Link>
                      )}

                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleToggleRead(item.id);
                        }}
                        className="btn-toggle-read"
                      >
                        {item.read ? "Mark as unread" : <><CheckCheck size={14} /> Mark as read</>}
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
