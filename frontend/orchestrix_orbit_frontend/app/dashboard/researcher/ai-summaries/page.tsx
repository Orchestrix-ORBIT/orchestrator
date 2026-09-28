"use client";

import Link from "next/link";
import SavedChatSummaries from "@/components/SavedChatSummaries";

export default function AiSummariesPage() {
  return (
    <div style={{ padding: 24 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 16 }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 700 }}>AI Summaries</h1>
          <p>Review saved chat summaries, key points, and action items.</p>
        </div>
        <Link href="/dashboard/researcher/chat" style={{ padding: "10px 16px", background: "#161616", color: "white", borderRadius: 6, textDecoration: "none" }}>
          Summarize Chat Range →
        </Link>
      </div>
      <SavedChatSummaries />
    </div>
  );
}
