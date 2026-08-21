"use client";

import { useState } from "react";

/* ── Types ───────────────────────────────────────────────────────────────── */
interface Channel {
  id: string;
  name: string;
  preview: string;
  time: string;
  unread?: number;
  isTyping?: boolean;
}

interface Message {
  id: string;
  sender: string;
  initials: string;
  time: string;
  content: string;
  isMe?: boolean;
  isSystem?: boolean;
  systemText?: string;
}

/* ── Static data ─────────────────────────────────────────────────────────── */
const CHANNELS: Channel[] = [
  {
    id: "ch-alpha-protocol",
    name: "Alpha Protocol Sec",
    preview: "Typing...",
    time: "10:42 AM",
    isTyping: true,
  },
  {
    id: "ch-project-chimera",
    name: "Project Chimera",
    preview: "Latest structural data...",
    time: "Yesterday",
    unread: 3,
  },
  {
    id: "ch-dataset-validation",
    name: "Dataset Validation",
    preview: "Pipeline failed on sta...",
    time: "Tuesday",
  },
  {
    id: "ch-general-sync",
    name: "General Sync",
    preview: "Meeting notes attach...",
    time: "Mon",
  },
];

const MESSAGES: Message[] = [
  {
    id: "msg-1",
    sender: "Dr. Julian Desai",
    initials: "JD",
    time: "10:15 AM",
    content:
      "I've reviewed the latest synthesis results from the Alpha run. The variance in sector 4 is statistically significant. We need to recalibrate the thermal sensors before the next batch.",
  },
  {
    id: "msg-me",
    sender: "You",
    initials: "ME",
    time: "10:18 AM",
    content:
      "Understood. I'll initiate the recalibration protocol now. It should take about 45 minutes to stabilize.",
    isMe: true,
  },
  {
    id: "msg-2",
    sender: "Elena Korova",
    initials: "EK",
    time: "10:22 AM",
    content:
      "Can we get a fresh extract of the raw data logs prior to recalibration? Need to document the baseline anomaly.",
  },
  {
    id: "msg-system",
    sender: "System",
    initials: "",
    time: "",
    content: "",
    isSystem: true,
    systemText: "Baseline_Anomaly_Log_A.csv was added to resources.",
  },
];

/* ════════════════════════════════════════════════════════════════════════════
   Chat Page
═══════════════════════════════════════════════════════════════════════════ */
export default function ChatPage() {
  const [activeChannel, setActiveChannel] = useState("ch-alpha-protocol");
  const [inputValue, setInputValue] = useState("");

  const active = CHANNELS.find((c) => c.id === activeChannel)!;

  return (
    <div style={s.root}>
      {/* ── Channels sidebar ─────────────────────────────────────────────── */}
      <aside style={s.channelsSidebar}>
        <h2 style={s.channelsTitle}>Channels</h2>
        <div style={s.channelList}>
          {CHANNELS.map((ch) => (
            <button
              key={ch.id}
              id={ch.id}
              style={{
                ...s.channelItem,
                ...(activeChannel === ch.id ? s.channelItemActive : {}),
              }}
              onClick={() => setActiveChannel(ch.id)}
            >
              <div style={s.channelTop}>
                <span style={s.channelName}>{ch.name}</span>
                <span style={s.channelTime}>{ch.time}</span>
              </div>
              <div style={s.channelBottom}>
                <span
                  style={{
                    ...s.channelPreview,
                    ...(ch.isTyping ? s.channelTyping : {}),
                  }}
                >
                  {ch.preview}
                </span>
                {ch.unread && (
                  <span style={s.unreadBadge}>{ch.unread}</span>
                )}
              </div>
            </button>
          ))}
        </div>
      </aside>

      {/* ── Chat area ────────────────────────────────────────────────────── */}
      <div style={s.chatArea}>
        {/* Chat header */}
        <div style={s.chatHeader}>
          <div style={s.chatHeaderLeft}>
            <span style={s.chatChannelName}>{active.name}</span>
            <span style={s.encryptedBadge}>
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.3" style={{ marginRight: 4 }}>
                <rect x="1.5" y="5" width="9" height="6" rx="1" />
                <path d="M3.5 5V3.5a2.5 2.5 0 0 1 5 0V5" strokeLinecap="round" />
              </svg>
              End-to-End Encrypted
            </span>
          </div>
          <button id="btn-summarize-ai" style={s.summarizeBtn}>
            <svg width="13" height="13" viewBox="0 0 13 13" fill="currentColor" style={{ marginRight: 6 }}>
              <path d="M6.5 1l.8 2.4h2.5l-2 1.5.8 2.4-2.1-1.5-2.1 1.5.8-2.4-2-1.5h2.5z" />
              <path d="M10.5 8l.4 1.2H12l-1 .7.4 1.2-1-.7-1 .7.4-1.2-1-.7h1.2z" />
              <path d="M2.5 8l.4 1.2H4l-1 .7.4 1.2-1-.7-1 .7.4-1.2-1-.7H2.1z" />
            </svg>
            Summarize with AI
          </button>
        </div>

        {/* Messages area */}
        <div style={s.messagesArea}>
          {/* Date separator */}
          <div style={s.dateSeparator}>
            <div style={s.dateLine} />
            <span style={s.dateLabel}>TODAY</span>
            <div style={s.dateLine} />
          </div>

          {/* Messages */}
          {MESSAGES.map((msg) => {
            if (msg.isSystem) {
              return (
                <div key={msg.id} style={s.systemMsg}>
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round" style={{ marginRight: 6 }}>
                    <path d="M2 1h7l3 3v9H2V1z" />
                    <path d="M9 1v3h3" />
                  </svg>
                  {msg.systemText}
                </div>
              );
            }
            if (msg.isMe) {
              return (
                <div key={msg.id} style={s.msgRowMe}>
                  <div style={s.msgMetaMe}>
                    <span style={s.msgTimeMe}>{msg.time}</span>
                    <span style={s.msgSenderMe}>{msg.sender}</span>
                  </div>
                  <div style={s.bubbleMe}>{msg.content}</div>
                  <div style={s.avatarMe}>{msg.initials}</div>
                </div>
              );
            }
            return (
              <div key={msg.id} style={s.msgRow}>
                <div style={s.avatarOther}>{msg.initials}</div>
                <div style={s.msgContent}>
                  <div style={s.msgMeta}>
                    <span style={s.msgSender}>{msg.sender}</span>
                    <span style={s.msgTime}>{msg.time}</span>
                  </div>
                  <div style={s.bubbleOther}>{msg.content}</div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Input area */}
        <div style={s.inputArea}>
          <div style={s.inputWrap}>
            <button id="btn-attach" style={s.attachBtn} title="Attach file">
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
                <path d="M13.5 8l-6 6a4 4 0 0 1-5.66-5.66l7-7a2.5 2.5 0 0 1 3.54 3.54L5.34 11.9a1 1 0 0 1-1.41-1.41L10 4.5" />
              </svg>
            </button>
            <input
              id="input-message"
              type="text"
              placeholder="Type an encrypted message..."
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              style={s.messageInput}
            />
            <button id="btn-send" style={s.sendBtn}>
              Send
            </button>
          </div>
          <div style={s.inputFooter}>
            <span style={s.markdownHint}>Markdown supported</span>
            <span style={s.enterHint}>Press Enter to send, Shift+Enter for new line</span>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ── Styles ─────────────────────────────────────────────────────────────── */
const s: Record<string, React.CSSProperties> = {
  root: {
    display: "flex",
    height: "calc(100vh - 48px)", /* full height minus topbar */
    width: "100%",
    overflow: "hidden" as const,
  },

  /* Channels sidebar */
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
  channelTime: {
    fontSize: 11,
    color: "#9e9e9e",
    whiteSpace: "nowrap" as const,
    flexShrink: 0,
  },
  channelBottom: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
  },
  channelPreview: {
    fontSize: 12,
    color: "#9e9e9e",
    overflow: "hidden" as const,
    textOverflow: "ellipsis" as const,
    whiteSpace: "nowrap" as const,
  },
  channelTyping: {
    color: "#616161",
    fontStyle: "italic" as const,
  },
  unreadBadge: {
    fontSize: 11,
    fontWeight: 700,
    color: "#ffffff",
    background: "#161616",
    borderRadius: 10,
    padding: "1px 6px",
    flexShrink: 0,
  },

  /* Chat area */
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

  /* Messages */
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

  /* Other person message */
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

  /* My message */
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

  /* System message */
  systemMsg: {
    display: "flex",
    alignItems: "center",
    justifyContent: "flex-end",
    fontSize: 12,
    color: "#9e9e9e",
    background: "#f5f5f5",
    border: "1px solid #e8e8e8",
    borderRadius: 6,
    padding: "7px 14px",
    alignSelf: "flex-end" as const,
    maxWidth: 400,
  },

  /* Input area */
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
  attachBtn: {
    background: "none",
    border: "none",
    cursor: "pointer",
    color: "#9e9e9e",
    display: "flex",
    alignItems: "center",
    padding: 0,
    flexShrink: 0,
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
