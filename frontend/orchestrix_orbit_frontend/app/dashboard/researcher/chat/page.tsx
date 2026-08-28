"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useWebSocketChat } from "@/lib/useWebSocketChat";
import { getEmail, getTenantSlug } from "@/lib/auth";

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
          <button id="btn-summarize-ai" style={s.summarizeBtn}>
            ⚡ Summarize with AI
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
              if (isMe) {
                return (
                  <div key={msg.id} style={s.msgRowMe}>
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
                <div key={msg.id} style={s.msgRow}>
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
};
