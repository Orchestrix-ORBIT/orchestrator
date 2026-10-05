"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useWebSocketChat } from "@/lib/useWebSocketChat";
import { getEmail, getTenantSlug } from "@/lib/auth";
import { summarizeMessages, SummaryResult } from "@/lib/services/summarize";
import { saveAiSummary } from "@/lib/services/aiSummaries";
import { SavedSummariesService } from "@/lib/services/savedSummaries";

interface Channel {
  id: string;
  projectId: string;
  name: string;
}

function getSenderColor(name: string): string {
  const colors = ["#2563eb", "#7c3aed", "#d97706", "#059669", "#dc2626", "#0891b2"];
  let hash = 0;
  for (const character of name) hash = character.charCodeAt(0) + ((hash << 5) - hash);
  return colors[Math.abs(hash) % colors.length];
}

import { ProjectsService } from "@/lib/services/projects";
import { TeamsService } from "@/lib/services/teams";

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
  const [summaryProject, setSummaryProject] = useState<{ id: string; name: string } | null>(null);
  const [savingSummary, setSavingSummary] = useState(false);
  const [summarySaved, setSummarySaved] = useState(false);

  const currentUserEmail = getEmail() || "Researcher";

  useEffect(() => {
    ProjectsService.getAll()
      .then((data) => {
        setProjects(data);
        if (data && data.length > 0) {
          setActiveChannelId(data[0].id);
        }
      })
      .catch((err) => console.warn("Could not fetch projects:", err));

    TeamsService.getAllMembers()
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
    setSummarySaved(false);
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
    setSummarySaved(false);
    try {
      const result = await summarizeMessages(
        selected,
        activeProjectId,
        getTenantSlug() || "myorg"
      );
      setSummaryResult(result);
      setSummaryProject({ id: activeProjectId, name: activeProject?.name || "Chat" });
      setSelectionMode(false);
      setSelectedIds(new Set());

      // Persist directly to backend database for lead approval
      const currentProj = projects.find((p) => p.id === activeProjectId);
      const topic = result.summary.length > 70 ? result.summary.slice(0, 67) + "..." : result.summary;

      await saveAiSummary({
        projectId: activeProjectId,
        projectName: currentProj ? currentProj.name : "Research Project",
        topic: topic || "Discussion Summary",
        summary: result.summary,
        keyFindings: result.key_points || [],
        actionItems: result.action_items || [],
        deadlineSuggestions: [],
        confidence: 100,
        model: "LangChain Context Engine",
        status: "Pending Approval",
        createdBy: currentUserEmail,
        messageCount: selected.length,
      });
    } catch (err: any) {
      setSummaryError(err.message ?? "Summarization failed.");
    } finally {
      setSummarizing(false);
    }
  };

  const handleSaveSummary = async () => {
    if (!summaryResult || !summaryProject || savingSummary || summarySaved) return;
    setSavingSummary(true);
    setSummaryError(null);
    try {
      await SavedSummariesService.save(summaryProject.id, `${summaryProject.name} chat summary`, summaryResult);
      setSummarySaved(true);
    } catch (err) {
      setSummaryError(err instanceof Error ? err.message : "Could not save summary.");
    } finally {
      setSavingSummary(false);
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
      <div style={s.pageHeader}>
        <h1 style={s.pageTitle}>Project Chat</h1>
      </div>
      <div style={s.chatLayout}>
      {/* ── Channels sidebar ─────────────────────────────────────────────── */}
      <aside style={s.channelsSidebar}>
        <h2 style={s.channelsTitle}>Project channels ({channels.length})</h2>
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
                aria-pressed={activeChannelId === ch.id}
                style={{
                  ...s.channelItem,
                  ...(activeChannelId === ch.id ? s.channelItemActive : {}),
                }}
                onClick={() => setActiveChannelId(ch.id)}
              >
                <div style={s.channelTop}>
                  <span style={{ ...s.channelName, ...(activeChannelId === ch.id ? s.channelNameActive : {}) }}>{ch.name}</span>
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
            <span style={{ ...s.encryptedBadge, ...(!isConnected ? s.connectingBadge : {}) }}>
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
              const isMe = msg.senderName.toLowerCase() === currentUserEmail.toLowerCase() || msg.senderName === "You" || msg.senderName === "ME";
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
                    <div style={s.msgContentMe}>
                      <div style={s.msgMetaMe}>
                        <span style={s.msgSenderMe}>You</span>
                        <span style={s.msgTimeMe}>{msg.createdAt}</span>
                      </div>
                      <div style={s.bubbleMe}>{msg.content}</div>
                    </div>
                  </div>
                );
              }
              return (
                <div key={msg.id} style={rowStyle} onClick={selectionMode ? () => handleToggleMessageSelect(msg.id) : undefined}>
                  {selectionMode && (
                    <input type="checkbox" checked={isSelected} readOnly style={{ marginRight: 4, accentColor: "#4f46e5" }} />
                  )}
                  <div style={{ ...s.avatarOther, background: getSenderColor(msg.senderName) }}>{msg.initials}</div>
                  <div style={s.msgContent}>
                    <div style={s.msgMeta}>
                      <span style={{ ...s.msgSender, color: getSenderColor(msg.senderName) }}>{msg.senderName}</span>
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

            {summaryError && <p role="alert" style={{ color: "#b42318", padding: "0 20px" }}>{summaryError}</p>}
            <div style={s.modalFooter}>
              <button style={s.modalCopyBtn} onClick={handleSaveSummary} disabled={savingSummary || summarySaved}>
                {summarySaved ? "✓ Added to summaries" : savingSummary ? "Adding..." : "Add to summaries"}
              </button>
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
    flexDirection: "column",
    height: "calc(100vh - 48px)",
    width: "100%",
    overflow: "hidden" as const,
    padding: "24px 28px 28px",
    background: "#f5f5f5",
    gap: 16,
  },
  pageHeader: {
    display: "flex",
    alignItems: "center",
    flexShrink: 0,
  },
  pageTitle: {
    fontSize: 22,
    fontWeight: 700,
    color: "#161616",
  },
  chatLayout: {
    display: "flex",
    flex: 1,
    minHeight: 0,
    gap: 20,
  },
  channelsSidebar: {
    width: 280,
    minWidth: 240,
    border: "1px solid #e0e0e0",
    borderRadius: 8,
    background: "#ffffff",
    display: "flex",
    flexDirection: "column" as const,
    overflow: "hidden" as const,
  },
  channelsTitle: {
    fontSize: 11,
    fontWeight: 700,
    color: "#64748b",
    letterSpacing: "0.6px",
    textTransform: "uppercase" as const,
    padding: "16px 20px 12px",
    borderBottom: "1px solid #eeeeee",
  },
  channelList: {
    display: "flex",
    flexDirection: "column" as const,
    gap: 0,
    overflowY: "auto" as const,
  },
  channelItem: {
    display: "flex",
    flexDirection: "column" as const,
    gap: 3,
    padding: "14px 18px",
    background: "#ffffff",
    border: "none",
    borderLeft: "3px solid transparent",
    borderBottom: "1px solid #f0f0f0",
    cursor: "pointer",
    textAlign: "left" as const,
    transition: "background 0.1s",
  },
  channelItemActive: {
    background: "#eff6ff",
    borderLeft: "3px solid #2563eb",
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
  channelNameActive: {
    color: "#1d4ed8",
    fontWeight: 700,
  },
  chatArea: {
    flex: 1,
    minWidth: 0,
    display: "flex",
    flexDirection: "column" as const,
    background: "#ffffff",
    border: "1px solid #e0e0e0",
    borderRadius: 8,
    overflow: "hidden" as const,
  },
  chatHeader: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "14px 24px",
    background: "#fafafa",
    borderBottom: "1px solid #e8e8e8",
    flexShrink: 0,
  },
  chatHeaderLeft: {
    display: "flex",
    alignItems: "center",
    gap: 12,
    flexWrap: "wrap" as const,
  },
  chatChannelName: {
    fontSize: 15,
    fontWeight: 700,
    color: "#161616",
  },
  encryptedBadge: {
    display: "flex",
    alignItems: "center",
    fontSize: 11,
    fontWeight: 600,
    color: "#15803d",
    background: "#f0fdf4",
    border: "1px solid #bbf7d0",
    borderRadius: 20,
    padding: "3px 10px",
  },
  connectingBadge: {
    color: "#c2410c",
    background: "#fff7ed",
    borderColor: "#fed7aa",
  },
  summarizeBtn: {
    display: "flex",
    alignItems: "center",
    padding: "7px 14px",
    fontSize: 13,
    fontWeight: 600,
    color: "#6d28d9",
    background: "#f5f3ff",
    border: "1px solid #ddd6fe",
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
    background: "#fafafa",
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
    background: "#2563eb",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: 11,
    fontWeight: 700,
    color: "#ffffff",
    flexShrink: 0,
    boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
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
    color: "#0f172a",
    lineHeight: 1.6,
    background: "#ffffff",
    border: "1px solid #e2e8f0",
    borderRadius: "16px 16px 16px 2px",
    padding: "10px 16px",
    boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
  },
  msgRowMe: {
    display: "flex",
    alignItems: "flex-end",
    justifyContent: "flex-end",
    gap: 10,
  },
  msgContentMe: {
    display: "flex",
    flexDirection: "column" as const,
    alignItems: "flex-end",
    gap: 4,
    maxWidth: "68%",
  },
  msgMetaMe: {
    display: "flex",
    alignItems: "baseline",
    gap: 8,
    justifyContent: "flex-end",
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
    background: "#2563eb",
    borderRadius: "16px 16px 2px 16px",
    padding: "10px 16px",
    maxWidth: 520,
    boxShadow: "0 2px 6px rgba(37, 99, 235, 0.25)",
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
    background: "#f8fafc",
    border: "1px solid #e2e8f0",
    borderRadius: 20,
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
    background: "#2563eb",
    border: "none",
    borderRadius: 20,
    cursor: "pointer",
    flexShrink: 0,
    boxShadow: "0 2px 4px rgba(37, 99, 235, 0.2)",
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
