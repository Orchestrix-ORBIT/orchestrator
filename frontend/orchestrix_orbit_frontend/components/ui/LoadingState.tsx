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
    <div
      style={{
        padding: "100px 20px",
        textAlign: "center",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <div
        style={{
          width: 36,
          height: 36,
          border: "3px solid #e5e7eb",
          borderTop: "3px solid #161616",
          borderRadius: "50%",
          animation: "spin 0.8s linear infinite",
          marginBottom: 16,
        }}
      />
      <p style={{ fontSize: 14, color: "#161616", fontWeight: 600, margin: 0 }}>
        {title}
      </p>
      {subtitle && (
        <p style={{ fontSize: 12, color: "#888888", margin: 0, marginTop: 4 }}>
          {subtitle}
        </p>
      )}
    </div>
  );
}
