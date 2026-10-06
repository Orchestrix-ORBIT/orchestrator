"use client";

import { useEffect, useState } from "react";
import LoadingState from "@/components/ui/LoadingState";
import { getAiSummaries, deleteAiSummary, type SavedAiSummary } from "@/lib/services/aiSummaries";

export default function SavedChatSummaries() {
  const [summaries, setSummaries] = useState<SavedAiSummary[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  useEffect(() => {
    getAiSummaries()
      .then((items) => {
        setSummaries(items);
        setSelectedId(items[0]?.id ?? null);
      })
      .catch((err) => setError(err instanceof Error ? err.message : "Could not load summaries."))
      .finally(() => setLoading(false));
  }, []);

  // Re-fetch when a new summary is saved/deleted (event dispatched by service)
  useEffect(() => {
    const handler = () => {
      getAiSummaries().then((items) => {
        setSummaries(items);
        if (!selectedId && items.length > 0) setSelectedId(items[0].id);
      }).catch(() => {});
    };
    window.addEventListener("ai_summaries_updated", handler);
    return () => window.removeEventListener("ai_summaries_updated", handler);
  }, [selectedId]);

  async function handleDelete(id: string) {
    setDeletingId(id);
    try {
      await deleteAiSummary(id);
      setSummaries((prev) => {
        const next = prev.filter((s) => s.id !== id);
        // Auto-select the next/previous item
        if (selectedId === id) {
          const idx = prev.findIndex((s) => s.id === id);
          const nextItem = next[idx] ?? next[idx - 1] ?? null;
          setSelectedId(nextItem?.id ?? null);
        }
        return next;
      });
      setConfirmDeleteId(null);
    } catch (err) {
      alert("Failed to delete summary: " + err);
    } finally {
      setDeletingId(null);
    }
  }

  const selected = summaries.find((item) => item.id === selectedId);

  if (loading) return <LoadingState variant="researcher-ai-summaries" title="Loading Summaries..." subtitle="Fetching your saved AI chat summaries" />;

  if (error) return (
    <section style={{ marginTop: 24 }}>
      <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 12 }}>Saved chat summaries</h2>
      <div style={{ padding: "16px 20px", background: "#fff3e0", border: "1px solid #ffb74d", borderRadius: 8, color: "#e65100", fontSize: 13 }}>
        ⚠️ Could not load summaries: {error}
      </div>
    </section>
  );

  return (
    <section style={{ marginTop: 24 }} aria-label="Saved chat summaries">
      <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 12 }}>Saved chat summaries</h2>
      {summaries.length === 0 ? (
        <div style={{ padding: "32px 24px", background: "#fafafa", border: "1px dashed #e0e0e0", borderRadius: 10, textAlign: "center", color: "#9e9e9e" }}>
          <div style={{ fontSize: 32, marginBottom: 10 }}>📄</div>
          <p style={{ fontSize: 14, fontWeight: 600, color: "#424242", margin: 0 }}>No summaries yet</p>
          <p style={{ fontSize: 12, margin: "6px 0 0" }}>Summarize messages in Chat, then click <strong>&quot;Add to AI Summaries&quot;</strong> to save them here.</p>
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "minmax(220px, 1fr) minmax(0, 2fr)", gap: 16 }}>
          {/* List */}
          <div style={{ display: "grid", alignContent: "start", gap: 8 }}>
            {summaries.map((item) => (
              <div
                key={item.id}
                style={{
                  position: "relative",
                  textAlign: "left", padding: 14,
                  background: selectedId === item.id ? "#f0f4ff" : "#fff",
                  border: selectedId === item.id ? "1px solid #a5b4fc" : "1px solid #e0e0e0",
                  borderRadius: 8, transition: "all 0.1s",
                  cursor: "pointer",
                }}
                onClick={() => setSelectedId(item.id)}
              >
                <strong style={{ fontSize: 13, color: "#161616", display: "block", marginBottom: 4, paddingRight: 28 }}>
                  {item.topic || "Chat Summary"}
                </strong>
                <div style={{ fontSize: 11, color: "#9e9e9e" }}>
                  {item.date} · {item.messageCount ?? 0} messages
                </div>


                {/* Delete button */}
                {confirmDeleteId === item.id ? (
                  <div
                    style={{ position: "absolute", top: 8, right: 8, display: "flex", gap: 4 }}
                    onClick={(e) => e.stopPropagation()}
                  >
                    <button
                      onClick={() => handleDelete(item.id)}
                      disabled={deletingId === item.id}
                      style={{ fontSize: 10, padding: "2px 7px", background: "#dc2626", color: "#fff", border: "none", borderRadius: 4, cursor: "pointer", fontWeight: 700 }}
                    >{deletingId === item.id ? "…" : "Yes"}</button>
                    <button
                      onClick={() => setConfirmDeleteId(null)}
                      style={{ fontSize: 10, padding: "2px 7px", background: "#f5f5f5", color: "#161616", border: "1px solid #d0d0d0", borderRadius: 4, cursor: "pointer" }}
                    >No</button>
                  </div>
                ) : (
                  <button
                    onClick={(e) => { e.stopPropagation(); setConfirmDeleteId(item.id); }}
                    title="Delete summary"
                    style={{
                      position: "absolute", top: 8, right: 8,
                      background: "none", border: "none", cursor: "pointer",
                      color: "#c4c4c4", fontSize: 13, padding: 2, lineHeight: 1, borderRadius: 4,
                      transition: "color 0.15s",
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.color = "#dc2626")}
                    onMouseLeave={(e) => (e.currentTarget.style.color = "#c4c4c4")}
                  >🗑</button>
                )}
              </div>
            ))}
          </div>

          {/* Detail */}
          {selected && (
            <article style={{ background: "#fff", border: "1px solid #e0e0e0", borderRadius: 10, padding: 20, display: "flex", flexDirection: "column", gap: 16 }}>
              <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12 }}>
                <div style={{ flex: 1 }}>
                  <h3 style={{ fontSize: 15, fontWeight: 700, color: "#161616", margin: "0 0 6px" }}>{selected.topic || "Chat Summary"}</h3>
                  <div style={{ fontSize: 11, color: "#9e9e9e", marginBottom: 12 }}>{selected.date} · {selected.model}</div>
                  <p style={{ fontSize: 13, lineHeight: 1.7, color: "#424242", margin: 0, padding: "12px 14px", background: "#f9f9f9", borderRadius: 8, borderLeft: "3px solid #4f46e5" }}>
                    {selected.summary}
                  </p>
                </div>
                <button
                  onClick={() => {
                    if (window.confirm("Delete this summary permanently? This cannot be undone.")) {
                      handleDelete(selected.id);
                    }
                  }}
                  disabled={deletingId === selected.id}
                  title="Delete summary"
                  style={{ flexShrink: 0, background: "#fff", border: "1px solid #fca5a5", borderRadius: 6, padding: "5px 10px", fontSize: 12, fontWeight: 600, color: "#dc2626", cursor: "pointer", whiteSpace: "nowrap" }}
                >
                  {deletingId === selected.id ? "Deleting…" : "🗑 Delete"}
                </button>
              </div>

              {selected.keyFindings?.length > 0 && (
                <div>
                  <h4 style={{ fontSize: 13, fontWeight: 700, color: "#161616", margin: "0 0 8px" }}>🔑 Key Points</h4>
                  <ul style={{ margin: 0, paddingLeft: 20, display: "flex", flexDirection: "column", gap: 4 }}>
                    {selected.keyFindings.map((point, i) => (
                      <li key={i} style={{ fontSize: 13, color: "#424242", lineHeight: 1.5 }}>{point}</li>
                    ))}
                  </ul>
                </div>
              )}
              {selected.actionItems?.length > 0 && (
                <div>
                  <h4 style={{ fontSize: 13, fontWeight: 700, color: "#161616", margin: "0 0 8px" }}>✅ Action Items</h4>
                  <ul style={{ margin: 0, paddingLeft: 20, display: "flex", flexDirection: "column", gap: 4 }}>
                    {selected.actionItems.map((item, i) => (
                      <li key={i} style={{ fontSize: 13, color: "#424242", lineHeight: 1.5 }}>{item}</li>
                    ))}
                  </ul>
                </div>
              )}
            </article>
          )}
        </div>
      )}
    </section>
  );
}
