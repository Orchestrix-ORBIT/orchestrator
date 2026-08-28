"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useWebSocketChat } from "@/lib/useWebSocketChat";
import { getEmail, getTenantSlug } from "@/lib/auth";
import { summarizeMessages, SummaryResult } from "@/lib/services/summarize";

interface Channel {
  id: string;
  projectId: string;
  name: string;
}

export default function ChatPage() {
  const [projects, setProjects] = useState<any[]>([]);
  const [teamMembers, setTeamMembers] = useState<any[]>([]);
  const [activeChannelId, setActiveChannelId] = useState<string>("");
  const [inputValue, setInputValue] = useState("");

  // ── Summarization state ──────────────────────────────────────────────────
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [summarizing, setSummarizing] = useState(false);
  const [summaryResult, setSummaryResult] = useState<SummaryResult | null>(null);
  const [summaryError, setSummaryError] = useState<string | null>(null);

  const currentUserEmail = getEmail() || "Researcher";

  useEffect(() => {
    const tenant = getTenantSlug() || "myorg";

    fetch("http://localhost:8080/api/projects", {
      headers: { "X-Tenant-ID": tenant },
    })
      .then((res) => (res.ok ? res.json() : []))
      .then((data) => {
        setProjects(data);
        if (data && data.length > 0) {
          setActiveChannelId(data[0].id);
        }
      })
      .catch((err) => console.warn("Could not fetch projects:", err));

    fetch("http://localhost:8080/api/team", {
      headers: { "X-Tenant-ID": tenant },
    })
      .then((res) => (res.ok ? res.json() : []))
      .then((data) => setTeamMembers(data))
      .catch((err) => console.warn("Could not fetch team members:", err));
  }, []);

  const activeProject = projects.find((p) => p.id === activeChannelId) || projects[0];
  const activeProjectId = activeProject ? activeProject.id : "";

  const { messages: liveMessages, isConnected, sendMessage } = useWebSocketChat(activeProjectId);

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputValue.trim() || !activeProjectId) return;
    sendMessage(inputValue, currentUserEmail);
    setInputValue("");
  };

  // ── Summarization handlers ────────────────────────────────────────────────
  const handleToggleSelectionMode = () => {
    setSelectionMode((prev) => !prev);
    setSelectedIds(new Set());
    setSummaryResult(null);
    setSummaryError(null);
  };

  const handleToggleMessageSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const handleSummarize = async () => {
    if (selectedIds.size === 0) return;
    const selected = liveMessages
      .filter((m) => selectedIds.has(m.id))
      .map((m) => ({
        senderName: m.senderName || "Researcher",
        content: m.content,
        createdAt: m.createdAt,
      }));

    setSummarizing(true);
    setSummaryError(null);
    setSummaryResult(null);
    try {
      const result = await summarizeMessages(
        selected,
        activeProjectId,
        getTenantSlug() || "myorg"
      );
      setSummaryResult(result);
      setSelectionMode(false);
      setSelectedIds(new Set());
    } catch (err: any) {
      setSummaryError(err.message ?? "Summarization failed. Is the Context Engine running?");
    } finally {
      setSummarizing(false);
    }
  };

  const allDisplayMessages = liveMessages.map((m) => ({
    id: m.id,
    senderName: m.senderName || "Researcher",
    initials: (m.senderName || "R").substring(0, 2).toUpperCase(),
    createdAt: m.createdAt ? new Date(m.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : "Just now",
    content: m.content,
  }));

  const channels: Channel[] = projects.map((p) => ({
    id: p.id,
    projectId: p.id,
    name: `#${p.name.toLowerCase().replace(/\s+/g, "-")}`,
  }));

  return (
    <div style={s.root}>
      {/* ── Channels sidebar ─────────────────────────────────────────────── */}
      <aside style={s.channelsSidebar}>
        <h2 style={s.channelsTitle}>Channels ({channels.length})</h2>
        <div style={s.channelList}>
          {channels.length === 0 ? (
            <div style={{ padding: "20px 16px", fontSize: 12, color: "#9e9e9e", textAlign: "center" }}>
              No active project rooms in database.
            </div>
          ) : (
            channels.map((ch) => (
              <button
                key={ch.id}
                id={ch.id}
                style={{
                  ...s.channelItem,
                  ...(activeChannelId === ch.id ? s.channelItemActive : {}),
                }}
                onClick={() => setActiveChannelId(ch.id)}
              >
                <div style={s.channelTop}>
                  <span style={s.channelName}>{ch.name}</span>
                </div>
              </button>
            ))
          )}
        </div>
      </aside>

      {/* ── Chat area ────────────────────────────────────────────────────── */}
      <div style={s.chatArea}>
        {/* Chat header */}
        <div style={s.chatHeader}>
          <div style={s.chatHeaderLeft}>
            <span style={s.chatChannelName}>{activeProject ? activeProject.name : "No Channel Selected"}</span>
            <span style={s.encryptedBadge}>
              <span style={{ fontSize: 8, color: isConnected ? "#2e7d32" : "#ed6c02", marginRight: 5 }}>●</span>
              {isConnected ? "STOMP WebSocket Live" : "Connecting..."}
            </span>
          </div>
          <button
            id="btn-summarize-ai"
            style={{
              ...s.summarizeBtn,
              ...(selectionMode ? { background: "#161616", color: "#fff", borderColor: "#161616" } : {}),
            }}
            onClick={handleToggleSelectionMode}
          >
            {selectionMode ? "✕ Cancel Selection" : "⚡ Summarize with AI"}
          </button>
        </div>

        {/* Messages area */}
        <div style={s.messagesArea}>
          <div style={s.dateSeparator}>
            <div style={s.dateLine} />
            <span style={s.dateLabel}>TODAY</span>
            <div style={s.dateLine} />
          </div>

          {!activeProject ? (
            <div style={{ textAlign: "center", padding: "40px 20px", color: "#9e9e9e", fontSize: 13 }}>
              No project selected. Ask your Team Lead to create a project to start chatting!
            </div>
          ) : allDisplayMessages.length === 0 ? (
            <div style={{ textAlign: "center", padding: "40px 20px", color: "#9e9e9e", fontSize: 13 }}>
              💬 No messages in <strong>{activeProject.name}</strong> yet.<br />
              Type a message below to broadcast live over WebSockets and save to database!
            </div>
          ) : (
            allDisplayMessages.map((msg) => {
              const isMe = msg.senderName === currentUserEmail || msg.senderName === "You" || msg.senderName === "ME";
              const isSelected = selectedIds.has(msg.id);
              const rowStyle: React.CSSProperties = {
                ...(isMe ? s.msgRowMe : s.msgRow),
                ...(selectionMode ? { cursor: "pointer", borderRadius: 8, padding: "4px", background: isSelected ? "#f0f4ff" : "transparent" } : {}),
              };
              if (isMe) {
                return (
                  <div key={msg.id} style={rowStyle} onClick={selectionMode ? () => handleToggleMessageSelect(msg.id) : undefined}>
                    {selectionMode && (
                      <input type="checkbox" checked={isSelected} readOnly style={{ marginLeft: 4, accentColor: "#4f46e5" }} />
                    )}
                    <div style={s.msgMetaMe}>
                      <span style={s.msgTimeMe}>{msg.createdAt}</span>
                      <span style={s.msgSenderMe}>{msg.senderName}</span>
                    </div>
                    <div style={s.bubbleMe}>{msg.content}</div>
                    <div style={s.avatarMe}>{msg.initials || "ME"}</div>
                  </div>
                );
              }
              return (
                <div key={msg.id} style={rowStyle} onClick={selectionMode ? () => handleToggleMessageSelect(msg.id) : undefined}>
                  {selectionMode && (
                    <input type="checkbox" checked={isSelected} readOnly style={{ marginRight: 4, accentColor: "#4f46e5" }} />
                  )}
                  <div style={s.avatarOther}>{msg.initials}</div>
                  <div style={s.msgContent}>
                    <div style={s.msgMeta}>
                      <span style={s.msgSender}>{msg.senderName}</span>
                      <span style={s.msgTime}>{msg.createdAt}</span>
                    </div>
                    <div style={s.bubbleOther}>{msg.content}</div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Input area */}
        {activeProject && (
          <form onSubmit={handleSend} style={s.inputArea}>
            <div style={s.inputWrap}>
              <input
                id="input-message"
                type="text"
                placeholder="Type a real-time WebSocket message..."
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                style={s.messageInput}
              />
              <button id="btn-send" type="submit" style={s.sendBtn}>
                Send
              </button>
            </div>
            <div style={s.inputFooter}>
              <span style={s.markdownHint}>Real-time STOMP messaging active</span>
              <span style={s.enterHint}>Press Enter to send</span>
            </div>
          </form>
        )}
      </div>

      {/* ── Floating selection toolbar ──────────────────────────────────── */}
      {selectionMode && selectedIds.size > 0 && (
        <div style={s.selectionToolbar}>
          <span style={s.selectionCount}>{selectedIds.size} message{selectedIds.size > 1 ? "s" : ""} selected</span>
          <button style={s.selectionClearBtn} onClick={() => setSelectedIds(new Set())}>Clear</button>
          <button
            id="btn-run-summarize"
            style={s.selectionSummarizeBtn}
            onClick={handleSummarize}
            disabled={summarizing}
          >
            {summarizing ? "Summarizing..." : "Summarize →"}
          </button>
        </div>
      )}

      {/* ── Summary Error Banner ────────────────────────────────────────── */}
      {summaryError && (
        <div style={s.errorBanner}>
          ⚠️ {summaryError}
          <button style={s.errorClose} onClick={() => setSummaryError(null)}>✕</button>
        </div>
      )}

      {/* ── Summary Modal ───────────────────────────────────────────────── */}
      {summaryResult && (
        <div style={s.modalOverlay} onClick={() => setSummaryResult(null)}>
          <div style={s.modalBox} onClick={(e) => e.stopPropagation()}>
            <div style={s.modalHeader}>
              <div style={s.modalTitle}>📄 AI Summary</div>
              <div style={s.modalMeta}>{summaryResult.message_count} messages · {summaryResult.strategy}</div>
              <button style={s.modalClose} onClick={() => setSummaryResult(null)}>✕</button>
            </div>

            <div style={s.modalBody}>
              <p style={s.summaryText}>{summaryResult.summary}</p>

              {summaryResult.key_points.length > 0 && (
                <div style={s.modalSection}>
                  <div style={s.modalSectionTitle}>🔑 Key Points</div>
                  <ul style={s.modalList}>
                    {summaryResult.key_points.map((kp, i) => (
                      <li key={i} style={s.modalListItem}>{kp}</li>
                    ))}
                  </ul>
                </div>
              )}

              {summaryResult.action_items.length > 0 && (
                <div style={s.modalSection}>
                  <div style={s.modalSectionTitle}>✅ Action Items</div>
                  <ul style={s.modalList}>
                    {summaryResult.action_items.map((ai, i) => (
                      <li key={i} style={s.modalListItem}>{ai}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>

            <div style={s.modalFooter}>
              <button
                style={s.modalCopyBtn}
                onClick={() => navigator.clipboard.writeText(
                  `Summary:\n${summaryResult.summary}\n\nKey Points:\n${summaryResult.key_points.map(k => `• ${k}`).join("\n")}\n\nAction Items:\n${summaryResult.action_items.map(a => `• ${a}`).join("\n")}`
                )}
              >
                📋 Copy
              </button>
              <button style={s.modalCloseBtn} onClick={() => setSummaryResult(null)}>Close</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ── Styles ─────────────────────────────────────────────────────────────── */
const s: Record<string, React.CSSProperties> = {
  root: {
    display: "flex",
    height: "calc(100vh - 48px)",
    width: "100%",
    overflow: "hidden" as const,
  },
  channelsSidebar: {
    width: 210,
    minWidth: 210,
    borderRight: "1px solid #e8e8e8",
    background: "#ffffff",
    display: "flex",
    flexDirection: "column" as const,
    padding: "20px 0 0",
    overflowY: "auto" as const,
  },
  channelsTitle: {
    fontSize: 13,
    fontWeight: 700,
    color: "#161616",
    letterSpacing: "-0.1px",
    padding: "0 16px 12px",
  },
  channelList: {
    display: "flex",
    flexDirection: "column" as const,
    gap: 0,
  },
  channelItem: {
    display: "flex",
    flexDirection: "column" as const,
    gap: 3,
    padding: "12px 16px",
    background: "transparent",
    border: "none",
    borderLeft: "3px solid transparent",
    cursor: "pointer",
    textAlign: "left" as const,
    transition: "background 0.1s",
  },
  channelItemActive: {
    background: "#f5f5f5",
    borderLeft: "3px solid #161616",
  },
  channelTop: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 8,
  },
  channelName: {
    fontSize: 13,
    fontWeight: 600,
    color: "#161616",
    lineHeight: 1.3,
    overflow: "hidden" as const,
    textOverflow: "ellipsis" as const,
    whiteSpace: "nowrap" as const,
  },
  chatArea: {
    flex: 1,
    display: "flex",
    flexDirection: "column" as const,
    background: "#f9f9f9",
    overflow: "hidden" as const,
  },
  chatHeader: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "14px 24px",
    background: "#ffffff",
    borderBottom: "1px solid #e8e8e8",
    flexShrink: 0,
  },
  chatHeaderLeft: {
    display: "flex",
    alignItems: "center",
    gap: 12,
  },
  chatChannelName: {
    fontSize: 15,
    fontWeight: 700,
    color: "#161616",
  },
  encryptedBadge: {
    display: "flex",
    alignItems: "center",
    fontSize: 12,
    fontWeight: 500,
    color: "#616161",
    background: "#f5f5f5",
    border: "1px solid #e0e0e0",
    borderRadius: 20,
    padding: "3px 10px",
  },
  summarizeBtn: {
    display: "flex",
    alignItems: "center",
    padding: "7px 14px",
    fontSize: 13,
    fontWeight: 500,
    color: "#424242",
    background: "#ffffff",
    border: "1px solid #d0d0d0",
    borderRadius: 6,
    cursor: "pointer",
  },
  messagesArea: {
    flex: 1,
    overflowY: "auto" as const,
    padding: "24px 28px",
    display: "flex",
    flexDirection: "column" as const,
    gap: 20,
  },
  dateSeparator: {
    display: "flex",
    alignItems: "center",
    gap: 12,
    margin: "8px 0",
  },
  dateLine: {
    flex: 1,
    height: 1,
    background: "#e8e8e8",
  },
  dateLabel: {
    fontSize: 11,
    fontWeight: 600,
    color: "#9e9e9e",
    letterSpacing: "0.8px",
  },
  msgRow: {
    display: "flex",
    alignItems: "flex-start",
    gap: 12,
  },
  avatarOther: {
    width: 32,
    height: 32,
    borderRadius: "50%",
    background: "#e0e0e0",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: 11,
    fontWeight: 700,
    color: "#616161",
    flexShrink: 0,
  },
  msgContent: {
    display: "flex",
    flexDirection: "column" as const,
    gap: 4,
    maxWidth: 560,
  },
  msgMeta: {
    display: "flex",
    alignItems: "baseline",
    gap: 8,
  },
  msgSender: {
    fontSize: 13,
    fontWeight: 700,
    color: "#161616",
  },
  msgTime: {
    fontSize: 11,
    color: "#9e9e9e",
  },
  bubbleOther: {
    fontSize: 13,
    color: "#161616",
    lineHeight: 1.6,
    background: "#ffffff",
    border: "1px solid #e8e8e8",
    borderRadius: "0 8px 8px 8px",
    padding: "10px 14px",
  },
  msgRowMe: {
    display: "flex",
    alignItems: "flex-end",
    gap: 10,
    flexDirection: "row-reverse" as const,
  },
  avatarMe: {
    width: 32,
    height: 32,
    borderRadius: "50%",
    background: "#161616",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: 11,
    fontWeight: 700,
    color: "#ffffff",
    flexShrink: 0,
  },
  msgMetaMe: {
    display: "flex",
    alignItems: "baseline",
    gap: 8,
    flexDirection: "row-reverse" as const,
  },
  msgSenderMe: {
    fontSize: 13,
    fontWeight: 700,
    color: "#161616",
  },
  msgTimeMe: {
    fontSize: 11,
    color: "#9e9e9e",
  },
  bubbleMe: {
    fontSize: 13,
    color: "#ffffff",
    lineHeight: 1.6,
    background: "#161616",
    borderRadius: "8px 0 8px 8px",
    padding: "10px 14px",
    maxWidth: 520,
  },
  inputArea: {
    padding: "16px 28px 12px",
    background: "#ffffff",
    borderTop: "1px solid #e8e8e8",
    flexShrink: 0,
  },
  inputWrap: {
    display: "flex",
    alignItems: "center",
    gap: 10,
    background: "#ffffff",
    border: "1px solid #d0d0d0",
    borderRadius: 8,
    padding: "8px 10px 8px 14px",
  },
  messageInput: {
    flex: 1,
    border: "none",
    outline: "none",
    background: "transparent",
    fontSize: 13,
    color: "#161616",
  },
  sendBtn: {
    padding: "6px 16px",
    fontSize: 13,
    fontWeight: 600,
    color: "#ffffff",
    background: "#161616",
    border: "none",
    borderRadius: 6,
    cursor: "pointer",
    flexShrink: 0,
  },
  inputFooter: {
    display: "flex",
    justifyContent: "space-between",
    marginTop: 6,
    padding: "0 2px",
  },
  markdownHint: {
    fontSize: 11,
    color: "#9e9e9e",
  },
  enterHint: {
    fontSize: 11,
    color: "#9e9e9e",
  },

  // ── Summarization UI styles ───────────────────────────────────────────────
  selectionToolbar: {
    position: "fixed" as const,
    bottom: 80,
    left: "50%",
    transform: "translateX(-50%)",
    display: "flex",
    alignItems: "center",
    gap: 12,
    background: "#161616",
    color: "#fff",
    borderRadius: 40,
    padding: "10px 20px",
    boxShadow: "0 4px 24px rgba(0,0,0,0.25)",
    zIndex: 200,
    animation: "fadeInUp 0.2s ease",
  },
  selectionCount: {
    fontSize: 13,
    fontWeight: 500,
    color: "#e0e0e0",
  },
  selectionClearBtn: {
    padding: "5px 12px",
    fontSize: 12,
    fontWeight: 500,
    color: "#ccc",
    background: "transparent",
    border: "1px solid #444",
    borderRadius: 20,
    cursor: "pointer",
  },
  selectionSummarizeBtn: {
    padding: "6px 18px",
    fontSize: 13,
    fontWeight: 600,
    color: "#161616",
    background: "#fff",
    border: "none",
    borderRadius: 20,
    cursor: "pointer",
  },
  errorBanner: {
    position: "fixed" as const,
    bottom: 140,
    left: "50%",
    transform: "translateX(-50%)",
    background: "#fff3e0",
    border: "1px solid #ffb74d",
    borderRadius: 8,
    padding: "10px 16px",
    fontSize: 13,
    color: "#e65100",
    display: "flex",
    alignItems: "center",
    gap: 10,
    zIndex: 200,
    maxWidth: 500,
  },
  errorClose: {
    background: "none",
    border: "none",
    cursor: "pointer",
    color: "#e65100",
    fontWeight: 700,
    fontSize: 14,
  },
  modalOverlay: {
    position: "fixed" as const,
    inset: 0,
    background: "rgba(0,0,0,0.5)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 400,
    padding: 24,
  },
  modalBox: {
    background: "#fff",
    borderRadius: 16,
    width: "100%",
    maxWidth: 560,
    maxHeight: "80vh",
    display: "flex",
    flexDirection: "column" as const,
    overflow: "hidden",
    boxShadow: "0 20px 60px rgba(0,0,0,0.3)",
  },
  modalHeader: {
    display: "flex",
    alignItems: "center",
    gap: 10,
    padding: "18px 20px 14px",
    borderBottom: "1px solid #f0f0f0",
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: 700,
    color: "#161616",
    flex: 1,
  },
  modalMeta: {
    fontSize: 11,
    color: "#9e9e9e",
    background: "#f5f5f5",
    borderRadius: 20,
    padding: "2px 10px",
  },
  modalClose: {
    background: "none",
    border: "none",
    fontSize: 16,
    cursor: "pointer",
    color: "#9e9e9e",
    padding: 4,
  },
  modalBody: {
    flex: 1,
    overflowY: "auto" as const,
    padding: "20px 24px",
    display: "flex",
    flexDirection: "column" as const,
    gap: 20,
  },
  summaryText: {
    fontSize: 14,
    lineHeight: 1.7,
    color: "#424242",
    margin: 0,
    padding: "14px 16px",
    background: "#f9f9f9",
    borderRadius: 8,
    borderLeft: "3px solid #4f46e5",
  },
  modalSection: {
    display: "flex",
    flexDirection: "column" as const,
    gap: 8,
  },
  modalSectionTitle: {
    fontSize: 13,
    fontWeight: 700,
    color: "#161616",
    letterSpacing: "0.2px",
  },
  modalList: {
    margin: 0,
    paddingLeft: 20,
    display: "flex",
    flexDirection: "column" as const,
    gap: 6,
  },
  modalListItem: {
    fontSize: 13,
    lineHeight: 1.6,
    color: "#424242",
  },
  modalFooter: {
    display: "flex",
    justifyContent: "flex-end",
    gap: 10,
    padding: "14px 20px",
    borderTop: "1px solid #f0f0f0",
  },
  modalCopyBtn: {
    padding: "7px 16px",
    fontSize: 13,
    fontWeight: 500,
    color: "#4f46e5",
    background: "#f0f0ff",
    border: "1px solid #c7d2fe",
    borderRadius: 8,
    cursor: "pointer",
  },
  modalCloseBtn: {
    padding: "7px 16px",
    fontSize: 13,
    fontWeight: 600,
    color: "#fff",
    background: "#161616",
    border: "none",
    borderRadius: 8,
    cursor: "pointer",
  },
};
