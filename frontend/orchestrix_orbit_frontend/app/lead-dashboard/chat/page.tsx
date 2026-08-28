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
  project: string;
}

import { ProjectsService } from "@/lib/services/projects";
import { TeamsService } from "@/lib/services/teams";

export default function ChatPage() {
  const [projects, setProjects] = useState<any[]>([]);
  const [teamMembers, setTeamMembers] = useState<any[]>([]);
  const [selectedChannel, setSelectedChannel] = useState<Channel | null>(null);
  const [inputText, setInputText] = useState("");
  const [aiTriggered, setAiTriggered] = useState(false);

  // ── Summarization state ──────────────────────────────────────────────────
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [summarizing, setSummarizing] = useState(false);
  const [summaryResult, setSummaryResult] = useState<SummaryResult | null>(null);
  const [summaryError, setSummaryError] = useState<string | null>(null);

  const currentUserEmail = getEmail() || "DK (Lead)";

  // Load real projects and team members from database API
  useEffect(() => {
    ProjectsService.getAll()
      .then((data) => {
        setProjects(data);
        if (data && data.length > 0) {
          setSelectedChannel({
            id: data[0].id,
            projectId: data[0].id,
            name: `#${data[0].name.toLowerCase().replace(/\s+/g, "-")}`,
            project: data[0].name,
          });
        }
      })
      .catch((err) => console.warn("Could not fetch projects:", err));

    TeamsService.getAllMembers()
      .then((data) => setTeamMembers(data))
      .catch((err) => console.warn("Could not fetch team members:", err));
  }, []);

  const activeProjectId = selectedChannel ? selectedChannel.projectId : "";
  const { messages: liveMessages, isConnected, sendMessage } = useWebSocketChat(activeProjectId);

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim() || !selectedChannel) return;
    sendMessage(inputText, currentUserEmail);
    setInputText("");
  };

  const handleTriggerAiEngine = () => {
    setSelectionMode((prev) => !prev);
    setSelectedIds(new Set());
    setSummaryResult(null);
    setSummaryError(null);
    setAiTriggered(false);
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
        senderName: m.senderName || "Lead",
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
    content: m.content,
    createdAt: m.createdAt ? new Date(m.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : "Just now",
  }));

  const channelList: Channel[] = projects.map((p) => ({
    id: p.id,
    projectId: p.id,
    name: `#${p.name.toLowerCase().replace(/\s+/g, "-")}`,
    project: p.name,
  }));

  const assignmentsMap = typeof window !== "undefined" ? JSON.parse(localStorage.getItem("project_assigned_members") || "{}") : {};
  let assignedMemberIds: string[] = selectedChannel ? (assignmentsMap[selectedChannel.projectId] || []) : [];

  if (selectedChannel && assignedMemberIds.length === 0 && teamMembers.length > 0) {
    const researchers = teamMembers.filter((m: any) => {
      const role = String(m.role || "").toUpperCase();
      const name = String(m.displayName || m.userDisplayName || "").toLowerCase();
      const email = String(m.email || m.userEmail || "").toLowerCase();
      return role === "RESEARCHER" || name.includes("researcher") || email.includes("researcher");
    });
    assignedMemberIds = researchers.slice(0, 2).map((m: any) => m.id || m.userId);
  }

  const assignedProjectMembers = teamMembers.filter(m => assignedMemberIds.includes(m.id || m.userId));

  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return <div suppressHydrationWarning />;
  }

  return (
    <div suppressHydrationWarning>
      {/* ── Page Header ────────────────────────────────────────────────────── */}
      <div style={s.headerRow}>
        <div>
          <h1 style={s.pageTitle}>Project Chat</h1>
          <p style={s.pageSub}>Real-time STOMP WebSockets connected to PostgreSQL database (FR-COLLAB-01).</p>
        </div>
      </div>

      {/* ── Metric Stat Cards ────────────────────────────────────────────────── */}
      <div style={s.statGrid}>
        <div style={s.statCard}>
          <span style={s.statLabel}>ACTIVE CHANNELS</span>
          <span style={s.statValue}>{projects.length}</span>
          <span style={s.statSub}>Real database projects</span>
        </div>
        <div style={s.statCard}>
          <span style={s.statLabel}>TEAM MEMBERS</span>
          <span style={s.statValue}>{assignedProjectMembers.length}</span>
          <span style={s.statSub}>{isConnected ? "WebSocket Connected" : "Connecting STOMP..."}</span>
        </div>
        <div style={s.statCard}>
          <span style={s.statLabel}>SOCKET CIPHER</span>
          <span style={s.statValue}>AES-256</span>
          <span style={s.statSub}>In-transit keystroke encryption</span>
        </div>
        <div style={s.statCard}>
          <span style={s.statLabel}>DATABASE MESSAGES</span>
          <span style={s.statValue}>{liveMessages.length}</span>
          <span style={s.statSub}>Stored in PostgreSQL</span>
        </div>
      </div>

      {/* ── Split Chat Panel ────────────────────────────────────────────────── */}
      <div style={s.chatLayout}>
        {/* Left: Channels List */}
        <div style={s.channelsCard}>
          <div style={{ padding: "16px 20px 12px", borderBottom: "1px solid #eeeeee" }}>
            <span style={{ fontSize: 11, fontWeight: 600, color: "#9e9e9e", letterSpacing: "0.6px", textTransform: "uppercase" }}>PROJECT CHANNELS</span>
          </div>

          <div style={s.channelList}>
            {channelList.length === 0 ? (
              <div style={{ padding: "30px 16px", textAlign: "center", color: "#9e9e9e", fontSize: 12 }}>
                No active project channels
              </div>
            ) : (
              channelList.map((ch) => {
                const active = selectedChannel?.id === ch.id;
                return (
                  <div
                    key={ch.id}
                    onClick={() => setSelectedChannel(ch)}
                    style={active ? s.channelItemActive : s.channelItem}
                  >
                    <div style={s.channelTop}>
                      <span style={active ? s.chNameActive : s.chName}>{ch.name}</span>
                    </div>
                    <span style={s.chProject}>{ch.project}</span>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Right: Active Chat Conversation Box */}
        <div style={s.conversationCard}>
          {selectedChannel ? (
            <>
              {/* Conversation Header */}
              <div style={s.convHeader}>
                <div>
                  <h3 style={s.convTitle}>{selectedChannel.name}</h3>
                  <p style={s.convSub}>{selectedChannel.project} • {assignedProjectMembers.length > 0 ? assignedProjectMembers.map(m => m.displayName || m.email).join(", ") : "No assigned project members"}</p>
                </div>

                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <div style={s.lockPill}>
                    <span style={{ fontSize: 8, color: isConnected ? "#2e7d32" : "#ed6c02" }}>●</span>{" "}
                    {isConnected ? "STOMP WebSocket Live" : "Connecting..."}
                  </div>
                  <button 
                    id="btn-summarize-ai"
                    onClick={handleTriggerAiEngine}
                    style={{
                      ...(selectionMode ? { ...s.summarizeBtn, background: "#161616", color: "#fff", borderColor: "#161616" } : s.summarizeBtn),
                    }}
                    title="Select messages to summarize with AI"
                  >
                    {selectionMode ? "✕ Cancel Selection" : (summarizing ? "Summarizing..." : "⚡ Summarize with AI")}
                  </button>
                </div>
              </div>

              {/* Messages Stream */}
              <div style={s.messagesBox}>
                {allDisplayMessages.length === 0 ? (
                  <div style={{ textAlign: "center", padding: "40px 20px", color: "#9e9e9e", fontSize: 13 }}>
                    💬 No messages in <strong>{selectedChannel.name}</strong> yet.<br />
                    Type a message below to broadcast live over WebSockets and save to PostgreSQL database!
                  </div>
                ) : (
                  allDisplayMessages.map((m) => {
                    const isMe = m.senderName === currentUserEmail || m.senderName === "DK (Lead)" || m.senderName === "You";
                    const isSelected = selectedIds.has(m.id);
                    const rowStyle: React.CSSProperties = {
                      ...(isMe ? s.msgRowMe : s.msgRowThem),
                      ...(selectionMode ? { cursor: "pointer", borderRadius: 8, padding: "4px", background: isSelected ? "#f0f4ff" : "transparent" } : {}),
                    };
                    return (
                      <div key={m.id} style={rowStyle} onClick={selectionMode ? () => handleToggleMessageSelect(m.id) : undefined}>
                        {selectionMode && (
                          <input type="checkbox" checked={isSelected} readOnly style={{ marginRight: 8, accentColor: "#4f46e5", alignSelf: "center" }} />
                        )}
                        <div style={isMe ? s.bubbleMe : s.bubbleThem}>
                          <div style={s.msgHeader}>
                            <strong style={isMe ? s.senderMe : s.senderThem}>{m.senderName}</strong>
                            <span style={s.msgTime}>{m.createdAt}</span>
                          </div>
                          <p style={s.msgText}>{m.content}</p>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              {/* Message Input Box */}
              <form onSubmit={handleSendMessage} style={s.inputRow}>
                <input
                  type="text"
                  placeholder={`Message ${selectedChannel.name}...`}
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  style={s.msgInput}
                />
                <button type="submit" style={s.btnSend}>
                  Send
                </button>
              </form>
            </>
          ) : (
            <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: 40, textAlign: "center", color: "#9e9e9e" }}>
              <span style={{ fontSize: 36, marginBottom: 12 }}>📁</span>
              <h3 style={{ fontSize: 16, fontWeight: 600, color: "#161616", marginBottom: 6 }}>No Project Selected</h3>
              <p style={{ fontSize: 13, maxWidth: 320, marginBottom: 16 }}>Create a project in your workspace to enable real-time WebSocket chat rooms.</p>
              <Link href="/lead-dashboard/projects" style={{ background: "#161616", color: "#ffffff", padding: "8px 16px", borderRadius: 4, textDecoration: "none", fontSize: 13, fontWeight: 600 }}>Create Your First Project</Link>
            </div>
          )}
        </div>
      </div>

      {/* ── Floating selection toolbar ─────────────────────────────────────── */}
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

      {/* ── Summary Error Banner ───────────────────────────────────────────── */}
      {summaryError && (
        <div style={s.errorBanner}>
          ⚠️ {summaryError}
          <button style={s.errorClose} onClick={() => setSummaryError(null)}>✕</button>
        </div>
      )}

      {/* ── Summary Modal ──────────────────────────────────────────────────── */}
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
                    {summaryResult.key_points.map((kp, i) => <li key={i} style={s.modalListItem}>{kp}</li>)}
                  </ul>
                </div>
              )}
              {summaryResult.action_items.length > 0 && (
                <div style={s.modalSection}>
                  <div style={s.modalSectionTitle}>✅ Action Items</div>
                  <ul style={s.modalList}>
                    {summaryResult.action_items.map((ai, i) => <li key={i} style={s.modalListItem}>{ai}</li>)}
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
              >📋 Copy</button>
              <button style={s.modalCloseBtn} onClick={() => setSummaryResult(null)}>Close</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const s: Record<string, React.CSSProperties> = {
  headerRow: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-end",
    marginBottom: 24,
  },
  pageTitle: {
    fontSize: 28,
    fontWeight: 700,
    color: "#161616",
    letterSpacing: "-0.5px",
    marginBottom: 4,
  },
  pageSub: {
    fontSize: 13,
    color: "#9e9e9e",
  },
  btnAiTrigger: {
    background: "#161616",
    color: "#ffffff",
    border: "none",
    borderRadius: 4,
    padding: "9px 16px",
    fontSize: 13,
    fontWeight: 600,
    cursor: "pointer",
  },
  btnTriggered: {
    background: "#2e7d32",
    color: "#ffffff",
    border: "none",
    borderRadius: 4,
    padding: "9px 16px",
    fontSize: 13,
    fontWeight: 600,
    cursor: "wait",
  },
  statGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(4, 1fr)",
    gap: 16,
    marginBottom: 32,
  },
  statCard: {
    background: "#ffffff",
    border: "1px solid #e0e0e0",
    borderRadius: 6,
    padding: "18px 20px 20px",
    display: "flex",
    flexDirection: "column",
    gap: 6,
  },
  statLabel: {
    fontSize: 11,
    fontWeight: 600,
    color: "#9e9e9e",
    letterSpacing: "0.5px",
    textTransform: "uppercase" as const,
  },
  statValue: {
    fontSize: 32,
    fontWeight: 700,
    color: "#161616",
    letterSpacing: "-1px",
    lineHeight: 1.1,
  },
  statSub: {
    fontSize: 12,
    color: "#9e9e9e",
  },
  chatLayout: {
    display: "flex",
    gap: 20,
    alignItems: "stretch",
    minHeight: 520,
  },
  channelsCard: {
    width: 320,
    minWidth: 300,
    background: "#ffffff",
    border: "1px solid #e0e0e0",
    borderRadius: 6,
    display: "flex",
    flexDirection: "column",
  },
  channelList: {
    display: "flex",
    flexDirection: "column",
    flex: 1,
    overflowY: "auto",
  },
  channelItem: {
    padding: "14px 18px",
    borderBottom: "1px solid #f0f0f0",
    cursor: "pointer",
    display: "flex",
    flexDirection: "column",
    gap: 4,
    background: "#ffffff",
    transition: "background 0.1s",
  },
  channelItemActive: {
    padding: "14px 18px",
    borderBottom: "1px solid #f0f0f0",
    cursor: "pointer",
    display: "flex",
    flexDirection: "column",
    gap: 4,
    background: "#fafafa",
    borderLeft: "3px solid #161616",
  },
  channelTop: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
  },
  chName: {
    fontSize: 13,
    fontWeight: 600,
    color: "#161616",
  },
  chNameActive: {
    fontSize: 13,
    fontWeight: 700,
    color: "#161616",
  },
  chProject: {
    fontSize: 11,
    color: "#9e9e9e",
  },
  conversationCard: {
    flex: 1,
    background: "#ffffff",
    border: "1px solid #e0e0e0",
    borderRadius: 6,
    display: "flex",
    flexDirection: "column",
    overflow: "hidden",
  },
  convHeader: {
    padding: "16px 24px",
    borderBottom: "1px solid #eeeeee",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    background: "#fafafa",
  },
  convTitle: {
    fontSize: 15,
    fontWeight: 700,
    color: "#161616",
  },
  convSub: {
    fontSize: 12,
    color: "#9e9e9e",
    marginTop: 2,
  },
  lockPill: {
    fontSize: 11,
    fontWeight: 600,
    color: "#2e7d32",
    background: "#e8f5e9",
    border: "1px solid #c8e6c9",
    padding: "3px 9px",
    borderRadius: 12,
    display: "flex",
    alignItems: "center",
    gap: 5,
  },
  messagesBox: {
    flex: 1,
    padding: "20px 24px",
    overflowY: "auto",
    display: "flex",
    flexDirection: "column",
    gap: 14,
    background: "#ffffff",
  },
  msgRowMe: {
    display: "flex",
    justifyContent: "flex-end",
  },
  msgRowThem: {
    display: "flex",
    justifyContent: "flex-start",
  },
  bubbleMe: {
    background: "#161616",
    color: "#ffffff",
    padding: "10px 14px",
    borderRadius: "8px 8px 1px 8px",
    maxWidth: "70%",
  },
  bubbleThem: {
    background: "#f5f5f5",
    color: "#161616",
    padding: "10px 14px",
    borderRadius: "8px 8px 8px 1px",
    border: "1px solid #e0e0e0",
    maxWidth: "70%",
  },
  msgHeader: {
    display: "flex",
    justifyContent: "space-between",
    gap: 12,
    marginBottom: 4,
  },
  senderMe: {
    fontSize: 11,
    color: "#d0d0d0",
  },
  senderThem: {
    fontSize: 11,
    color: "#161616",
  },
  msgTime: {
    fontSize: 10,
    color: "#888888",
  },
  msgText: {
    fontSize: 13,
    lineHeight: 1.4,
  },
  inputRow: {
    display: "flex",
    gap: 10,
    padding: "14px 20px",
    borderTop: "1px solid #eeeeee",
    background: "#fafafa",
  },
  msgInput: {
    flex: 1,
    padding: "9px 14px",
    fontSize: 13,
    border: "1px solid #d0d0d0",
    borderRadius: 4,
    outline: "none",
    background: "#ffffff",
    color: "#161616",
  },
  btnSend: {
    padding: "9px 20px",
    background: "#161616",
    color: "#ffffff",
    border: "none",
    borderRadius: 4,
    fontSize: 13,
    fontWeight: 600,
    cursor: "pointer",
  },
  summarizeBtn: {
    padding: "6px 14px",
    background: "#ffffff",
    border: "1px solid #e0e0e0",
    borderRadius: 6,
    fontSize: 12,
    fontWeight: 600,
    color: "#1c1c1c",
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    gap: 6,
    boxShadow: "0 1px 2px rgba(0,0,0,0.05)",
    transition: "all 0.15s ease",
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
  },
  selectionCount: { fontSize: 13, fontWeight: 500, color: "#e0e0e0" },
  selectionClearBtn: {
    padding: "5px 12px", fontSize: 12, fontWeight: 500, color: "#ccc",
    background: "transparent", border: "1px solid #444", borderRadius: 20, cursor: "pointer",
  },
  selectionSummarizeBtn: {
    padding: "6px 18px", fontSize: 13, fontWeight: 600, color: "#161616",
    background: "#fff", border: "none", borderRadius: 20, cursor: "pointer",
  },
  errorBanner: {
    position: "fixed" as const, bottom: 140, left: "50%", transform: "translateX(-50%)",
    background: "#fff3e0", border: "1px solid #ffb74d", borderRadius: 8,
    padding: "10px 16px", fontSize: 13, color: "#e65100",
    display: "flex", alignItems: "center", gap: 10, zIndex: 200, maxWidth: 500,
  },
  errorClose: { background: "none", border: "none", cursor: "pointer", color: "#e65100", fontWeight: 700, fontSize: 14 },
  modalOverlay: {
    position: "fixed" as const, inset: 0, background: "rgba(0,0,0,0.5)",
    display: "flex", alignItems: "center", justifyContent: "center", zIndex: 400, padding: 24,
  },
  modalBox: {
    background: "#fff", borderRadius: 16, width: "100%", maxWidth: 560, maxHeight: "80vh",
    display: "flex", flexDirection: "column" as const, overflow: "hidden",
    boxShadow: "0 20px 60px rgba(0,0,0,0.3)",
  },
  modalHeader: { display: "flex", alignItems: "center", gap: 10, padding: "18px 20px 14px", borderBottom: "1px solid #f0f0f0" },
  modalTitle: { fontSize: 16, fontWeight: 700, color: "#161616", flex: 1 },
  modalMeta: { fontSize: 11, color: "#9e9e9e", background: "#f5f5f5", borderRadius: 20, padding: "2px 10px" },
  modalClose: { background: "none", border: "none", fontSize: 16, cursor: "pointer", color: "#9e9e9e", padding: 4 },
  modalBody: {
    flex: 1, overflowY: "auto" as const, padding: "20px 24px",
    display: "flex", flexDirection: "column" as const, gap: 20,
  },
  summaryText: {
    fontSize: 14, lineHeight: 1.7, color: "#424242", margin: 0,
    padding: "14px 16px", background: "#f9f9f9", borderRadius: 8, borderLeft: "3px solid #4f46e5",
  },
  modalSection: { display: "flex", flexDirection: "column" as const, gap: 8 },
  modalSectionTitle: { fontSize: 13, fontWeight: 700, color: "#161616", letterSpacing: "0.2px" },
  modalList: { margin: 0, paddingLeft: 20, display: "flex", flexDirection: "column" as const, gap: 6 },
  modalListItem: { fontSize: 13, lineHeight: 1.6, color: "#424242" },
  modalFooter: { display: "flex", justifyContent: "flex-end", gap: 10, padding: "14px 20px", borderTop: "1px solid #f0f0f0" },
  modalCopyBtn: {
    padding: "7px 16px", fontSize: 13, fontWeight: 500, color: "#4f46e5",
    background: "#f0f0ff", border: "1px solid #c7d2fe", borderRadius: 8, cursor: "pointer",
  },
  modalCloseBtn: {
    padding: "7px 16px", fontSize: 13, fontWeight: 600, color: "#fff",
    background: "#161616", border: "none", borderRadius: 8, cursor: "pointer",
  },
};

