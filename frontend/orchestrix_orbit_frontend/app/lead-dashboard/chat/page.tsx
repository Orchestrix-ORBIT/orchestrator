"use client";

import React, { useState } from "react";
import Link from "next/link";

interface Channel {
  id: string;
  name: string;
  project: string;
  lastMessage: string;
  sender: string;
  time: string;
  unreadCount: number;
  members: string[];
}

const CHANNELS: Channel[] = [
  {
    id: "ch-1",
    name: "#alpha-core-general",
    project: "Project Alpha Core",
    lastMessage: "Chamber 3 calibration logs uploaded to S3. Ready for SNR statistical review.",
    sender: "Dr. Aris",
    time: "11:24 AM",
    unreadCount: 2,
    members: ["DK (Lead)", "Dr. Aris", "Chalani K.", "Amara P."],
  },
  {
    id: "ch-2",
    name: "#nexus-consensus-enclave",
    project: "Nexus Protocol",
    lastMessage: "Drafted zero-knowledge interface definitions for isolated PostgreSQL sidecars.",
    sender: "E. Chen",
    time: "10:15 AM",
    unreadCount: 0,
    members: ["DK (Lead)", "E. Chen", "Shehara K."],
  },
  {
    id: "ch-3",
    name: "#security-audit-compliance",
    project: "Beta Synthesis",
    lastMessage: "All historical 2023 dataset hashes verified with zero cross-tenant leakage.",
    sender: "Marcus N.",
    time: "Yesterday",
    unreadCount: 0,
    members: ["DK (Lead)", "Marcus N.", "Amara P."],
  },
];

export default function ChatPage() {
  const [selectedChannel, setSelectedChannel] = useState<Channel>(CHANNELS[0]);
  const [messages, setMessages] = useState([
    { id: "m1", sender: "Dr. Aris", text: "Chamber 3 telemetry over the last 72 hours shows a 1.4°C thermal drift.", time: "11:15 AM" },
    { id: "m2", sender: "DK (Lead)", text: "Let's isolate Chamber 3 cryo-coolant sub-manifold before running Batch #44.", time: "11:18 AM" },
    { id: "m3", sender: "Dr. Aris", text: "Agreed. Executing 4-point thermocouple calibration script now.", time: "11:24 AM" },
  ]);
  const [inputText, setInputText] = useState("");
  const [aiTriggered, setAiTriggered] = useState(false);

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim()) return;
    setMessages((prev) => [
      ...prev,
      { id: `m-${Date.now()}`, sender: "DK (Lead)", text: inputText, time: "Just now" },
    ]);
    setInputText("");
  };

  const handleTriggerAiEngine = () => {
    setAiTriggered(true);
    setTimeout(() => {
      alert("Thread successfully sent to Automated AI Context Engine (LangChain). Action items extracted and queued in AI Summaries!");
      setAiTriggered(false);
    }, 800);
  };

  return (
    <div>
      {/* ── Page Header ────────────────────────────────────────────────────── */}
      <div style={s.headerRow}>
        <div>
          <h1 style={s.pageTitle}>Project Chat</h1>
          <p style={s.pageSub}>Secure, real-time encrypted communication and AI context extraction (FR-COLLAB-01).</p>
        </div>

        <button 
          onClick={handleTriggerAiEngine}
          style={aiTriggered ? s.btnTriggered : s.btnAiTrigger}
          title="Send thread to Automated AI Context Engine for action item extraction"
        >
          {aiTriggered ? "Processing with LangChain..." : "⚡ Send Thread to AI Context Engine"}
        </button>
      </div>

      {/* ── Metric Stat Cards ────────────────────────────────────────────────── */}
      <div style={s.statGrid}>
        <div style={s.statCard}>
          <span style={s.statLabel}>ACTIVE CHANNELS</span>
          <span style={s.statValue}>{CHANNELS.length}</span>
          <span style={s.statSub}>Encrypted project rooms</span>
        </div>
        <div style={s.statCard}>
          <span style={s.statLabel}>ONLINE RESEARCHERS</span>
          <span style={s.statValue}>5</span>
          <span style={s.statSub}>WebSocket connected</span>
        </div>
        <div style={s.statCard}>
          <span style={s.statLabel}>SOCKET CIPHER</span>
          <span style={s.statValue}>AES-256</span>
          <span style={s.statSub}>In-transit keystroke encryption</span>
        </div>
        <div style={s.statCard}>
          <span style={s.statLabel}>AI CONTEXT QUEUE</span>
          <span style={s.statValue}>2</span>
          <span style={s.statSub}>Threads analyzed</span>
        </div>
      </div>

      {/* ── Split Chat Panel ────────────────────────────────────────────────── */}
      <div style={s.chatLayout}>
        {/* Left: Channels List */}
        <div style={s.channelsCard}>
          <p style={s.sectionLabel}>PROJECT CHANNELS</p>
          <div style={s.channelList}>
            {CHANNELS.map((ch) => {
              const active = selectedChannel.id === ch.id;
              return (
                <div
                  key={ch.id}
                  onClick={() => setSelectedChannel(ch)}
                  style={active ? s.channelItemActive : s.channelItem}
                >
                  <div style={s.channelTop}>
                    <span style={active ? s.chNameActive : s.chName}>{ch.name}</span>
                    <span style={s.chTime}>{ch.time}</span>
                  </div>
                  <p style={s.chLastMsg}>{ch.lastMessage}</p>
                  <span style={s.chProject}>{ch.project}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right: Active Chat Conversation Box */}
        <div style={s.conversationCard}>
          {/* Conversation Header */}
          <div style={s.convHeader}>
            <div>
              <h3 style={s.convTitle}>{selectedChannel.name}</h3>
              <p style={s.convSub}>{selectedChannel.project} • {selectedChannel.members.join(", ")}</p>
            </div>

            <div style={s.lockPill}>
              <span style={s.greenDot}>●</span> End-to-End Encrypted
            </div>
          </div>

          {/* Messages Stream */}
          <div style={s.messagesBox}>
            {messages.map((m) => {
              const isMe = m.sender === "DK (Lead)";
              return (
                <div key={m.id} style={isMe ? s.msgRowMe : s.msgRowThem}>
                  <div style={isMe ? s.bubbleMe : s.bubbleThem}>
                    <div style={s.msgHeader}>
                      <strong style={isMe ? s.senderMe : s.senderThem}>{m.sender}</strong>
                      <span style={s.msgTime}>{m.time}</span>
                    </div>
                    <p style={s.msgText}>{m.text}</p>
                  </div>
                </div>
              );
            })}
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
        </div>
      </div>
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
  sectionLabel: {
    fontSize: 11,
    fontWeight: 600,
    color: "#9e9e9e",
    letterSpacing: "0.6px",
    textTransform: "uppercase" as const,
    padding: "16px 20px 12px",
    borderBottom: "1px solid #eeeeee",
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
  chTime: {
    fontSize: 11,
    color: "#9e9e9e",
  },
  chLastMsg: {
    fontSize: 12,
    color: "#616161",
    lineHeight: 1.4,
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap" as const,
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
  greenDot: {
    fontSize: 8,
    color: "#2e7d32",
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
};
