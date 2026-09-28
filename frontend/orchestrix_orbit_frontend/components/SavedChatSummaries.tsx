"use client";

import { useEffect, useState } from "react";
import { SavedSummariesService, type SavedSummary } from "@/lib/services/savedSummaries";

export default function SavedChatSummaries() {
  const [summaries, setSummaries] = useState<SavedSummary[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    SavedSummariesService.list()
      .then((items) => {
        setSummaries(items);
        setSelectedId(items[0]?.id ?? null);
      })
      .catch((err) => setError(err instanceof Error ? err.message : "Could not load summaries."))
      .finally(() => setLoading(false));
  }, []);

  const selected = summaries.find((item) => item.id === selectedId);

  return (
    <section style={{ marginTop: 24 }} aria-label="Saved chat summaries">
      <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 12 }}>Saved chat summaries</h2>
      {loading ? <p>Loading summaries…</p> : error ? <p role="alert">{error}</p> : summaries.length === 0 ? (
        <p>No saved chat summaries yet. Summarize messages in Chat, then choose Add to summaries.</p>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "minmax(220px, 1fr) minmax(0, 2fr)", gap: 16 }}>
          <div style={{ display: "grid", alignContent: "start", gap: 8 }}>
            {summaries.map((item) => (
              <button key={item.id} type="button" onClick={() => setSelectedId(item.id)}
                style={{ textAlign: "left", padding: 14, background: selectedId === item.id ? "#f0f4ff" : "white", border: "1px solid #ddd", borderRadius: 8, cursor: "pointer" }}>
                <strong>{item.title || "Chat summary"}</strong>
                <div style={{ fontSize: 12, color: "#666", marginTop: 5 }}>{new Date(item.processedAt).toLocaleString()} · {item.messageCount} messages</div>
              </button>
            ))}
          </div>
          {selected && <article style={{ background: "white", border: "1px solid #ddd", borderRadius: 8, padding: 20, whiteSpace: "pre-wrap" }}>
            <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 12 }}>{selected.title || "Chat summary"}</h3>
            <p>{selected.summary}</p>
            {selected.keyPoints?.length > 0 && <><h4>Key points</h4><ul>{selected.keyPoints.map((point, i) => <li key={i}>{point}</li>)}</ul></>}
            {selected.actionItems?.length > 0 && <><h4>Action items</h4><ul>{selected.actionItems.map((item, i) => <li key={i}>{item}</li>)}</ul></>}
          </article>}
        </div>
      )}
    </section>
  );
}
