"use client";

import React from "react";

export type SkeletonVariant = "dashboard" | "table" | "grid" | "chat";

interface LoadingStateProps {
  title?: string;
  subtitle?: string;
  variant?: SkeletonVariant;
}

export default function LoadingState({
  title,
  subtitle,
  variant = "dashboard",
}: LoadingStateProps) {
  return (
    <>
      <style>{`
        @keyframes subtlePulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.7; }
        }
        .skeleton-line {
          height: 16px;
          background: #f3f4f6;
          border-radius: 8px;
          animation: subtlePulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
        }
        .skeleton-card {
          background: #ffffff;
          border-radius: 12px;
          border: 1px solid #e5e7eb;
          padding: 24px;
          display: flex;
          flex-direction: column;
          gap: 16px;
          box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05), 0 2px 4px -1px rgba(0,0,0,0.03);
        }
        .skeleton-gradient-block {
          height: 160px;
          width: 100%;
          border-radius: 8px;
          margin-top: 16px;
          background: linear-gradient(180deg, #f3f4f6 0%, rgba(243, 244, 246, 0) 100%);
          animation: subtlePulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
        }
      `}</style>
      
      <div style={{ padding: "0", width: "100%", maxWidth: 1200, margin: "0 auto" }}>
        
        {/* Dynamic header if provided */}
        {(title || subtitle) ? (
          <div style={{ marginBottom: 32 }}>
            <h1 style={{ fontSize: 24, fontWeight: 700, color: "#111827", marginBottom: 8 }}>{title}</h1>
            <p style={{ fontSize: 14, color: "#6b7280" }}>{subtitle}</p>
          </div>
        ) : (
          <div style={{ marginBottom: 32 }}>
            <div className="skeleton-line" style={{ width: 280, height: 28, marginBottom: 12 }} />
            <div className="skeleton-line" style={{ width: 400, height: 16 }} />
          </div>
        )}
        
        {/* VARIANT: DASHBOARD */}
        {variant === "dashboard" && (
          <>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 24, marginBottom: 24 }}>
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="skeleton-card" style={{ padding: "20px 24px", gap: 12 }}>
                  <div className="skeleton-line" style={{ width: "60%", height: 32, marginBottom: 4 }} />
                  <div className="skeleton-line" style={{ width: "40%", height: 12 }} />
                  <div className="skeleton-line" style={{ width: "30%", height: 12 }} />
                </div>
              ))}
            </div>
            <div className="skeleton-card" style={{ padding: 32 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div className="skeleton-line" style={{ width: 200, height: 20 }} />
                <div className="skeleton-line" style={{ width: 120, height: 32, borderRadius: 8 }} />
              </div>
              <div className="skeleton-gradient-block" />
            </div>
          </>
        )}

        {/* VARIANT: TABLE */}
        {variant === "table" && (
          <div className="skeleton-card" style={{ padding: 32 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
              <div className="skeleton-line" style={{ width: 240, height: 24 }} />
              <div className="skeleton-line" style={{ width: 180, height: 36, borderRadius: 8 }} />
            </div>
            {/* Table Header */}
            <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr 1fr", gap: 16, paddingBottom: 16, borderBottom: "1px solid #f3f4f6", marginBottom: 16 }}>
              <div className="skeleton-line" style={{ width: "40%", height: 12 }} />
              <div className="skeleton-line" style={{ width: "60%", height: 12 }} />
              <div className="skeleton-line" style={{ width: "50%", height: 12 }} />
              <div className="skeleton-line" style={{ width: "30%", height: 12 }} />
            </div>
            {/* Table Rows */}
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr 1fr", gap: 16, padding: "12px 0", borderBottom: i !== 5 ? "1px solid #f9fafb" : "none" }}>
                <div className="skeleton-line" style={{ width: "70%", height: 14 }} />
                <div className="skeleton-line" style={{ width: "40%", height: 14 }} />
                <div className="skeleton-line" style={{ width: "50%", height: 14 }} />
                <div className="skeleton-line" style={{ width: "20%", height: 14 }} />
              </div>
            ))}
          </div>
        )}

        {/* VARIANT: GRID */}
        {variant === "grid" && (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: 24 }}>
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="skeleton-card" style={{ padding: 24, gap: 16 }}>
                <div style={{ display: "flex", gap: 16, alignItems: "center" }}>
                  <div className="skeleton-line" style={{ width: 48, height: 48, borderRadius: "50%", flexShrink: 0 }} />
                  <div style={{ flex: 1 }}>
                    <div className="skeleton-line" style={{ width: "60%", height: 16, marginBottom: 8 }} />
                    <div className="skeleton-line" style={{ width: "40%", height: 12 }} />
                  </div>
                </div>
                <div className="skeleton-line" style={{ width: "100%", height: 14 }} />
                <div className="skeleton-line" style={{ width: "80%", height: 14 }} />
                <div style={{ display: "flex", justifyContent: "space-between", marginTop: 8 }}>
                  <div className="skeleton-line" style={{ width: 80, height: 28, borderRadius: 6 }} />
                  <div className="skeleton-line" style={{ width: 80, height: 28, borderRadius: 6 }} />
                </div>
              </div>
            ))}
          </div>
        )}

        {/* VARIANT: CHAT */}
        {variant === "chat" && (
          <div className="skeleton-card" style={{ padding: 0, height: 600, flexDirection: "row", overflow: "hidden" }}>
            {/* Sidebar */}
            <div style={{ width: 280, borderRight: "1px solid #f3f4f6", padding: 24, display: "flex", flexDirection: "column", gap: 16 }}>
              <div className="skeleton-line" style={{ width: "100%", height: 36, borderRadius: 8, marginBottom: 16 }} />
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} style={{ display: "flex", gap: 12, alignItems: "center" }}>
                  <div className="skeleton-line" style={{ width: 32, height: 32, borderRadius: "50%", flexShrink: 0 }} />
                  <div style={{ flex: 1 }}>
                    <div className="skeleton-line" style={{ width: "80%", height: 12, marginBottom: 6 }} />
                    <div className="skeleton-line" style={{ width: "50%", height: 10 }} />
                  </div>
                </div>
              ))}
            </div>
            {/* Main Chat Area */}
            <div style={{ flex: 1, padding: 24, display: "flex", flexDirection: "column", justifyContent: "flex-end", gap: 24 }}>
              <div style={{ display: "flex", gap: 16, maxWidth: "80%" }}>
                <div className="skeleton-line" style={{ width: 40, height: 40, borderRadius: "50%", flexShrink: 0 }} />
                <div className="skeleton-line" style={{ flex: 1, height: 80, borderRadius: "0 12px 12px 12px" }} />
              </div>
              <div style={{ display: "flex", gap: 16, maxWidth: "80%", alignSelf: "flex-end", flexDirection: "row-reverse" }}>
                <div className="skeleton-line" style={{ flex: 1, height: 60, borderRadius: "12px 0 12px 12px" }} />
              </div>
              <div style={{ display: "flex", gap: 16, maxWidth: "80%" }}>
                <div className="skeleton-line" style={{ width: 40, height: 40, borderRadius: "50%", flexShrink: 0 }} />
                <div className="skeleton-line" style={{ flex: 1, height: 100, borderRadius: "0 12px 12px 12px" }} />
              </div>
              
              <div style={{ marginTop: "auto", paddingTop: 24 }}>
                <div className="skeleton-line" style={{ width: "100%", height: 50, borderRadius: 25 }} />
              </div>
            </div>
          </div>
        )}

      </div>
    </>
  );
}
