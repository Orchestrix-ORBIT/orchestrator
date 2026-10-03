"use client";

import React from "react";

export type SkeletonVariant = "dashboard" | "table" | "grid" | "chat" | "roster" | "resources" | "documents" | "ai-summaries" | "notifications" | "kanban" | "researcher-home" | "researcher-projects" | "researcher-tasks" | "researcher-resources" | "researcher-chat" | "researcher-ai-summaries" | "researcher-notifications" | "manager-overview" | "manager-assets" | "manager-bookings" | "manager-maintenance" | "manager-notifications";

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
        @keyframes shimmerRTL {
          0% { background-position: 200% 0; }
          100% { background-position: -200% 0; }
        }
        .skeleton-line {
          background: #f3f4f6;
          background-image: linear-gradient(to left, #f3f4f6 8%, #e5e7eb 18%, #f3f4f6 33%);
          background-size: 200% 100%;
          animation: shimmerRTL 1.5s linear infinite;
          border-radius: 8px;
        }
        .skeleton-gradient-block {
          height: 160px;
          width: 100%;
          border-radius: 8px;
          margin-top: 16px;
          background: #f3f4f6;
          background-image: linear-gradient(to left, #f3f4f6 8%, #e5e7eb 18%, #f3f4f6 33%);
          background-size: 200% 100%;
          animation: shimmerRTL 1.5s linear infinite;
        }
      `}</style>
      
      <div style={{ padding: "0", width: "100%", maxWidth: 1200, margin: "0 auto" }}>
        
        {/* Dynamic header if provided */}
        {(title || subtitle) ? (
          <div style={{ marginBottom: 32 }}>
            <h1 style={{ fontSize: 24, fontWeight: 700, color: "#111827", marginBottom: 8 }}>{title}</h1>
            <p style={{ fontSize: 14, color: "#6b7280" }}>{subtitle}</p>
          </div>
        ) : !variant.startsWith("manager-") ? (
          <div style={{ marginBottom: 32 }}>
            <div className="skeleton-line" style={{ width: 280, height: 28, marginBottom: 12 }} />
            <div className="skeleton-line" style={{ width: 400, height: 16 }} />
          </div>
        ) : null}
        
        {/* VARIANT: DASHBOARD */}
        {variant === "dashboard" && (
          <>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "clamp(16px, 2vw, 32px)", marginBottom: "clamp(24px, 3vw, 40px)" }}>
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="card-depth" style={{ padding: "clamp(20px, 2vw, 32px)", display: "flex", flexDirection: "column", gap: "clamp(6px, 0.5vw, 12px)", border: "none" }}>
                  <div className="skeleton-line" style={{ width: "20%", height: "clamp(28px, 2.5vw, 40px)" }} />
                  <div className="skeleton-line" style={{ width: "50%", height: "clamp(10px, 0.8vw, 13px)", marginTop: "clamp(8px, 1vw, 16px)" }} />
                  <div className="skeleton-line" style={{ width: "80%", height: "clamp(12px, 1vw, 15px)" }} />
                </div>
              ))}
            </div>
            <div className="card-depth" style={{ background: "#ffffff", borderRadius: 16, border: "1px solid #f3f4f6", padding: 0, overflow: "hidden", marginBottom: 32 }}>
              <div style={{ padding: "24px 32px", display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid #f9fafb" }}>
                <div>
                  <div className="skeleton-line" style={{ width: 180, height: 24, marginBottom: 8 }} />
                  <div className="skeleton-line" style={{ width: 260, height: 14 }} />
                </div>
                <div className="skeleton-line" style={{ width: 140, height: 36, borderRadius: 20 }} />
              </div>
              <div style={{ padding: "16px 32px", borderBottom: "1px solid #f3f4f6", display: "grid", gridTemplateColumns: "3fr 2fr 1.5fr 1fr", gap: 16 }}>
                <div className="skeleton-line" style={{ width: 100, height: 12 }} />
                <div className="skeleton-line" style={{ width: 120, height: 12 }} />
                <div className="skeleton-line" style={{ width: 100, height: 12 }} />
                <div className="skeleton-line" style={{ width: 80, height: 12 }} />
              </div>
              {[1, 2, 3].map((i) => (
                <div key={i} style={{ padding: "20px 32px", borderBottom: i !== 3 ? "1px solid #f9fafb" : "none", display: "grid", gridTemplateColumns: "3fr 2fr 1.5fr 1fr", gap: 16, alignItems: "center" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                    <div className="skeleton-line" style={{ width: 8, height: 8, borderRadius: "50%" }} />
                    <div className="skeleton-line" style={{ width: "80%", height: 16 }} />
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                    <div className="skeleton-line" style={{ width: "70%", height: 6, borderRadius: 3 }} />
                    <div className="skeleton-line" style={{ width: 24, height: 12 }} />
                  </div>
                  <div className="skeleton-line" style={{ width: 60, height: 20, borderRadius: 12 }} />
                  <div className="skeleton-line" style={{ width: 80, height: 14 }} />
                </div>
              ))}
            </div>
          </>
        )}

        {/* VARIANT: TABLE */}
        {variant === "table" && (
          <div className="card-depth" style={{ padding: 32, border: "none" }}>
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

        {/* VARIANT: KANBAN */}
        {variant === "kanban" && (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16 }}>
            {[1, 2, 3, 4].map((col) => (
              <div key={col} style={{ background: "#f9fafb", borderRadius: 8, minHeight: "65vh", padding: 12, border: "1px solid #f3f4f6" }}>
                {/* Column Header */}
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16, padding: "0 4px" }}>
                  <div className="skeleton-line" style={{ width: 80, height: 12, borderRadius: 4 }} />
                  <div className="skeleton-line" style={{ width: 20, height: 16, borderRadius: 10 }} />
                </div>
                
                {/* Tasks */}
                <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                  {[1, 2, 3].slice(0, col === 2 ? 3 : col === 1 ? 2 : 1).map((task) => (
                    <div key={task} style={{ background: "#ffffff", padding: 16, borderRadius: 10, border: "1px solid #e5e7eb", display: "flex", flexDirection: "column", gap: 12 }}>
                      <div style={{ display: "flex", justifyContent: "space-between" }}>
                        <div className="skeleton-line" style={{ width: 40, height: 12, borderRadius: 4 }} />
                        <div className="skeleton-line" style={{ width: 60, height: 18, borderRadius: 12 }} />
                      </div>
                      <div>
                        <div className="skeleton-line" style={{ width: "80%", height: 16, borderRadius: 4, marginBottom: 8 }} />
                        <div className="skeleton-line" style={{ width: "60%", height: 14, borderRadius: 4 }} />
                      </div>
                      <div style={{ display: "flex", justifyContent: "space-between", paddingTop: 10, borderTop: "1px solid #f3f4f6" }}>
                        <div className="skeleton-line" style={{ width: 70, height: 12, borderRadius: 4 }} />
                        <div className="skeleton-line" style={{ width: 24, height: 24, borderRadius: 12 }} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* VARIANT: ROSTER */}
        {variant === "roster" && (
          <div>
            {/* Top Header */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
              <div>
                <div className="skeleton-line" style={{ width: 220, height: 26, marginBottom: 8 }} />
                <div className="skeleton-line" style={{ width: 340, height: 16 }} />
              </div>
              <div className="skeleton-line" style={{ width: 280, height: 40, borderRadius: 6 }} />
            </div>

            {/* Top Card: Project Team Members */}
            <div className="card-depth" style={{ padding: 0, border: "none", overflow: "hidden", marginBottom: 40 }}>
              <div style={{ padding: "20px 24px", display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid #f3f4f6" }}>
                <div className="skeleton-line" style={{ width: 180, height: 20 }} />
                <div className="skeleton-line" style={{ width: 60, height: 24, borderRadius: 12 }} />
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "2.5fr 3fr 3fr 1fr 1fr", gap: 16, padding: "16px 24px", background: "#f9fafb", borderBottom: "1px solid #eeeeee" }}>
                <div className="skeleton-line" style={{ width: "40%", height: 12 }} />
                <div className="skeleton-line" style={{ width: "50%", height: 12 }} />
                <div className="skeleton-line" style={{ width: "40%", height: 12 }} />
                <div className="skeleton-line" style={{ width: "60%", height: 12 }} />
                <div className="skeleton-line" style={{ width: "80%", height: 12, marginLeft: "auto" }} />
              </div>
              {[1, 2, 3].map((i) => (
                <div key={i} style={{ display: "grid", gridTemplateColumns: "2.5fr 3fr 3fr 1fr 1fr", gap: 16, padding: "16px 24px", borderBottom: i !== 3 ? "1px solid #f9fafb" : "none", alignItems: "center" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                    <div className="skeleton-line" style={{ width: 32, height: 32, borderRadius: "50%", flexShrink: 0 }} />
                    <div className="skeleton-line" style={{ width: "60%", height: 14 }} />
                  </div>
                  <div className="skeleton-line" style={{ width: "70%", height: 14 }} />
                  <div style={{ display: "flex", gap: 6 }}>
                     <div className="skeleton-line" style={{ width: 100, height: 22, borderRadius: 4 }} />
                     <div className="skeleton-line" style={{ width: 120, height: 22, borderRadius: 4 }} />
                  </div>
                  <div className="skeleton-line" style={{ width: "60%", height: 14 }} />
                  <div className="skeleton-line" style={{ width: 60, height: 28, borderRadius: 6, marginLeft: "auto" }} />
                </div>
              ))}
            </div>

            {/* Bottom Header */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
              <div>
                <div className="skeleton-line" style={{ width: 240, height: 26, marginBottom: 8 }} />
                <div className="skeleton-line" style={{ width: 300, height: 16 }} />
              </div>
              <div className="skeleton-line" style={{ width: 280, height: 40, borderRadius: 6 }} />
            </div>

            {/* Bottom Card: Organization Directory */}
            <div className="card-depth" style={{ padding: 0, border: "none", overflow: "hidden" }}>
              <div style={{ display: "grid", gridTemplateColumns: "3.5fr 3.5fr 1.5fr 1.5fr", gap: 16, padding: "16px 24px", background: "#f9fafb", borderBottom: "1px solid #eeeeee" }}>
                <div className="skeleton-line" style={{ width: "40%", height: 12 }} />
                <div className="skeleton-line" style={{ width: "50%", height: 12 }} />
                <div className="skeleton-line" style={{ width: "60%", height: 12 }} />
                <div className="skeleton-line" style={{ width: 80, height: 12, marginLeft: "auto" }} />
              </div>
              {[1, 2, 3, 4].map((i) => (
                <div key={i} style={{ display: "grid", gridTemplateColumns: "3.5fr 3.5fr 1.5fr 1.5fr", gap: 16, padding: "16px 24px", borderBottom: i !== 4 ? "1px solid #f9fafb" : "none", alignItems: "center" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                    <div className="skeleton-line" style={{ width: 32, height: 32, borderRadius: "50%", flexShrink: 0 }} />
                    <div className="skeleton-line" style={{ width: "60%", height: 14 }} />
                  </div>
                  <div className="skeleton-line" style={{ width: "70%", height: 14 }} />
                  <div className="skeleton-line" style={{ width: "60%", height: 14 }} />
                  <div className="skeleton-line" style={{ width: 110, height: 30, borderRadius: 6, marginLeft: "auto" }} />
                </div>
              ))}
            </div>
          </div>
        )}

        {/* VARIANT: RESOURCES */}
        {variant === "resources" && (
          <>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 24, marginBottom: 32 }}>
              {[1, 2, 3].map((i) => (
                <div key={i} className="card-depth" style={{ background: "#ffffff", borderRadius: 12, padding: "24px", display: "flex", flexDirection: "column", gap: 4, border: "1px solid #f3f4f6" }}>
                  <div className="skeleton-line" style={{ width: 100, height: 12, marginBottom: 8 }} />
                  <div className="skeleton-line" style={{ width: 40, height: 36, marginBottom: 4 }} />
                  <div className="skeleton-line" style={{ width: 160, height: 14 }} />
                </div>
              ))}
            </div>
            
            <div className="card-depth" style={{ background: "#ffffff", borderRadius: 12, border: "1px solid #f3f4f6", padding: 0, overflow: "hidden" }}>
              <div style={{ padding: "20px 24px", borderBottom: "1px solid #f1f5f9", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div className="skeleton-line" style={{ width: 280, height: 14 }} />
                <div className="skeleton-line" style={{ width: 140, height: 14 }} />
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "2.5fr 1fr 1fr 1.2fr 1fr 1fr", gap: 16, padding: "12px 24px", background: "#f8fafc", borderBottom: "1px solid #f1f5f9" }}>
                <div className="skeleton-line" style={{ width: "40%", height: 12 }} />
                <div className="skeleton-line" style={{ width: "60%", height: 12 }} />
                <div className="skeleton-line" style={{ width: "80%", height: 12 }} />
                <div className="skeleton-line" style={{ width: "70%", height: 12 }} />
                <div className="skeleton-line" style={{ width: "50%", height: 12 }} />
                <div className="skeleton-line" style={{ width: "60%", height: 12 }} />
              </div>
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} style={{ display: "grid", gridTemplateColumns: "2.5fr 1fr 1fr 1.2fr 1fr 1fr", gap: 16, padding: "20px 24px", borderBottom: i !== 5 ? "1px solid #f1f5f9" : "none", alignItems: "center" }}>
                  <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                    <div className="skeleton-line" style={{ width: "75%", height: 16 }} />
                    <div className="skeleton-line" style={{ width: "30%", height: 12 }} />
                  </div>
                  <div className="skeleton-line" style={{ width: "60%", height: 14 }} />
                  <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                    <div className="skeleton-line" style={{ width: "85%", height: 14 }} />
                    <div className="skeleton-line" style={{ width: "40%", height: 12 }} />
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                    <div className="skeleton-line" style={{ width: "70%", height: 14 }} />
                    <div className="skeleton-line" style={{ width: "90%", height: 12 }} />
                  </div>
                  <div>
                    <div className="skeleton-line" style={{ width: 80, height: 26, borderRadius: 20 }} />
                  </div>
                  <div>
                    <div className="skeleton-line" style={{ width: 90, height: 32, borderRadius: 6 }} />
                  </div>
                </div>
              ))}
            </div>
          </>
        )}

        {/* VARIANT: DOCUMENTS */}
        {variant === "documents" && (
          <>
            {/* Filter Row */}
            <div className="card-depth" style={{ padding: "12px 20px", marginBottom: 24, display: "flex", alignItems: "center", gap: 12, border: "1px solid #e2e8f0", borderRadius: 16, background: "#ffffff" }}>
              <div className="skeleton-line" style={{ width: 140, height: 16 }} />
              <div className="skeleton-line" style={{ width: 220, height: 36, borderRadius: 8 }} />
            </div>

            {/* Stat Cards */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 24, marginBottom: 40 }}>
              {[1, 2, 3].map((i) => (
                <div key={i} className="card-depth" style={{ background: "#ffffff", border: "1px solid #e2e8f0", borderRadius: 16, padding: "24px 28px", display: "flex", flexDirection: "column", gap: 8 }}>
                  <div className="skeleton-line" style={{ width: "40%", height: 12 }} />
                  <div className="skeleton-line" style={{ width: "20%", height: 36, marginTop: 4, marginBottom: 2 }} />
                  <div className="skeleton-line" style={{ width: "60%", height: 13 }} />
                </div>
              ))}
            </div>
            
            {/* Table */}
            <div className="card-depth" style={{ background: "#ffffff", border: "1px solid #e2e8f0", borderRadius: 16, overflow: "hidden", padding: 0 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "16px 20px 12px" }}>
                <div className="skeleton-line" style={{ width: 280, height: 14 }} />
                <div className="skeleton-line" style={{ width: 100, height: 14 }} />
              </div>
              <div style={{ padding: "12px 20px", background: "#f8fafc", borderTop: "1px solid #f1f5f9", borderBottom: "1px solid #f1f5f9", display: "grid", gridTemplateColumns: "3fr 2fr 2fr 2fr 2fr 1fr", gap: 16 }}>
                {[1, 2, 3, 4, 5, 6].map(j => (
                  <div key={j} className="skeleton-line" style={{ width: ["40%", "60%", "70%", "50%", "60%", "80%"][j-1], height: 12 }} />
                ))}
              </div>
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} style={{ padding: "16px 20px", borderBottom: i !== 5 ? "1px solid #f1f5f9" : "none", display: "grid", gridTemplateColumns: "3fr 2fr 2fr 2fr 2fr 1fr", gap: 16, alignItems: "center" }}>
                  <div>
                    <div className="skeleton-line" style={{ width: "80%", height: 14, marginBottom: 6 }} />
                    <div className="skeleton-line" style={{ width: "30%", height: 11 }} />
                  </div>
                  <div className="skeleton-line" style={{ width: "60%", height: 14 }} />
                  <div className="skeleton-line" style={{ width: 80, height: 20, borderRadius: 10 }} />
                  <div className="skeleton-line" style={{ width: "70%", height: 14 }} />
                  <div className="skeleton-line" style={{ width: "50%", height: 14 }} />
                  <div style={{ display: "flex", gap: 6, justifyContent: "flex-end" }}>
                    <div className="skeleton-line" style={{ width: 60, height: 26, borderRadius: 6 }} />
                    <div className="skeleton-line" style={{ width: 30, height: 26, borderRadius: 6 }} />
                  </div>
                </div>
              ))}
            </div>
          </>
        )}

        {/* VARIANT: AI-SUMMARIES */}
        {variant === "ai-summaries" && (
          <>
            {/* Stat Cards */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16, marginBottom: 32 }}>
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="card-depth" style={{ padding: "20px 22px 22px", display: "flex", flexDirection: "column", gap: 6, border: "none" }}>
                  <div className="skeleton-line" style={{ width: "40%", height: 11 }} />
                  <div className="skeleton-line" style={{ width: "20%", height: 32, marginTop: 4, marginBottom: 2 }} />
                  <div className="skeleton-line" style={{ width: "60%", height: 12 }} />
                </div>
              ))}
            </div>
            
            {/* Table Card */}
            <div className="card-depth" style={{ padding: 0, border: "none", overflow: "hidden" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "14px 20px 10px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 24 }}>
                  <div className="skeleton-line" style={{ width: 220, height: 14 }} />
                  <div style={{ display: "flex", gap: 6 }}>
                    <div className="skeleton-line" style={{ width: 50, height: 26, borderRadius: 4 }} />
                    <div className="skeleton-line" style={{ width: 70, height: 26, borderRadius: 4 }} />
                    <div className="skeleton-line" style={{ width: 80, height: 26, borderRadius: 4 }} />
                    <div className="skeleton-line" style={{ width: 70, height: 26, borderRadius: 4 }} />
                  </div>
                </div>
                <div className="skeleton-line" style={{ width: 60, height: 14 }} />
              </div>
              <div style={{ padding: "10px 16px", background: "#fafafa", borderTop: "1px solid #eeeeee", borderBottom: "1px solid #eeeeee", display: "grid", gridTemplateColumns: "3fr 2fr 2fr 1fr 1.5fr 1fr 60px", gap: 16 }}>
                {[1, 2, 3, 4, 5, 6, 7].map(j => (
                  <div key={j} className="skeleton-line" style={{ width: ["40%", "60%", "70%", "80%", "50%", "70%", "100%"][j-1], height: 12, ...(j === 6 ? { marginLeft: "auto" } : {}) }} />
                ))}
              </div>
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} style={{ padding: "12px 16px", borderBottom: i !== 5 ? "1px solid #f3f4f6" : "none", display: "grid", gridTemplateColumns: "3fr 2fr 2fr 1fr 1.5fr 1fr 60px", gap: 16, alignItems: "center" }}>
                  <div>
                    <div className="skeleton-line" style={{ width: "80%", height: 14, marginBottom: 6 }} />
                    <div className="skeleton-line" style={{ width: "40%", height: 11 }} />
                  </div>
                  <div className="skeleton-line" style={{ width: "60%", height: 14 }} />
                  <div className="skeleton-line" style={{ width: "70%", height: 14 }} />
                  <div className="skeleton-line" style={{ width: 60, height: 20, borderRadius: 4 }} />
                  <div className="skeleton-line" style={{ width: "50%", height: 14 }} />
                  <div className="skeleton-line" style={{ width: 80, height: 20, borderRadius: 4, marginLeft: "auto" }} />
                  <div className="skeleton-line" style={{ width: 24, height: 24, borderRadius: 4, margin: "0 auto" }} />
                </div>
              ))}
            </div>
          </>
        )}

        {/* VARIANT: NOTIFICATIONS */}
        {variant === "notifications" && (
          <>
            {/* Stat Cards */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16, marginBottom: 32 }}>
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="card-depth" style={{ padding: "20px 22px 22px", display: "flex", flexDirection: "column", gap: 6, border: "none" }}>
                  <div className="skeleton-line" style={{ width: "40%", height: 11 }} />
                  <div className="skeleton-line" style={{ width: "20%", height: 32, marginTop: 4, marginBottom: 2 }} />
                  <div className="skeleton-line" style={{ width: "60%", height: 12 }} />
                </div>
              ))}
            </div>
            
            {/* Filter Bar */}
            <div className="card-depth" style={{ padding: "12px 18px", marginBottom: 20, display: "flex", alignItems: "center", justifyContent: "space-between", border: "none" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <div className="skeleton-line" style={{ width: 50, height: 12, marginRight: 4 }} />
                {[1, 2, 3, 4, 5, 6].map(i => (
                  <div key={i} className="skeleton-line" style={{ width: [70, 80, 50, 60, 60, 60][i-1], height: 26, borderRadius: 4 }} />
                ))}
              </div>
              <div className="skeleton-line" style={{ width: 100, height: 14 }} />
            </div>

            {/* List Card */}
            <div className="card-depth" style={{ padding: 0, border: "none", overflow: "hidden" }}>
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} style={{ padding: "16px 20px", borderBottom: i !== 5 ? "1px solid #f3f4f6" : "none", display: "flex", flexDirection: "column", gap: 6 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <div className="skeleton-line" style={{ width: 50, height: 14, borderRadius: 3 }} />
                      <div className="skeleton-line" style={{ width: 200, height: 14 }} />
                    </div>
                    <div className="skeleton-line" style={{ width: 60, height: 11 }} />
                  </div>
                  <div className="skeleton-line" style={{ width: "80%", height: 12, marginTop: 4 }} />
                  <div className="skeleton-line" style={{ width: "40%", height: 12 }} />
                  
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", paddingTop: 8, marginTop: 4, borderTop: "1px solid #f9f9f9" }}>
                    <div />
                    <div className="skeleton-line" style={{ width: 60, height: 11 }} />
                  </div>
                </div>
              ))}
            </div>
          </>
        )}

        {/* VARIANT: RESEARCHER-HOME */}
        {variant === "researcher-home" && (
          <>
            {/* Stat Cards */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16, marginBottom: 24 }}>
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="card-depth" style={{ padding: "20px 24px", display: "flex", flexDirection: "column", gap: 4, border: "none" }}>
                  <div className="skeleton-line" style={{ width: "20%", height: 32, marginBottom: 6 }} />
                  <div className="skeleton-line" style={{ width: "40%", height: 10, marginTop: 6 }} />
                  <div className="skeleton-line" style={{ width: "60%", height: 12, marginTop: 4 }} />
                </div>
              ))}
            </div>
            
            {/* Split Columns */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 340px", gap: 16 }}>
              {/* Left Column (My Tasks) */}
              <div className="card-depth" style={{ padding: 24, border: "none" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
                  <div className="skeleton-line" style={{ width: 80, height: 14 }} />
                  <div className="skeleton-line" style={{ width: 180, height: 12 }} />
                </div>
                
                <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", paddingBottom: 10, borderBottom: "1px solid #f3f4f6", gap: 16 }}>
                  {[1, 2, 3, 4, 5].map(i => (
                    <div key={i} className="skeleton-line" style={{ width: "60%", height: 10 }} />
                  ))}
                </div>
                
                {[1, 2, 3, 4, 5].map(i => (
                  <div key={i} style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 16, padding: "14px 0", borderBottom: i !== 5 ? "1px solid #f9fafb" : "none", alignItems: "center" }}>
                    <div className="skeleton-line" style={{ width: "80%", height: 13 }} />
                    <div className="skeleton-line" style={{ width: "60%", height: 13 }} />
                    <div className="skeleton-line" style={{ width: 60, height: 20, borderRadius: 4 }} />
                    <div className="skeleton-line" style={{ width: "50%", height: 13 }} />
                    <div className="skeleton-line" style={{ width: "40%", height: 13 }} />
                  </div>
                ))}
              </div>

              {/* Right Column (Upcoming Bookings) */}
              <div className="card-depth" style={{ padding: 24, border: "none" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
                  <div className="skeleton-line" style={{ width: 120, height: 14 }} />
                  <div className="skeleton-line" style={{ width: 60, height: 12 }} />
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  {[1, 2, 3].map((i) => (
                    <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 0", borderBottom: i !== 3 ? "1px solid #f9fafb" : "none" }}>
                      <div style={{ width: "70%" }}>
                        <div className="skeleton-line" style={{ width: "90%", height: 13, marginBottom: 6 }} />
                        <div className="skeleton-line" style={{ width: "50%", height: 12 }} />
                      </div>
                      <div className="skeleton-line" style={{ width: 60, height: 20, borderRadius: 4 }} />
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </>
        )}

        {/* VARIANT: RESEARCHER-PROJECTS */}
        {variant === "researcher-projects" && (
          <>
            {/* Filter Tabs */}
            <div style={{ display: "inline-flex", gap: 4, marginBottom: 20 }}>
              <div className="skeleton-line" style={{ width: 60, height: 32, borderRadius: 4 }} />
              <div className="skeleton-line" style={{ width: 70, height: 32, borderRadius: 4 }} />
              <div className="skeleton-line" style={{ width: 80, height: 32, borderRadius: 4 }} />
            </div>
            
            {/* Project Grid */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))", gap: 18 }}>
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <div key={i} className="card-depth" style={{ padding: 20, display: "flex", flexDirection: "column", gap: 12, border: "none" }}>
                  {/* Card Top */}
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <div className="skeleton-line" style={{ width: 60, height: 18, borderRadius: 4 }} />
                    <div className="skeleton-line" style={{ width: 110, height: 26, borderRadius: 4 }} />
                  </div>
                  
                  {/* Card Body */}
                  <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 6, marginTop: 4 }}>
                    <div className="skeleton-line" style={{ width: "50%", height: 18, marginBottom: 4 }} />
                    <div className="skeleton-line" style={{ width: "90%", height: 13 }} />
                    <div className="skeleton-line" style={{ width: "70%", height: 13 }} />
                    
                    <div className="skeleton-line" style={{ width: 100, height: 18, borderRadius: 4, marginTop: 6 }} />
                  </div>
                  
                  {/* Card Footer */}
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", paddingTop: 12, borderTop: "1px solid #f3f4f6", marginTop: 12 }}>
                    <div className="skeleton-line" style={{ width: 80, height: 14 }} />
                    <div className="skeleton-line" style={{ width: 60, height: 14 }} />
                  </div>
                </div>
              ))}
            </div>
          </>
        )}

        {/* VARIANT: RESEARCHER-TASKS */}
        {variant === "researcher-tasks" && (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16, alignItems: "flex-start" }}>
            {[1, 2, 3, 4].map((col) => (
              <div key={col} className="card-depth" style={{ background: "#ffffff", padding: "16px", minHeight: 450, display: "flex", flexDirection: "column", border: "none" }}>
                {/* Column Header */}
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14, paddingBottom: 10, borderBottom: "1px solid #eeeeee" }}>
                  <div className="skeleton-line" style={{ width: 80, height: 14 }} />
                  <div className="skeleton-line" style={{ width: 20, height: 16, borderRadius: 10 }} />
                </div>
                
                {/* Task List (Simulate 1-2 tasks per column) */}
                <div style={{ display: "flex", flexDirection: "column", gap: 10, flex: 1 }}>
                  {[1, 2].slice(0, col % 3 === 0 ? 1 : 2).map((task) => (
                    <div key={task} style={{ background: "#ffffff", border: "1px solid #f3f4f6", borderRadius: 4, padding: "14px 16px" }}>
                      {/* Task Top */}
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                        <div className="skeleton-line" style={{ width: 60, height: 12 }} />
                        <div className="skeleton-line" style={{ width: 40, height: 14, borderRadius: 3 }} />
                      </div>
                      
                      {/* Task Body */}
                      <div className="skeleton-line" style={{ width: "80%", height: 16, marginBottom: 6 }} />
                      <div className="skeleton-line" style={{ width: "100%", height: 12, marginBottom: 4 }} />
                      <div className="skeleton-line" style={{ width: "60%", height: 12, marginBottom: 12 }} />
                      
                      {/* Task Bottom */}
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", paddingTop: 10, borderTop: "1px solid #f5f5f5" }}>
                        <div className="skeleton-line" style={{ width: 70, height: 12 }} />
                        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                          <div className="skeleton-line" style={{ width: 60, height: 20, borderRadius: 3 }} />
                          <div className="skeleton-line" style={{ width: 24, height: 24, borderRadius: 12 }} />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* VARIANT: RESEARCHER-RESOURCES */}
        {variant === "researcher-resources" && (
          <>
            {/* Filter Tabs */}
            <div style={{ display: "flex", gap: 6, marginBottom: 20 }}>
              <div className="skeleton-line" style={{ width: 140, height: 36, borderRadius: 6 }} />
              <div className="skeleton-line" style={{ width: 130, height: 36, borderRadius: 6 }} />
            </div>
            
            {/* Resources Grid */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 16 }}>
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <div key={i} className="card-depth" style={{ padding: 20, display: "flex", flexDirection: "column", gap: 8, border: "none" }}>
                  {/* Card Top */}
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
                    <div className="skeleton-line" style={{ width: 60, height: 14 }} />
                    <div className="skeleton-line" style={{ width: 70, height: 16, borderRadius: 4 }} />
                  </div>
                  
                  {/* Title & Desc */}
                  <div className="skeleton-line" style={{ width: "90%", height: 20, marginBottom: 4 }} />
                  <div className="skeleton-line" style={{ width: "100%", height: 14 }} />
                  <div className="skeleton-line" style={{ width: "80%", height: 14, marginBottom: 4 }} />
                  
                  {/* Meta */}
                  <div className="skeleton-line" style={{ width: "60%", height: 14 }} />
                  <div className="skeleton-line" style={{ width: "40%", height: 14 }} />
                  
                  {/* Book Button */}
                  <div className="skeleton-line" style={{ width: "100%", height: 36, borderRadius: 6, marginTop: 8 }} />
                </div>
              ))}
            </div>
          </>
        )}

        {/* VARIANT: RESEARCHER-CHAT */}
        {variant === "researcher-chat" && (
          <div style={{ display: "grid", gridTemplateColumns: "300px 1fr", gap: 16, height: "calc(100vh - 120px)", minHeight: 600 }}>
            {/* Left sidebar */}
            <div className="card-depth" style={{ padding: 0, border: "none", display: "flex", flexDirection: "column" }}>
              <div style={{ padding: "16px 20px 12px", borderBottom: "1px solid #eeeeee" }}>
                <div className="skeleton-line" style={{ width: 120, height: 11 }} />
              </div>
              <div style={{ padding: "16px 20px", display: "flex", flexDirection: "column", gap: 20 }}>
                {[1, 2, 3].map(i => (
                  <div key={i} style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                    <div className="skeleton-line" style={{ width: "50%", height: 14 }} />
                    <div className="skeleton-line" style={{ width: "80%", height: 12 }} />
                  </div>
                ))}
              </div>
            </div>
            
            {/* Right main area */}
            <div className="card-depth" style={{ padding: 0, border: "none", display: "flex", flexDirection: "column" }}>
              {/* Header */}
              <div style={{ padding: "16px 24px", borderBottom: "1px solid #f3f4f6", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div>
                  <div className="skeleton-line" style={{ width: 140, height: 16, marginBottom: 6 }} />
                  <div className="skeleton-line" style={{ width: 240, height: 12 }} />
                </div>
                <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                  <div className="skeleton-line" style={{ width: 150, height: 28, borderRadius: 14 }} />
                  <div className="skeleton-line" style={{ width: 120, height: 28, borderRadius: 14 }} />
                  <div className="skeleton-line" style={{ width: 140, height: 28, borderRadius: 14 }} />
                </div>
              </div>
              
              {/* Messages area */}
              <div style={{ flex: 1, padding: 24, display: "flex", flexDirection: "column", gap: 24 }}>
                <div style={{ alignSelf: "flex-start", width: "60%" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
                     <div className="skeleton-line" style={{ width: 32, height: 32, borderRadius: "50%" }} />
                     <div className="skeleton-line" style={{ width: 120, height: 12 }} />
                  </div>
                  <div className="skeleton-line" style={{ width: "100%", height: 60, borderRadius: "12px 12px 12px 0", marginLeft: 42 }} />
                </div>
                <div style={{ alignSelf: "flex-end", width: "50%" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8, justifyContent: "flex-end" }}>
                     <div className="skeleton-line" style={{ width: 120, height: 12 }} />
                     <div className="skeleton-line" style={{ width: 32, height: 32, borderRadius: "50%" }} />
                  </div>
                  <div className="skeleton-line" style={{ width: "100%", height: 40, borderRadius: "12px 12px 0 12px", background: "#f3f4f6", marginRight: 42 }} />
                </div>
                <div style={{ alignSelf: "flex-start", width: "70%" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
                     <div className="skeleton-line" style={{ width: 32, height: 32, borderRadius: "50%" }} />
                     <div className="skeleton-line" style={{ width: 120, height: 12 }} />
                  </div>
                  <div className="skeleton-line" style={{ width: "100%", height: 80, borderRadius: "12px 12px 12px 0", marginLeft: 42 }} />
                </div>
              </div>
              
              {/* Input area */}
              <div style={{ padding: "16px 24px" }}>
                <div className="skeleton-line" style={{ width: "100%", height: 44, borderRadius: 22 }} />
              </div>
            </div>
          </div>
        )}

        {/* VARIANT: RESEARCHER-AI-SUMMARIES */}
        {variant === "researcher-ai-summaries" && (
          <div style={{ display: "grid", gridTemplateColumns: "minmax(220px, 1fr) minmax(0, 2fr)", gap: 16 }}>
            {/* List */}
            <div style={{ display: "grid", alignContent: "start", gap: 8 }}>
              {[1, 2, 3, 4].map(i => (
                <div key={i} style={{ padding: 14, background: "#fff", border: "1px solid #e0e0e0", borderRadius: 8 }}>
                  <div className="skeleton-line" style={{ width: "80%", height: 13, marginBottom: 8 }} />
                  <div className="skeleton-line" style={{ width: "50%", height: 11 }} />
                </div>
              ))}
            </div>
            
            {/* Detail */}
            <article style={{ background: "#fff", border: "1px solid #e0e0e0", borderRadius: 10, padding: 20, display: "flex", flexDirection: "column", gap: 16 }}>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                 <div style={{ flex: 1 }}>
                    <div className="skeleton-line" style={{ width: 180, height: 15, marginBottom: 8 }} />
                    <div className="skeleton-line" style={{ width: 120, height: 11, marginBottom: 12 }} />
                 </div>
                 <div className="skeleton-line" style={{ width: 80, height: 26, borderRadius: 6 }} />
              </div>
              
              <div style={{ padding: "12px 14px", background: "#f9f9f9", borderRadius: 8, borderLeft: "3px solid #4f46e5" }}>
                 <div className="skeleton-line" style={{ width: "100%", height: 13, marginBottom: 6 }} />
                 <div className="skeleton-line" style={{ width: "100%", height: 13, marginBottom: 6 }} />
                 <div className="skeleton-line" style={{ width: "80%", height: 13 }} />
              </div>
              
              <div>
                 <div className="skeleton-line" style={{ width: 100, height: 13, marginBottom: 8 }} />
                 <div className="skeleton-line" style={{ width: "90%", height: 13, marginBottom: 6 }} />
                 <div className="skeleton-line" style={{ width: "85%", height: 13 }} />
              </div>
              
              <div style={{ marginTop: 8 }}>
                 <div className="skeleton-line" style={{ width: 110, height: 13, marginBottom: 8 }} />
                 <div className="skeleton-line" style={{ width: "70%", height: 13, marginBottom: 6 }} />
                 <div className="skeleton-line" style={{ width: "60%", height: 13 }} />
              </div>
            </article>
          </div>
        )}

        {/* VARIANT: RESEARCHER-NOTIFICATIONS */}
        {variant === "researcher-notifications" && (
          <div className="card-depth" style={{ padding: "0", border: "none", background: "transparent", boxShadow: "none" }}>
            {/* Custom Header Mock to match "Mark all as read" */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
              <div className="skeleton-line" style={{ width: 180, height: 32, borderRadius: 6 }} />
              <div className="skeleton-line" style={{ width: 110, height: 16, borderRadius: 4 }} />
            </div>
            
            {/* Tabs */}
            <div style={{ display: "flex", gap: 24, borderBottom: "1px solid #f3f4f6", paddingBottom: 12, marginBottom: 24 }}>
              {[1, 2, 3, 4, 5].map(i => (
                <div key={i} className="skeleton-line" style={{ width: [30, 40, 60, 40, 20][i-1], height: 14, borderRadius: 3 }} />
              ))}
            </div>

            {/* Notifications List */}
            <div className="card-depth" style={{ padding: 0, border: "none", overflow: "hidden", display: "flex", flexDirection: "column" }}>
              {[1, 2, 3, 4, 5].map(i => (
                <div key={i} style={{ padding: "20px 24px", borderBottom: i !== 5 ? "1px solid #f3f4f6" : "none", display: "flex", gap: 16 }}>
                  {/* Unread Dot Space + Icon */}
                  <div style={{ display: "flex", alignItems: "center", gap: 12, paddingTop: 2 }}>
                    <div className="skeleton-line" style={{ width: 40, height: 40, borderRadius: "50%" }} />
                  </div>
                  
                  {/* Content */}
                  <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 8 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                      <div className="skeleton-line" style={{ width: 140, height: 16, borderRadius: 4 }} />
                      <div className="skeleton-line" style={{ width: 80, height: 12, borderRadius: 3 }} />
                    </div>
                    <div className="skeleton-line" style={{ width: "60%", height: 14, borderRadius: 4 }} />
                    <div className="skeleton-line" style={{ width: 120, height: 22, borderRadius: 6, marginTop: 4 }} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* VARIANT: MANAGER-OVERVIEW */}
        {variant === "manager-overview" && (
          <div style={{ padding: "0" }}>
            {/* Header */}
            <div style={{ marginBottom: 24 }}>
              <div className="skeleton-line" style={{ width: 220, height: 28, marginBottom: 6, borderRadius: 6 }} />
              <div className="skeleton-line" style={{ width: 180, height: 14, borderRadius: 4 }} />
            </div>

            {/* Stat Cards */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16, marginBottom: 24 }}>
              {[1, 2, 3, 4].map(i => (
                <div key={i} style={{ background: "#fff", border: "1px solid #e8e8e8", borderRadius: 8, padding: "20px 24px", display: "flex", flexDirection: "column", gap: 0 }}>
                  <div className="skeleton-line" style={{ width: 32, height: 32, borderRadius: 6 }} />
                  <div className="skeleton-line" style={{ width: "50%", height: 10, marginTop: 10, borderRadius: 3 }} />
                  <div className="skeleton-line" style={{ width: "35%", height: 12, marginTop: 6, borderRadius: 3 }} />
                </div>
              ))}
            </div>

            {/* Recent Assets Table */}
            <div style={{ background: "#fff", border: "1px solid #e8e8e8", borderRadius: 8, padding: 24 }}>
              <div className="skeleton-line" style={{ width: 100, height: 16, marginBottom: 20, borderRadius: 4 }} />
              <table style={{ width: "100%", borderCollapse: "collapse", tableLayout: "fixed" }}>
                <thead>
                  <tr>
                    <th style={{ width: "45%", paddingBottom: 10, borderBottom: "1px solid #f0f0f0", textAlign: "left" }}><div className="skeleton-line" style={{ width: 50, height: 10, borderRadius: 2 }} /></th>
                    <th style={{ width: "15%", paddingBottom: 10, borderBottom: "1px solid #f0f0f0", textAlign: "left" }}><div className="skeleton-line" style={{ width: 40, height: 10, borderRadius: 2 }} /></th>
                    <th style={{ width: "25%", paddingBottom: 10, borderBottom: "1px solid #f0f0f0", textAlign: "left" }}><div className="skeleton-line" style={{ width: 60, height: 10, borderRadius: 2 }} /></th>
                    <th style={{ width: "15%", paddingBottom: 10, borderBottom: "1px solid #f0f0f0", textAlign: "left" }}><div className="skeleton-line" style={{ width: 40, height: 10, borderRadius: 2 }} /></th>
                  </tr>
                </thead>
                <tbody>
                  {[1, 2, 3, 4, 5, 6].map(i => (
                    <tr key={i}>
                      <td style={{ padding: "10px 0", borderBottom: "1px solid #f8f8f8" }}>
                        <div className="skeleton-line" style={{ width: ["80%", "70%", "85%", "75%", "90%", "65%"][i-1], height: 14, borderRadius: 4 }} />
                      </td>
                      <td style={{ padding: "10px 0", borderBottom: "1px solid #f8f8f8" }}>
                        <div className="skeleton-line" style={{ width: ["50%", "70%", "60%", "70%", "50%", "70%"][i-1], height: 14, borderRadius: 4 }} />
                      </td>
                      <td style={{ padding: "10px 0", borderBottom: "1px solid #f8f8f8" }}>
                        <div className="skeleton-line" style={{ width: ["70%", "80%", "60%", "90%", "60%", "80%"][i-1], height: 14, borderRadius: 4 }} />
                      </td>
                      <td style={{ padding: "10px 0", borderBottom: "1px solid #f8f8f8" }}>
                        <div className="skeleton-line" style={{ width: 65, height: 18, borderRadius: 4 }} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* VARIANT: MANAGER-ASSETS */}
        {variant === "manager-assets" && (
          <div style={{ padding: "0" }}>
            {/* Header */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 24 }}>
              <div>
                <div className="skeleton-line" style={{ width: 140, height: 28, marginBottom: 8, borderRadius: 6 }} />
                <div className="skeleton-line" style={{ width: 120, height: 14, borderRadius: 4 }} />
              </div>
              <div className="skeleton-line" style={{ width: 100, height: 38, borderRadius: 6 }} />
            </div>

            {/* Asset Table */}
            <div style={{ background: "#fff", border: "1px solid #e8e8e8", borderRadius: 8, overflow: "hidden" }}>
              {/* Table Header */}
              <div style={{ display: "grid", gridTemplateColumns: "2fr 100px 1fr 120px 80px 100px", gap: 0, padding: "12px 20px", borderBottom: "1px solid #f0f0f0", background: "#fafafa" }}>
                {["100px", "50px", "70px", "60px", "60px", "60px"].map((w, idx) => (
                  <div key={idx} className="skeleton-line" style={{ width: w, height: 10, borderRadius: 2 }} />
                ))}
              </div>
              {/* Table Rows */}
              {[1, 2, 3, 4, 5, 6].map(i => (
                <div key={i} style={{ display: "grid", gridTemplateColumns: "2fr 100px 1fr 120px 80px 100px", gap: 0, padding: "14px 20px", borderBottom: i !== 6 ? "1px solid #f8f8f8" : "none", alignItems: "center" }}>
                  <div style={{ paddingRight: 16 }}>
                    <div className="skeleton-line" style={{ width: ["80%", "70%", "85%", "75%", "90%", "65%"][i-1], height: 16, borderRadius: 4, marginBottom: 6 }} />
                    <div className="skeleton-line" style={{ width: ["60%", "90%", "50%", "80%", "70%", "90%"][i-1], height: 12, borderRadius: 3 }} />
                  </div>
                  <div>
                    <div className="skeleton-line" style={{ width: ["40%", "70%", "60%", "50%", "40%", "60%"][i-1], height: 14, borderRadius: 3 }} />
                  </div>
                  <div>
                    <div className="skeleton-line" style={{ width: ["80%", "60%", "90%", "70%", "50%", "80%"][i-1], height: 14, borderRadius: 3 }} />
                  </div>
                  <div>
                    <div className="skeleton-line" style={{ width: 70, height: 20, borderRadius: 4 }} />
                  </div>
                  <div>
                    <div className="skeleton-line" style={{ width: 30, height: 14, borderRadius: 3 }} />
                  </div>
                  <div>
                    <div className="skeleton-line" style={{ width: 60, height: 14, borderRadius: 3 }} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* VARIANT: MANAGER-BOOKINGS */}
        {variant === "manager-bookings" && (
          <div style={{ padding: "0" }}>
            {/* Header */}
            <div style={{ marginBottom: 20 }}>
              <div className="skeleton-line" style={{ width: 200, height: 28, marginBottom: 6, borderRadius: 6 }} />
              <div className="skeleton-line" style={{ width: 180, height: 14, borderRadius: 4 }} />
            </div>

            {/* Filter Tabs */}
            <div style={{ display: "flex", gap: 6, marginBottom: 20 }}>
              {[1, 2, 3, 4].map(i => (
                <div key={i} className="skeleton-line" style={{ width: [70, 90, 100, 80][i-1], height: 28, borderRadius: 5 }} />
              ))}
            </div>

            {/* Bookings List */}
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {[1, 2, 3, 4, 5].map(i => (
                <div key={i} style={{ background: "#fff", border: "1px solid #e8e8e8", borderRadius: 8, padding: 18 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16 }}>
                    <div style={{ flex: 1, paddingRight: 24 }}>
                      {/* Resource Name */}
                      <div className="skeleton-line" style={{ width: ["45%", "65%", "50%", "75%", "55%"][i-1], height: 16, marginBottom: 8, borderRadius: 4 }} />
                      {/* User & Purpose */}
                      <div className="skeleton-line" style={{ width: ["25%", "35%", "20%", "40%", "30%"][i-1], height: 12, marginBottom: 6, borderRadius: 3 }} />
                      <div className="skeleton-line" style={{ width: ["35%", "45%", "30%", "50%", "40%"][i-1], height: 12, borderRadius: 3 }} />
                    </div>
                    {/* Status Badge */}
                    <div className="skeleton-line" style={{ width: [75, 85, 70, 90, 80][i-1], height: 22, borderRadius: 4, flexShrink: 0 }} />
                  </div>
                  
                  {/* Time Row (with mocked emoji space) */}
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
                    <div className="skeleton-line" style={{ width: 14, height: 14, borderRadius: "50%" }} />
                    <div className="skeleton-line" style={{ width: ["40%", "30%", "45%", "35%", "50%"][i-1], height: 12, borderRadius: 3 }} />
                  </div>

                  {/* Location Row (with mocked emoji space) */}
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
                    <div className="skeleton-line" style={{ width: 14, height: 14, borderRadius: "50%" }} />
                    <div className="skeleton-line" style={{ width: ["25%", "35%", "20%", "40%", "30%"][i-1], height: 12, borderRadius: 3 }} />
                  </div>

                  {/* Action Button (only on some cards) */}
                  {i % 2 !== 0 && (
                    <div style={{ marginTop: 8 }}>
                      <div className="skeleton-line" style={{ width: 140, height: 28, borderRadius: 4, background: "transparent", border: "1px solid #e8e8e8" }} />
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* VARIANT: MANAGER-MAINTENANCE */}
        {variant === "manager-maintenance" && (
          <div style={{ padding: "0" }}>
            {/* Header row */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 28 }}>
              <div>
                <div className="skeleton-line" style={{ width: 340, height: 32, marginBottom: 10, borderRadius: 6 }} />
                <div className="skeleton-line" style={{ width: 480, height: 16, borderRadius: 4 }} />
              </div>
              <div className="skeleton-line" style={{ width: 220, height: 40, borderRadius: 4 }} />
            </div>

            {/* Stat Grid */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16, marginBottom: 24 }}>
              {[1, 2, 3].map(i => (
                <div key={i} style={{ background: "#fff", border: "1px solid #e8e8e8", borderRadius: 8, padding: 20 }}>
                  <div className="skeleton-line" style={{ width: 120, height: 12, marginBottom: 12, borderRadius: 3 }} />
                  <div className="skeleton-line" style={{ width: 40, height: 32, marginBottom: 12, borderRadius: 4 }} />
                  <div className="skeleton-line" style={{ width: 160, height: 12, borderRadius: 3 }} />
                </div>
              ))}
            </div>

            {/* Filter Bar */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", background: "#fff", padding: "12px 20px", borderRadius: 8, border: "1px solid #e8e8e8", marginBottom: 24 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <div className="skeleton-line" style={{ width: 50, height: 14, borderRadius: 3 }} />
                {[70, 80, 80, 80].map((w, idx) => (
                  <div key={idx} className="skeleton-line" style={{ width: w, height: 28, borderRadius: 4 }} />
                ))}
              </div>
              <div className="skeleton-line" style={{ width: 90, height: 14, borderRadius: 3 }} />
            </div>

            {/* Table Card */}
            <div style={{ background: "#fff", border: "1px solid #e8e8e8", borderRadius: 8 }}>
              {/* Table Header Row */}
              <div style={{ padding: "16px 20px", borderBottom: "1px solid #e8e8e8", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div className="skeleton-line" style={{ width: 300, height: 14, borderRadius: 3 }} />
                <div className="skeleton-line" style={{ width: 180, height: 12, borderRadius: 3 }} />
              </div>
              <div style={{ padding: 20 }}>
                <table style={{ width: "100%", borderCollapse: "collapse" }}>
                  <thead>
                    <tr>
                      <th style={{ textAlign: "left", paddingBottom: 16, borderBottom: "2px solid #f0f0f0", width: "25%" }}>
                        <div className="skeleton-line" style={{ width: 120, height: 12, borderRadius: 3 }} />
                      </th>
                      <th style={{ textAlign: "left", paddingBottom: 16, borderBottom: "2px solid #f0f0f0", width: "15%" }}>
                        <div className="skeleton-line" style={{ width: 100, height: 12, borderRadius: 3 }} />
                      </th>
                      <th style={{ textAlign: "left", paddingBottom: 16, borderBottom: "2px solid #f0f0f0", width: "20%" }}>
                        <div className="skeleton-line" style={{ width: 130, height: 12, borderRadius: 3 }} />
                      </th>
                      <th style={{ textAlign: "left", paddingBottom: 16, borderBottom: "2px solid #f0f0f0", width: "25%" }}>
                        <div className="skeleton-line" style={{ width: 110, height: 12, borderRadius: 3 }} />
                      </th>
                      <th style={{ textAlign: "left", paddingBottom: 16, borderBottom: "2px solid #f0f0f0", width: "10%" }}>
                        <div className="skeleton-line" style={{ width: 50, height: 12, borderRadius: 3 }} />
                      </th>
                      <th style={{ textAlign: "right", paddingBottom: 16, borderBottom: "2px solid #f0f0f0", width: "5%" }}>
                        <div className="skeleton-line" style={{ width: 50, height: 12, borderRadius: 3, marginLeft: "auto" }} />
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {[1, 2, 3, 4, 5].map(i => (
                      <tr key={i}>
                        <td style={{ padding: "16px 0", borderBottom: "1px solid #f5f5f5" }}>
                          <div className="skeleton-line" style={{ width: ["80%", "95%", "70%", "85%", "60%"][i-1], height: 14, marginBottom: 6, borderRadius: 3 }} />
                          <div className="skeleton-line" style={{ width: ["40%", "50%", "35%", "45%", "30%"][i-1], height: 12, borderRadius: 3 }} />
                        </td>
                        <td style={{ padding: "16px 0", borderBottom: "1px solid #f5f5f5" }}>
                          <div className="skeleton-line" style={{ width: 90, height: 14, marginBottom: 6, borderRadius: 3 }} />
                          <div className="skeleton-line" style={{ width: 110, height: 12, borderRadius: 3 }} />
                        </td>
                        <td style={{ padding: "16px 0", borderBottom: "1px solid #f5f5f5" }}>
                          <div className="skeleton-line" style={{ width: ["60%", "70%", "55%", "65%", "50%"][i-1], height: 12, borderRadius: 3 }} />
                        </td>
                        <td style={{ padding: "16px 0", borderBottom: "1px solid #f5f5f5" }}>
                          <div className="skeleton-line" style={{ width: ["90%", "85%", "95%", "80%", "75%"][i-1], height: 12, marginBottom: 4, borderRadius: 3 }} />
                          <div className="skeleton-line" style={{ width: ["60%", "70%", "50%", "55%", "40%"][i-1], height: 12, borderRadius: 3 }} />
                        </td>
                        <td style={{ padding: "16px 0", borderBottom: "1px solid #f5f5f5" }}>
                          <div className="skeleton-line" style={{ width: 75, height: 22, borderRadius: 4 }} />
                        </td>
                        <td style={{ padding: "16px 0", borderBottom: "1px solid #f5f5f5", textAlign: "right" }}>
                          <div className="skeleton-line" style={{ width: 65, height: 24, borderRadius: 4, marginLeft: "auto", border: "1px solid #e8e8e8", background: "transparent" }} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* VARIANT: GRID */}
        {variant === "grid" && (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(clamp(280px, 25vw, 400px), 1fr))", gap: "clamp(16px, 1.5vw, 24px)" }}>
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="card-depth" style={{ padding: "clamp(20px, 2vw, 32px)", gap: "clamp(12px, 1vw, 18px)", display: "flex", flexDirection: "column", border: "none" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 }}>
                  <div style={{ flex: 1 }}>
                    <div className="skeleton-line" style={{ width: "60%", height: "clamp(20px, 1.8vw, 24px)", marginBottom: 12 }} />
                    <div className="skeleton-line" style={{ width: "90%", height: "clamp(12px, 1vw, 14px)", marginBottom: 4 }} />
                    <div className="skeleton-line" style={{ width: "70%", height: "clamp(12px, 1vw, 14px)" }} />
                  </div>
                  <div className="skeleton-line" style={{ width: 60, height: 22, borderRadius: 4, flexShrink: 0, marginLeft: 16 }} />
                </div>
                
                <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 20 }}>
                  <div className="skeleton-line" style={{ width: 80, height: 26, borderRadius: 6 }} />
                  <div className="skeleton-line" style={{ width: 100, height: 26, borderRadius: 6 }} />
                </div>

                <div style={{ marginTop: "auto", borderTop: "1px solid #f3f4f6", paddingTop: 16, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div style={{ display: "flex", gap: 12 }}>
                    <div className="skeleton-line" style={{ width: 40, height: 20 }} />
                    <div className="skeleton-line" style={{ width: 50, height: 20 }} />
                  </div>
                  <div className="skeleton-line" style={{ width: 120, height: 20 }} />
                </div>
              </div>
            ))}
          </div>
        )}

        {/* VARIANT: MANAGER-NOTIFICATIONS */}
        {variant === "manager-notifications" && (
          <div style={{ padding: "0" }}>
            {/* Header row */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 28 }}>
              <div>
                <div className="skeleton-line" style={{ width: 320, height: 32, marginBottom: 10, borderRadius: 6 }} />
                <div className="skeleton-line" style={{ width: 450, height: 16, borderRadius: 4 }} />
              </div>
              <div className="skeleton-line" style={{ width: 140, height: 36, borderRadius: 4, background: "transparent", border: "1px solid #e8e8e8" }} />
            </div>

            {/* Stat Grid */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16, marginBottom: 24 }}>
              {[1, 2, 3, 4].map(i => (
                <div key={i} style={{ background: "#fff", border: "1px solid #e8e8e8", borderRadius: 8, padding: 20 }}>
                  <div className="skeleton-line" style={{ width: ["120px", "130px", "180px", "140px"][i-1], height: 12, marginBottom: 12, borderRadius: 3 }} />
                  <div className="skeleton-line" style={{ width: 30, height: 32, marginBottom: 12, borderRadius: 4 }} />
                  <div className="skeleton-line" style={{ width: ["140px", "160px", "170px", "150px"][i-1], height: 12, borderRadius: 3 }} />
                </div>
              ))}
            </div>

            {/* Filter Bar */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", background: "#fff", padding: "12px 20px", borderRadius: 8, border: "1px solid #e8e8e8", marginBottom: 24 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <div className="skeleton-line" style={{ width: 50, height: 14, borderRadius: 3 }} />
                {[70, 80, 110, 100, 90, 80].map((w, idx) => (
                  <div key={idx} className="skeleton-line" style={{ width: w, height: 28, borderRadius: 4 }} />
                ))}
              </div>
              <div className="skeleton-line" style={{ width: 60, height: 14, borderRadius: 3 }} />
            </div>

            {/* Notifications List Card */}
            <div style={{ background: "#fff", border: "1px solid #e8e8e8", borderRadius: 8, overflow: "hidden" }}>
              <div style={{ display: "flex", flexDirection: "column" }}>
                {[1, 2, 3, 4, 5].map(i => (
                  <div key={i} style={{ padding: "20px 24px", borderBottom: i === 5 ? "none" : "1px solid #e8e8e8", borderLeft: i < 3 ? "3px solid #161616" : "3px solid transparent", background: i < 3 ? "#fdfdfd" : "#fff" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        <div className="skeleton-line" style={{ width: ["110px", "110px", "110px", "90px", "120px"][i-1], height: 22, borderRadius: 4 }} />
                        <div className="skeleton-line" style={{ width: ["240px", "260px", "220px", "180px", "300px"][i-1], height: 16, borderRadius: 4 }} />
                        {i < 3 && <div className="skeleton-line" style={{ width: 8, height: 8, borderRadius: "50%" }} />}
                      </div>
                      <div className="skeleton-line" style={{ width: 40, height: 14, borderRadius: 3 }} />
                    </div>
                    <div className="skeleton-line" style={{ width: ["60%", "75%", "55%", "45%", "80%"][i-1], height: 14, marginBottom: 16, borderRadius: 3 }} />
                    <div style={{ display: "flex", justifyContent: "flex-end", alignItems: "center", gap: 16 }}>
                      <div className="skeleton-line" style={{ width: 120, height: 14, borderRadius: 3 }} />
                      <div className="skeleton-line" style={{ width: 70, height: 14, borderRadius: 3 }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* VARIANT: CHAT */}
        {variant === "chat" && (
          <div style={{ display: "flex", gap: 20, alignItems: "stretch", minHeight: "calc(100vh - 200px)" }}>
            {/* Sidebar (Channels Card) */}
            <div className="card-depth" style={{ width: 320, minWidth: 300, border: "none", padding: 0, display: "flex", flexDirection: "column" }}>
              <div style={{ padding: "16px 20px 12px", borderBottom: "1px solid #eeeeee" }}>
                <div className="skeleton-line" style={{ width: 120, height: 11 }} />
              </div>
              <div style={{ padding: 12 }}>
                {[1, 2, 3, 4, 5].map((i) => (
                  <div key={i} style={{ padding: "14px 12px", display: "flex", flexDirection: "column", gap: 8, borderBottom: i !== 5 ? "1px solid #f9fafb" : "none" }}>
                    <div className="skeleton-line" style={{ width: "60%", height: 14 }} />
                    <div className="skeleton-line" style={{ width: "40%", height: 11 }} />
                  </div>
                ))}
              </div>
            </div>
            
            {/* Main Chat Area (Conversation Card) */}
            <div className="card-depth" style={{ flex: 1, border: "none", padding: 0, display: "flex", flexDirection: "column" }}>
              {/* Header */}
              <div style={{ padding: "16px 24px", borderBottom: "1px solid #eeeeee", background: "#fafafa", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div>
                  <div className="skeleton-line" style={{ width: 150, height: 16, marginBottom: 8 }} />
                  <div className="skeleton-line" style={{ width: 200, height: 12 }} />
                </div>
                <div style={{ display: "flex", gap: 10 }}>
                  <div className="skeleton-line" style={{ width: 150, height: 28, borderRadius: 14 }} />
                  <div className="skeleton-line" style={{ width: 140, height: 28, borderRadius: 14 }} />
                  <div className="skeleton-line" style={{ width: 130, height: 28, borderRadius: 6 }} />
                </div>
              </div>
              
              {/* Messages */}
              <div style={{ flex: 1, padding: "28px 24px 20px", display: "flex", flexDirection: "column", gap: 24, background: "#fafafa" }}>
                <div style={{ display: "flex", gap: 16, maxWidth: "80%" }}>
                  <div className="skeleton-line" style={{ width: 36, height: 36, borderRadius: "50%", flexShrink: 0 }} />
                  <div>
                    <div className="skeleton-line" style={{ width: 100, height: 12, marginBottom: 6 }} />
                    <div className="skeleton-line" style={{ width: 280, height: 60, borderRadius: "16px 16px 16px 2px" }} />
                  </div>
                </div>
                <div style={{ display: "flex", gap: 16, maxWidth: "80%", alignSelf: "flex-end", flexDirection: "row-reverse" }}>
                  <div>
                    <div className="skeleton-line" style={{ width: 60, height: 12, marginBottom: 6, marginLeft: "auto" }} />
                    <div className="skeleton-line" style={{ width: 220, height: 48, borderRadius: "16px 16px 2px 16px" }} />
                  </div>
                </div>
                <div style={{ display: "flex", gap: 16, maxWidth: "80%" }}>
                  <div className="skeleton-line" style={{ width: 36, height: 36, borderRadius: "50%", flexShrink: 0 }} />
                  <div>
                    <div className="skeleton-line" style={{ width: 120, height: 12, marginBottom: 6 }} />
                    <div className="skeleton-line" style={{ width: 340, height: 80, borderRadius: "16px 16px 16px 2px" }} />
                  </div>
                </div>
              </div>
              
              {/* Input Area */}
              <div style={{ padding: "12px 18px", borderTop: "1px solid #e2e8f0", background: "#ffffff", display: "flex", gap: 10 }}>
                <div className="skeleton-line" style={{ flex: 1, height: 40, borderRadius: 20 }} />
                <div className="skeleton-line" style={{ width: 70, height: 40, borderRadius: 20 }} />
              </div>
            </div>
          </div>
        )}

      </div>
    </>
  );
}
