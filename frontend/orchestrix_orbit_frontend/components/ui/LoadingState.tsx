"use client";

import React from "react";

interface LoadingStateProps {
  title?: string;
  subtitle?: string;
}

export default function LoadingState({
  title = "Loading Workspace Data…",
  subtitle = "Fetching latest updates and workspace state",
}: LoadingStateProps) {
  return (
    <>
      <style>{`
        @keyframes ls-spin {
          0%   { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        @keyframes ls-pulse {
          0%, 100% { opacity: 1; }
          50%       { opacity: 0.4; }
        }
        .ls-ring {
          animation: ls-spin 0.85s linear infinite;
        }
        .ls-dot1 { animation: ls-pulse 1.4s ease-in-out 0s    infinite; }
        .ls-dot2 { animation: ls-pulse 1.4s ease-in-out 0.2s  infinite; }
        .ls-dot3 { animation: ls-pulse 1.4s ease-in-out 0.4s  infinite; }
      `}</style>

      <div
        style={{
          position: "absolute",
          inset: 0,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          background: "#ffffff",
          zIndex: 50,
          minHeight: "100%",
        }}
      >
        {/* Spinner ring */}
        <div style={{ position: "relative", width: 52, height: 52, marginBottom: 24 }}>
          {/* Outer track */}
          <div
            style={{
              position: "absolute",
              inset: 0,
              borderRadius: "50%",
              border: "3px solid #e5e7eb",
            }}
          />
          {/* Spinning arc */}
          <div
            className="ls-ring"
            style={{
              position: "absolute",
              inset: 0,
              borderRadius: "50%",
              border: "3px solid transparent",
              borderTopColor: "#161616",
              borderRightColor: "#161616",
            }}
          />
          {/* Inner dot */}
          <div
            style={{
              position: "absolute",
              inset: "12px",
              borderRadius: "50%",
              background: "#f3f4f6",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <div
              style={{
                width: 8,
                height: 8,
                borderRadius: "50%",
                background: "#161616",
              }}
            />
          </div>
        </div>

        {/* Title */}
        <p
          style={{
            fontSize: 15,
            fontWeight: 700,
            color: "#161616",
            margin: 0,
            letterSpacing: "-0.2px",
          }}
        >
          {title}
        </p>

        {/* Subtitle */}
        {subtitle && (
          <p
            style={{
              fontSize: 12,
              color: "#888888",
              margin: 0,
              marginTop: 6,
              maxWidth: 320,
              textAlign: "center",
              lineHeight: 1.5,
            }}
          >
            {subtitle}
          </p>
        )}

        {/* Animated dots */}
        <div
          style={{
            display: "flex",
            gap: 6,
            marginTop: 20,
          }}
        >
          {(["ls-dot1", "ls-dot2", "ls-dot3"] as const).map((cls) => (
            <div
              key={cls}
              className={cls}
              style={{
                width: 6,
                height: 6,
                borderRadius: "50%",
                background: "#9ca3af",
              }}
            />
          ))}
        </div>
      </div>
    </>
  );
}
