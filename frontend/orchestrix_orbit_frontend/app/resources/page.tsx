"use client";

import React, { useState, useEffect } from "react";
import { api } from "@/lib/api";

const S = {
  container: {
    display: "flex",
    flexDirection: "column" as const,
    gap: "24px",
    height: "100%",
  },
  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
  },
  title: {
    fontSize: "24px",
    fontWeight: 600,
    color: "var(--navy-900)",
    margin: 0,
  },
  btn: {
    background: "var(--navy-900)",
    color: "var(--white)",
    border: "none",
    padding: "10px 20px",
    borderRadius: "var(--radius-sm)",
    fontWeight: 500,
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    gap: "8px",
    transition: "background 0.2s ease",
  },
  content: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: "24px",
    flex: 1,
    minHeight: "500px",
  },
  panel: {
    background: "var(--white)",
    borderRadius: "var(--radius)",
    border: "1px solid var(--border)",
    display: "flex",
    flexDirection: "column" as const,
    overflow: "hidden",
  },
  panelHeader: {
    padding: "16px 24px",
    background: "var(--navy-100)",
    borderBottom: "1px solid var(--border)",
    fontWeight: 600,
    color: "var(--navy-900)",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
  },
  panelBody: {
    padding: "24px",
    display: "flex",
    flexDirection: "column" as const,
    gap: "16px",
    flex: 1,
    overflowY: "auto" as const,
  },
  resourceCard: (isSelected: boolean) => ({
    padding: "16px",
    border: `1px solid ${isSelected ? 'var(--navy-700)' : 'var(--border)'}`,
    borderRadius: "var(--radius-sm)",
    cursor: "pointer",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    transition: "all 0.2s ease",
    background: isSelected ? "rgba(13, 59, 110, 0.05)" : "transparent",
  }),
  resourceInfo: {
    display: "flex",
    flexDirection: "column" as const,
    gap: "8px",
  },
  resourceName: {
    fontWeight: 600,
    color: "var(--navy-900)",
    fontSize: "15px",
    margin: 0,
  },
  badge: {
    background: "var(--off-white)",
    color: "var(--text-muted)",
    padding: "4px 8px",
    borderRadius: "4px",
    fontSize: "11px",
    fontWeight: 600,
    border: "1px solid var(--border)",
    display: "inline-block",
  },
  statusDot: (isAvailable: boolean) => ({
    width: "10px",
    height: "10px",
    borderRadius: "50%",
    background: isAvailable ? "#10b981" : "#ef4444",
  }),
  emptyState: {
    display: "flex",
    flexDirection: "column" as const,
    alignItems: "center",
    justifyContent: "center",
    height: "100%",
    color: "var(--text-muted)",
    gap: "12px",
    textAlign: "center" as const,
  },
  bookingCard: {
    padding: "16px",
    border: "1px solid var(--border)",
    borderRadius: "var(--radius-sm)",
    display: "flex",
    flexDirection: "column" as const,
    gap: "8px",
  },
  timeLabel: {
    fontSize: "13px",
    fontWeight: 500,
    color: "var(--navy-900)",
  },
  timeValue: {
    fontSize: "13px",
    color: "var(--text-muted)",
  }
};

interface Resource {
  id: string;
  name: string;
  type: string;
  description?: string;
  isAvailable: boolean;
}

interface Booking {
  id: string;
  resourceId: string;
  userId: string;
  startTime: string;
  endTime: string;
  notes?: string;
}

const MOCK_RESOURCES: Resource[] = [
  { id: "1", name: "CRISPR Machine", type: "LAB_EQUIPMENT", isAvailable: false },
  { id: "2", name: "Server Rack A", type: "COMPUTE", isAvailable: true },
  { id: "3", name: "Meeting Room 1", type: "ROOM", isAvailable: true },
  { id: "4", name: "GPU Cluster", type: "COMPUTE", isAvailable: false },
];

const MOCK_BOOKINGS: Record<string, Booking[]> = {
  "1": [
    { id: "b1", resourceId: "1", userId: "u1", startTime: "2026-08-14T09:00:00Z", endTime: "2026-08-14T12:00:00Z", notes: "Gene editing trial" }
  ],
  "2": [],
  "3": [
    { id: "b2", resourceId: "3", userId: "u2", startTime: "2026-08-15T14:00:00Z", endTime: "2026-08-15T15:00:00Z", notes: "Weekly sync" }
  ],
  "4": [
    { id: "b3", resourceId: "4", userId: "u3", startTime: "2026-08-16T00:00:00Z", endTime: "2026-08-18T00:00:00Z", notes: "Model training run" }
  ]
};

export default function ResourcesPage() {
  const [resources, setResources] = useState<Resource[]>(MOCK_RESOURCES);
  const [selectedResource, setSelectedResource] = useState<Resource | null>(null);
  const [bookings, setBookings] = useState<Booking[]>([]);

  useEffect(() => {
    api.get<Resource[]>("/api/resources")
      .then(data => setResources(data))
      .catch(err => {
        console.log("Using mock resources (backend offline)");
        setResources(MOCK_RESOURCES);
      });
  }, []);

  useEffect(() => {
    if (!selectedResource) {
      setBookings([]);
      return;
    }
    
    api.get<Booking[]>(`/api/resources/${selectedResource.id}/bookings`)
      .then(data => setBookings(data))
      .catch(err => {
        console.log("Using mock bookings (backend offline)");
        setBookings(MOCK_BOOKINGS[selectedResource.id] || []);
      });
  }, [selectedResource]);

  const formatDate = (isoString: string) => {
    return new Date(isoString).toLocaleString('en-US', {
      weekday: 'short', month: 'short', day: 'numeric',
      hour: 'numeric', minute: '2-digit'
    });
  };

  return (
    <div style={S.container}>
      <header style={S.header}>
        <h2 style={S.title}>Resource Booking</h2>
        <button style={S.btn}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="12" y1="5" x2="12" y2="19"></line>
            <line x1="5" y1="12" x2="19" y2="12"></line>
          </svg>
          New Resource
        </button>
      </header>

      <div style={S.content}>
        {/* Left Column: Resources List */}
        <div style={S.panel} className="animate-fade-up">
          <div style={S.panelHeader}>
            Available Resources
            <span style={{ fontSize: "13px", fontWeight: "normal", color: "var(--text-muted)" }}>{resources.length} total</span>
          </div>
          <div style={S.panelBody}>
            {resources.map(res => (
              <div 
                key={res.id} 
                style={S.resourceCard(selectedResource?.id === res.id)}
                onClick={() => setSelectedResource(res)}
              >
                <div style={S.resourceInfo}>
                  <h3 style={S.resourceName}>{res.name}</h3>
                  <div><span style={S.badge}>{res.type.replace('_', ' ')}</span></div>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <span style={{ fontSize: "12px", color: "var(--text-muted)" }}>
                    {res.isAvailable ? "Available" : "Booked"}
                  </span>
                  <div style={S.statusDot(res.isAvailable)} />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right Column: Bookings */}
        <div style={S.panel} className="animate-fade-up-delay-1">
          {selectedResource ? (
            <>
              <div style={S.panelHeader}>
                {selectedResource.name} - Schedule
                <button style={{...S.btn, padding: "6px 12px", fontSize: "13px"}}>
                  + Book
                </button>
              </div>
              <div style={S.panelBody}>
                {bookings.length > 0 ? (
                  bookings.map(b => (
                    <div key={b.id} style={S.bookingCard}>
                      <div style={{ display: "flex", justifyContent: "space-between" }}>
                        <span style={S.timeLabel}>Start:</span>
                        <span style={S.timeValue}>{formatDate(b.startTime)}</span>
                      </div>
                      <div style={{ display: "flex", justifyContent: "space-between" }}>
                        <span style={S.timeLabel}>End:</span>
                        <span style={S.timeValue}>{formatDate(b.endTime)}</span>
                      </div>
                      {b.notes && (
                        <div style={{ marginTop: "8px", paddingTop: "8px", borderTop: "1px dashed var(--border)", fontSize: "13px", color: "var(--text-muted)" }}>
                          {b.notes}
                        </div>
                      )}
                    </div>
                  ))
                ) : (
                  <div style={S.emptyState}>
                    <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="var(--border)" strokeWidth="1">
                      <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
                      <line x1="16" y1="2" x2="16" y2="6"></line>
                      <line x1="8" y1="2" x2="8" y2="6"></line>
                      <line x1="3" y1="10" x2="21" y2="10"></line>
                    </svg>
                    <p>No upcoming bookings for this resource.</p>
                  </div>
                )}
              </div>
            </>
          ) : (
            <div style={S.emptyState}>
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="var(--border)" strokeWidth="1">
                <circle cx="12" cy="12" r="10"></circle>
                <line x1="12" y1="8" x2="12" y2="12"></line>
                <line x1="12" y1="16" x2="12.01" y2="16"></line>
              </svg>
              <p>Select a resource from the list<br/>to view its booking schedule.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
