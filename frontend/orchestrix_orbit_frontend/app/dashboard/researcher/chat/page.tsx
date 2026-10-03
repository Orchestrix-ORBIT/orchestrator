"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useWebSocketChat } from "@/lib/useWebSocketChat";
import { getEmail, getTenantSlug, getUserId } from "@/lib/auth";
import { summarizeMessages, SummaryResult } from "@/lib/services/summarize";
import { saveAiSummary } from "@/lib/services/aiSummaries";
import { SavedSummariesService } from "@/lib/services/savedSummaries";
import LoadingState from "@/components/ui/LoadingState";

interface Channel {
  id: string;
  projectId: string;
  teamId?: string;
  name: string;
  project: string;
}

function getInitials(name: string): string {
  if (!name) return "U";
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return name.slice(0, 2).toUpperCase();
}

function getSenderColor(name: string): string {
  const colors = ["#2563eb", "#7c3aed", "#d97706", "#059669", "#dc2626", "#0891b2"];
  let hash = 0;
  for (let i = 0; i < (name || "").length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return colors[Math.abs(hash) % colors.length];
}

function getSenderDisplayName(m: { senderId?: string; senderName?: string }, members: any[]): string {
  const raw = m.senderName || "";
  if (!raw) return "Unknown";

  if (raw.includes("@")) {
    const memberByEmail = members.find(
      (mem: any) => (mem.email || mem.userEmail || "").toLowerCase() === raw.toLowerCase()
    );
    if (memberByEmail && (memberByEmail.displayName || memberByEmail.userDisplayName || memberByEmail.name)) {
      return memberByEmail.displayName || memberByEmail.userDisplayName || memberByEmail.name;
    }
    const local = raw.split("@")[0];
    return local.split(/[._\-]/).map((w: string) => w.charAt(0).toUpperCase() + w.slice(1)).join(" ");
  }

  const memberByName = members.find(
    (mem: any) => (mem.displayName || mem.name || "").toLowerCase() === raw.toLowerCase()
  );
  if (memberByName && (memberByName.displayName || memberByName.name)) {
    return memberByName.displayName || memberByName.name;
  }

  return raw;
}

import { ProjectsService } from "@/lib/services/projects";
import { TeamsService } from "@/lib/services/teams";

export default function ResearcherChatPage() {
  const [mounted, setMounted] = useState(false);
  const [loading, setLoading] = useState(true);
  const [projects, setProjects] = useState<any[]>([]);
  const [teamMembers, setTeamMembers] = useState<any[]>([]);
  const [selectedChannel, setSelectedChannel] = useState<Channel | null>(null);
  const [assignedProjectMembers, setAssignedProjectMembers] = useState<any[]>([]);
  const [inputText, setInputText] = useState("");

  // AI Summarization state
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [summarizing, setSummarizing] = useState(false);
  const [summaryResult, setSummaryResult] = useState<SummaryResult | null>(null);
  const [summaryError, setSummaryError] = useState<string | null>(null);
  const [summaryProject, setSummaryProject] = useState<{ id: string; name: string } | null>(null);
  const [savingSummary, setSavingSummary] = useState(false);
  const [summarySaved, setSummarySaved] = useState(false);

  // Industry Standard Chat state
  const [replyingTo, setReplyingTo] = useState<{ id: string; senderName: string; content: string } | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [deletedIds, setDeletedIds] = useState<Set<string>>(new Set());
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingText, setEditingText] = useState("");
  const [editedContents, setEditedContents] = useState<Record<string, string>>({});
  const [reactions, setReactions] = useState<Record<string, Record<string, number>>>({});
  const [activeActionMsgId, setActiveActionMsgId] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 2500);
  };

  const handleToggleReaction = (msgId: string, emoji: string) => {
    setReactions((prev) => {
      const msgReactions = prev[msgId] || {};
      const currentCount = msgReactions[emoji] || 0;
      return { ...prev, [msgId]: { ...msgReactions, [emoji]: currentCount > 0 ? 0 : 1 } };
    });
  };

  const handleDeleteMessage = (msgId: string) => {
    setDeletedIds((prev) => new Set(prev).add(msgId));
    showToast("Message deleted");
  };

  const handleStartEdit = (m: any) => {
    setEditingId(m.id);
    setEditingText(editedContents[m.id] || m.content);
  };

  const handleSaveEdit = (msgId: string) => {
    if (!editingText.trim()) return;
    setEditedContents((prev) => ({ ...prev, [msgId]: editingText.trim() }));
    setEditingId(null);
    setEditingText("");
    showToast("Message edited");
  };

  const handleCopyText = (content: string) => {
    if (typeof navigator !== "undefined" && navigator.clipboard) {
      navigator.clipboard.writeText(content);
    }
    showToast("Copied to clipboard!");
  };

  // Close action toolbar on clicking anywhere else
  useEffect(() => {
    if (!activeActionMsgId) return;
    const handleOutsideClick = () => setActiveActionMsgId(null);
    window.addEventListener("click", handleOutsideClick);
    return () => window.removeEventListener("click", handleOutsideClick);
  }, [activeActionMsgId]);

  useEffect(() => { setMounted(true); }, []);

  const currentUserEmail = getEmail() || "Researcher";
  const currentUserId = getUserId() || "";

  // Derive friendly display name for the current user (resolved after teamMembers load)
  const currentDisplayName = React.useMemo(() => {
    return getSenderDisplayName({ senderName: currentUserEmail }, teamMembers);
  }, [currentUserEmail, teamMembers]);

  const myUserId = React.useMemo(() => {
    if (currentUserId) return currentUserId;
    const currentMember = teamMembers.find(m => (m.email || m.userEmail || "").toLowerCase() === currentUserEmail.toLowerCase());
    return currentMember?.userId || currentMember?.id;
  }, [currentUserId, currentUserEmail, teamMembers]);

  useEffect(() => {
    Promise.all([
      ProjectsService.getAll()
        .then((data) => {
          setProjects(data);
          if (data && data.length > 0) {
            setSelectedChannel({
              id: data[0].id,
              projectId: data[0].id,
              teamId: data[0].teamId,
              name: `#${data[0].name.toLowerCase().replace(/\s+/g, "-")}`,
              project: data[0].name,
            });
          }
        })
        .catch((err) => console.warn("Could not fetch projects:", err)),
      TeamsService.getAllMembers()
        .then((data) => setTeamMembers(data))
        .catch((err) => console.warn("Could not fetch team members:", err)),
    ]).finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!selectedChannel) {
      setAssignedProjectMembers([]);
      return;
    }
    const assignmentsMap = typeof window !== "undefined" ? JSON.parse(localStorage.getItem("project_assigned_members") || "{}") : {};
    const localAssignedIds: string[] = assignmentsMap[selectedChannel.projectId] || [];

    if (selectedChannel.teamId) {
      TeamsService.getTeamMembers(selectedChannel.teamId)
        .then(members => {
          const backendIds = members.map((m: any) => m.userId || m.id);
          const allIds = Array.from(new Set([...backendIds, ...localAssignedIds]));
          setAssignedProjectMembers(teamMembers.filter(m => allIds.includes(m.id || m.userId)));
        })
        .catch(() => {
          setAssignedProjectMembers(teamMembers.filter(m => localAssignedIds.includes(m.id || m.userId)));
        });
    } else {
      setAssignedProjectMembers(teamMembers.filter(m => localAssignedIds.includes(m.id || m.userId)));
    }
  }, [selectedChannel, teamMembers]);

  const activeProjectId = selectedChannel ? selectedChannel.projectId : "";
  const { messages: liveMessages, isConnected, isLoadingHistory, isLoadingMore, hasMore, sendMessage, loadMoreMessages } =
    useWebSocketChat(activeProjectId, 15);

  const messagesBoxRef = useRef<HTMLDivElement>(null);
  const prevScrollHeightRef = useRef<number>(0);

  useEffect(() => {
    if (!isLoadingHistory && messagesBoxRef.current && !isLoadingMore && prevScrollHeightRef.current === 0) {
      messagesBoxRef.current.scrollTop = messagesBoxRef.current.scrollHeight;
    }
  }, [liveMessages.length, isLoadingHistory, selectedChannel?.id]);

  useEffect(() => {
    if (messagesBoxRef.current && prevScrollHeightRef.current > 0) {
      const heightDiff = messagesBoxRef.current.scrollHeight - prevScrollHeightRef.current;
      messagesBoxRef.current.scrollTop = heightDiff;
      prevScrollHeightRef.current = 0;
    }
  }, [liveMessages.length]);

  const handleMessagesScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const target = e.currentTarget;
    if (target.scrollTop < 40 && hasMore && !isLoadingMore && !isLoadingHistory) {
      prevScrollHeightRef.current = target.scrollHeight;
      loadMoreMessages();
    }
  };



  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim() || !selectedChannel) return;
    sendMessage(inputText, currentDisplayName, replyingTo);
    setInputText("");
    setReplyingTo(null);
  };

  const handleTriggerAiEngine = () => {
    setSelectionMode((prev) => !prev);
    setSelectedIds(new Set());
    setSummaryResult(null);
    setSummaryError(null);
    setSummarySaved(false);
  };

  // Safe clipboard helper — falls back to execCommand for HTTP contexts
  const copyToClipboard = (text: string) => {
    if (typeof navigator !== "undefined" && navigator.clipboard && window.isSecureContext) {
      navigator.clipboard.writeText(text).catch(() => fallbackCopy(text));
    } else {
      fallbackCopy(text);
    }
    showToast("✓ Copied to clipboard!");
  };
  const fallbackCopy = (text: string) => {
    const el = document.createElement("textarea");
    el.value = text;
    el.style.position = "fixed";
    el.style.opacity = "0";
    document.body.appendChild(el);
    el.focus();
    el.select();
    try { document.execCommand("copy"); } catch (_) {}
    document.body.removeChild(el);
  };

  const handleSelectAll = () => {
    const allIds = new Set(filteredMessages.map((m) => m.id));
    setSelectedIds(allIds);
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
      .map((m) => ({ senderName: m.senderName || "Researcher", content: m.content, createdAt: m.createdAt }));
    setSummarizing(true);
    setSummaryError(null);
    setSummaryResult(null);
    setSummarySaved(false);
    try {
      const result = await summarizeMessages(selected, activeProjectId, getTenantSlug() || "myorg");
      setSummaryResult(result);
      setSummaryProject({ id: activeProjectId, name: selectedChannel?.project || "Chat" });
      setSelectionMode(false);
      setSelectedIds(new Set());
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
      const currentProj = projects.find((p) => p.id === summaryProject.id);
      const topic = summaryResult.summary.length > 70 ? summaryResult.summary.slice(0, 67) + "..." : summaryResult.summary;
      let serializedActionItems: string[] = [];
      if (summaryResult.extracted_tasks && summaryResult.extracted_tasks.length > 0) {
        serializedActionItems = summaryResult.extracted_tasks.map((t: any) => JSON.stringify({
          title: t.title,
          description: t.description || "",
          priority: "MEDIUM",
          assigneeName: t.assignee_name || "Unassigned",
          assigneeId: t.assignee_id || "",
        }));
      } else {
        serializedActionItems = (summaryResult.action_items || []).map((a: string) => JSON.stringify({
          title: a,
          description: "",
          priority: "MEDIUM",
          assigneeName: "Unassigned",
          assigneeId: "",
        }));
      }

      await saveAiSummary({
        projectId: summaryProject.id,
        projectName: currentProj?.name || summaryProject.name,
        topic: topic || "Discussion Summary",
        summary: summaryResult.summary,
        keyFindings: summaryResult.key_points || [],
        actionItems: serializedActionItems,
        deadlineSuggestions: [],
        confidence: 100,
        model: "LangChain Context Engine",
        status: "Archived",
        createdBy: currentUserEmail,
        messageCount: summaryResult.message_count,
      });
      setSummarySaved(true);
      showToast("✓ Summary saved successfully!");
    } catch (err) {
      setSummaryError(err instanceof Error ? err.message : "Could not save summary.");
    } finally {
      setSavingSummary(false);
    }
  };

  const allDisplayMessages = liveMessages.map((m) => ({
    id: m.id,
    senderId: m.senderId,
    senderName: m.senderName || "Researcher",
    content: m.content,
    createdAt: m.createdAt ? new Date(m.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "Just now",
    replyToId: m.replyToId,
    replyToSender: m.replyToSender,
    replyToContent: m.replyToContent,
  }));

  const filteredMessages = allDisplayMessages.filter((m) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    const content = (editedContents[m.id] || m.content).toLowerCase();
    return content.includes(q) || m.senderName.toLowerCase().includes(q);
  });

  const channelList: Channel[] = projects.map((p) => ({
    id: p.id,
    projectId: p.id,
    teamId: p.teamId,
    name: `#${p.name.toLowerCase().replace(/\s+/g, "-")}`,
    project: p.name,
  }));


  if (!mounted) return <div suppressHydrationWarning />;

  if (loading) return <LoadingState variant="researcher-chat" title="Loading Channels & Chat..." subtitle="Connecting to WebSocket STOMP broker" />;

  return (
    <div style={{ position: "relative", flex: 1, width: "100%", display: "flex", flexDirection: "column", height: "100%", overflow: "hidden" }} suppressHydrationWarning>
      {/* Page Header */}
      <div style={s.headerRow}>
        <h1 style={s.pageTitle}>Project Chat</h1>
      </div>

      {/* Split Chat Panel */}
      <div style={s.chatLayout}>
        {/* Left: Channels List */}
        <div style={s.channelsCard}>
          <div style={{ padding: "16px 20px 12px", borderBottom: "1px solid #eeeeee" }}>
            <span style={{ fontSize: 11, fontWeight: 600, color: "#9e9e9e", letterSpacing: "0.6px", textTransform: "uppercase" }}>PROJECT CHANNELS</span>
          </div>
          <div style={s.channelList}>
            {channelList.length === 0 ? (
              <div style={{ padding: "30px 16px", textAlign: "center", color: "#9e9e9e", fontSize: 12 }}>No active project channels</div>
            ) : (
              channelList.map((ch) => {
                const active = selectedChannel?.id === ch.id;
                return (
                  <div key={ch.id} onClick={() => setSelectedChannel(ch)} style={active ? s.channelItemActive : s.channelItem}>
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

        {/* Right: Active Chat Conversation */}
        <div style={s.conversationCard}>
          {selectedChannel ? (
            <>
              {/* Conversation Header */}
              <div style={s.convHeader}>
                <div>
                  <h3 style={s.convTitle}>{selectedChannel.name}</h3>
                  <p style={s.convSub}>
                    {selectedChannel.project} • {assignedProjectMembers.length > 0
                      ? assignedProjectMembers.map(m => m.displayName || m.email).join(", ")
                      : "No assigned project members"}
                  </p>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  {/* Search */}
                  <div style={{ position: "relative", display: "flex", alignItems: "center" }}>
                    <input
                      type="text"
                      placeholder="Search messages..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      style={{ padding: "5px 12px 5px 26px", fontSize: 12, borderRadius: 14, border: "1px solid #e2e8f0", outline: "none", width: 150, background: "#f8fafc", color: "#0f172a" }}
                    />
                    <span style={{ position: "absolute", left: 8, fontSize: 11, color: "#94a3b8" }}>🔍</span>
                    {searchQuery && (
                      <button type="button" onClick={() => setSearchQuery("")} style={{ position: "absolute", right: 6, background: "none", border: "none", cursor: "pointer", color: "#94a3b8", fontSize: 10 }}>✕</button>
                    )}
                  </div>
                  {/* Live indicator */}
                  <div style={s.lockPill}>
                    <span style={{ fontSize: 8, color: isConnected ? "#2e7d32" : "#ed6c02" }}>●</span>{" "}
                    {isConnected ? "STOMP WebSocket Live" : "Connecting..."}
                  </div>
                  {/* Summarize */}
                  <button
                    id="btn-summarize-ai"
                    onClick={handleTriggerAiEngine}
                    style={selectionMode ? { ...s.summarizeBtn, background: "#161616", color: "#fff", borderColor: "#161616" } : s.summarizeBtn}
                    title="Select messages to summarize with AI"
                  >
                    {selectionMode ? "✕ Cancel Selection" : (summarizing ? "Summarizing..." : "⚡ Summarize with AI")}
                  </button>
                </div>
              </div>

              {/* Messages Stream */}
              <div ref={messagesBoxRef} onScroll={handleMessagesScroll} style={s.messagesBox}>
                {isLoadingHistory ? (
                  <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: 260, padding: 40 }}>
                    <div style={{ width: 32, height: 32, border: "3px solid #e5e7eb", borderTop: "3px solid #161616", borderRadius: "50%", animation: "spin 0.8s linear infinite", marginBottom: 12 }} />
                    <p style={{ fontSize: 13, color: "#111827", fontWeight: 600, margin: 0 }}>Loading {selectedChannel.name} messages…</p>
                    <p style={{ fontSize: 11, color: "#6b7280", margin: 0, marginTop: 2 }}>Fetching conversation history from database</p>
                  </div>
                ) : (
                  <>
                    {isLoadingMore && (
                      <div style={{ textAlign: "center", padding: "8px 0", color: "#616161", fontSize: 12, display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}>
                        <div style={{ width: 14, height: 14, border: "2px solid #ccc", borderTop: "2px solid #161616", borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
                        Loading older messages…
                      </div>
                    )}
                    {hasMore && !isLoadingMore && (
                      <div style={{ textAlign: "center", padding: "4px 0 8px" }}>
                        <button
                          type="button"
                          onClick={() => { if (messagesBoxRef.current) prevScrollHeightRef.current = messagesBoxRef.current.scrollHeight; loadMoreMessages(); }}
                          style={{ fontSize: 11, fontWeight: 600, color: "#4f46e5", background: "#f0f4ff", border: "1px solid #c7d2fe", padding: "4px 12px", borderRadius: 12, cursor: "pointer" }}
                        >
                          ↑ Load older messages
                        </button>
                      </div>
                    )}
                    {filteredMessages.length === 0 ? (
                      <div style={{ textAlign: "center", padding: "40px 20px", color: "#9e9e9e", fontSize: 13 }}>
                        {searchQuery ? `🔍 No messages found matching "${searchQuery}"` : `💬 No messages in ${selectedChannel.name} yet.`}
                      </div>
                    ) : (
                      filteredMessages.map((m) => {
                        const displaySender = getSenderDisplayName(m, teamMembers);
                        
                        const isMe =
                          m.id.startsWith("opt-") ||
                          m.senderId === "me" ||
                          (myUserId && m.senderId === myUserId) ||
                          (m.senderName && m.senderName.toLowerCase() === currentUserEmail.toLowerCase()) ||
                          (m.senderName && m.senderName.toLowerCase() === currentDisplayName.toLowerCase());

                        const isSelected = selectedIds.has(m.id);
                        const senderColor = getSenderColor(displaySender);
                        const isDeleted = deletedIds.has(m.id);
                        const isEditing = editingId === m.id;
                        const displayContent = editedContents[m.id] || m.content;
                        const msgReactions = reactions[m.id] || {};

                        return (
                          <div
                            key={m.id}
                            onDoubleClick={(e) => { e.stopPropagation(); if (typeof window !== "undefined" && window.getSelection) window.getSelection()?.removeAllRanges(); setActiveActionMsgId((prev) => (prev === m.id ? null : m.id)); }}
                            style={{
                              position: "relative", display: "flex", justifyContent: isMe ? "flex-end" : "flex-start",
                              alignItems: "flex-end", width: "100%", marginTop: 6, marginBottom: 2,
                              paddingTop: selectionMode ? 4 : 0, paddingBottom: selectionMode ? 4 : 0,
                              paddingLeft: selectionMode ? 4 : 0, paddingRight: selectionMode ? 4 : (isMe ? 4 : 0),
                              borderRadius: selectionMode ? 8 : 0,
                              background: selectionMode && isSelected ? "#f0f4ff" : "transparent",
                              cursor: selectionMode ? "pointer" : "default",
                            }}
                            onClick={selectionMode ? () => handleToggleMessageSelect(m.id) : undefined}
                          >
                            {/* Double-Click Quick Actions */}
                            {activeActionMsgId === m.id && !isDeleted && !selectionMode && (
                              <div
                                onClick={(e) => e.stopPropagation()}
                                style={{ position: "absolute", top: -26, [isMe ? "right" : "left"]: isMe ? 8 : 40, background: "#ffffff", border: "1px solid #cbd5e1", borderRadius: 18, padding: "2px 8px", display: "flex", alignItems: "center", gap: 4, boxShadow: "0 4px 12px rgba(0,0,0,0.12)", zIndex: 30 }}
                              >
                                <button title="Reply" type="button" onClick={(e) => { e.stopPropagation(); setActiveActionMsgId(null); setReplyingTo({ id: m.id, senderName: isMe ? "You" : m.senderName, content: displayContent }); }} style={s.actionBtn}>💬</button>
                                <button title="Thumbs Up" type="button" onClick={(e) => { e.stopPropagation(); handleToggleReaction(m.id, "👍"); }} style={s.actionBtn}>👍</button>
                                <button title="Heart" type="button" onClick={(e) => { e.stopPropagation(); handleToggleReaction(m.id, "❤️"); }} style={s.actionBtn}>❤️</button>
                                <button title="Rocket" type="button" onClick={(e) => { e.stopPropagation(); handleToggleReaction(m.id, "🚀"); }} style={s.actionBtn}>🚀</button>
                                <button title="Copy Text" type="button" onClick={(e) => { e.stopPropagation(); setActiveActionMsgId(null); handleCopyText(displayContent); }} style={s.actionBtn}>📋</button>
                                {isMe && <button title="Edit" type="button" onClick={(e) => { e.stopPropagation(); setActiveActionMsgId(null); handleStartEdit(m); }} style={s.actionBtn}>✏️</button>}
                                {isMe && <button title="Delete" type="button" onClick={(e) => { e.stopPropagation(); setActiveActionMsgId(null); handleDeleteMessage(m.id); }} style={s.actionBtnDanger}>🗑️</button>}
                              </div>
                            )}

                            {selectionMode && <input type="checkbox" checked={isSelected} readOnly style={{ marginRight: 8, accentColor: "#4f46e5", alignSelf: "center" }} />}

                            {/* Other-user Avatar */}
                            {!isMe && (
                              <div style={{ width: 32, height: 32, borderRadius: "50%", background: senderColor, color: "#ffffff", fontSize: 11, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center", marginRight: 8, flexShrink: 0, marginBottom: 2, boxShadow: "0 1px 3px rgba(0,0,0,0.1)" }}>
                                {getInitials(displaySender)}
                              </div>
                            )}

                            <div style={{ display: "flex", flexDirection: "column", alignItems: isMe ? "flex-end" : "flex-start", maxWidth: "68%" }}>
                              <div style={isMe ? s.bubbleMe : s.bubbleThem}>
                                <div style={s.msgHeader}>
                                  <strong style={{ fontSize: 11, fontWeight: 700, color: isMe ? "#dbeafe" : senderColor }}>
                                    {isMe ? "You" : displaySender}
                                  </strong>
                                  <span style={{ fontSize: 10, color: isMe ? "#93c5fd" : "#94a3b8" }}>
                                    {m.createdAt} {editedContents[m.id] ? "(edited)" : ""}
                                  </span>
                                </div>

                                {/* Quoted Reply Snippet */}
                                {m.replyToContent && !isDeleted && (
                                  <div style={{ padding: "4px 8px", marginBottom: 6, borderRadius: 6, background: isMe ? "rgba(255,255,255,0.15)" : "#f1f5f9", borderLeft: `3px solid ${isMe ? "#ffffff" : "#2563eb"}`, fontSize: 11 }}>
                                    <strong style={{ color: isMe ? "#dbeafe" : "#2563eb", display: "block" }}>{m.replyToSender || "Message"}</strong>
                                    <span style={{ color: isMe ? "#f1f5f9" : "#475569", fontStyle: "italic" }}>{m.replyToContent}</span>
                                  </div>
                                )}

                                {isDeleted ? (
                                  <p style={{ fontSize: 12, fontStyle: "italic", color: isMe ? "#e2e8f0" : "#94a3b8", margin: 0 }}>🚫 This message was deleted</p>
                                ) : isEditing ? (
                                  <div style={{ display: "flex", flexDirection: "column", gap: 6, marginTop: 4 }}>
                                    <input type="text" value={editingText} onChange={(e) => setEditingText(e.target.value)} style={{ padding: "4px 8px", fontSize: 12, borderRadius: 4, border: "1px solid #ccc", color: "#111827" }} />
                                    <div style={{ display: "flex", gap: 6, justifyContent: "flex-end" }}>
                                      <button type="button" onClick={() => setEditingId(null)} style={{ fontSize: 10, padding: "2px 6px", borderRadius: 4, background: "none", border: "1px solid #ccc", cursor: "pointer", color: isMe ? "#fff" : "#161616" }}>Cancel</button>
                                      <button type="button" onClick={() => handleSaveEdit(m.id)} style={{ fontSize: 10, padding: "2px 6px", borderRadius: 4, background: "#161616", color: "#fff", border: "none", cursor: "pointer" }}>Save</button>
                                    </div>
                                  </div>
                                ) : (
                                  <p style={{ fontSize: 13, lineHeight: 1.45, margin: 0, color: isMe ? "#f8fafc" : "#0f172a", wordBreak: "break-word" }}>{displayContent}</p>
                                )}
                              </div>

                              {/* Emoji Reactions */}
                              {Object.entries(msgReactions).some(([, count]) => count > 0) && !isDeleted && (
                                <div style={{ display: "flex", gap: 4, marginTop: 3 }}>
                                  {Object.entries(msgReactions).map(([emoji, count]) =>
                                    count > 0 ? (
                                      <span key={emoji} onClick={() => handleToggleReaction(m.id, emoji)} style={{ fontSize: 11, background: "#ffffff", border: "1px solid #cbd5e1", borderRadius: 12, padding: "1px 6px", cursor: "pointer", boxShadow: "0 1px 2px rgba(0,0,0,0.05)" }}>
                                        {emoji} {count}
                                      </span>
                                    ) : null
                                  )}
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })
                    )}
                  </>
                )}
              </div>

              {/* Reply Preview Banner */}
              {replyingTo && (
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "8px 16px", background: "#e0e7ff", borderTop: "1px solid #bfdbfe", borderLeft: "4px solid #2563eb", fontSize: 12 }}>
                  <div style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    <strong style={{ color: "#1d4ed8", marginRight: 6 }}>Replying to {replyingTo.senderName}:</strong>
                    <span style={{ color: "#475569", fontStyle: "italic" }}>"{replyingTo.content}"</span>
                  </div>
                  <button type="button" onClick={() => setReplyingTo(null)} style={{ background: "none", border: "none", cursor: "pointer", color: "#64748b", fontWeight: 700 }}>✕</button>
                </div>
              )}

              {/* Message Input */}
              <form onSubmit={handleSendMessage} style={s.inputRow}>
                <input
                  id="input-message"
                  type="text"
                  placeholder={replyingTo ? `Replying to ${replyingTo.senderName}...` : `Message ${selectedChannel.name}...`}
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  style={s.msgInput}
                />
                <button id="btn-send" type="submit" style={s.btnSend}>Send</button>
              </form>
            </>
          ) : (
            <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: 40, textAlign: "center", color: "#9e9e9e" }}>
              <span style={{ fontSize: 36, marginBottom: 12 }}>📁</span>
              <h3 style={{ fontSize: 16, fontWeight: 600, color: "#111827", marginBottom: 6 }}>No Project Selected</h3>
              <p style={{ fontSize: 13, maxWidth: 320, marginBottom: 16 }}>You'll see chat channels here once you're assigned to a project.</p>
              <Link href="/dashboard/researcher/projects" style={{ background: "#161616", color: "#ffffff", padding: "8px 16px", borderRadius: 4, textDecoration: "none", fontSize: 13, fontWeight: 600 }}>View My Projects</Link>
            </div>
          )}
        </div>
      </div>

      {/* Floating selection toolbar */}
      {selectionMode && (
        <div style={s.selectionToolbar}>
          <span style={s.selectionCount}>{selectedIds.size} message{selectedIds.size > 1 ? "s" : ""} selected</span>
          <button style={s.selectionClearBtn} onClick={() => setSelectedIds(new Set())}>Clear</button>
          <button style={s.selectionClearBtn} onClick={handleSelectAll}>Select All</button>
          <button id="btn-run-summarize" style={{ ...s.selectionSummarizeBtn, opacity: selectedIds.size === 0 ? 0.5 : 1 }} onClick={handleSummarize} disabled={summarizing || selectedIds.size === 0}>
            {summarizing ? "Summarizing..." : `Summarize ${selectedIds.size > 0 ? `(${selectedIds.size})` : ""} →`}
          </button>
        </div>
      )}

      {/* Summary Error Banner */}
      {summaryError && (
        <div style={s.errorBanner}>
          ⚠️ {summaryError}
          <button style={s.errorClose} onClick={() => setSummaryError(null)}>✕</button>
        </div>
      )}

      {/* Summary Modal */}
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
                  <ul style={s.modalList}>{summaryResult.key_points.map((kp, i) => <li key={i} style={s.modalListItem}>{kp}</li>)}</ul>
                </div>
              )}
              {summaryResult.action_items.length > 0 && (
                <div style={s.modalSection}>
                  <div style={s.modalSectionTitle}>✅ Action Items</div>
                  <ul style={s.modalList}>{summaryResult.action_items.map((ai, i) => <li key={i} style={s.modalListItem}>{ai}</li>)}</ul>
                </div>
              )}
            </div>
            {summaryError && <p role="alert" style={{ color: "#b42318", padding: "0 20px" }}>{summaryError}</p>}
            <div style={s.modalFooter}>
              <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                <button style={s.modalCopyBtn} onClick={handleSaveSummary} disabled={savingSummary || summarySaved}>
                  {summarySaved ? "✓ Added to summaries" : savingSummary ? "Adding..." : "Add to summaries"}
                </button>
                <button style={s.modalCopyBtn} onClick={() => copyToClipboard(`Summary:\n${summaryResult.summary}\n\nKey Points:\n${summaryResult.key_points.map(k => `• ${k}`).join("\n")}\n\nAction Items:\n${summaryResult.action_items.map(a => `• ${a}`).join("\n")}`)}>📋 Copy</button>
                <button style={s.modalCloseBtn} onClick={() => setSummaryResult(null)}>Close</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Toast */}
      {toastMessage && (
        <div style={{ position: "fixed", bottom: 24, right: 24, background: "#161616", color: "#ffffff", padding: "10px 18px", borderRadius: 12, fontSize: 12, fontWeight: 600, boxShadow: "0 4px 14px rgba(0,0,0,0.18)", zIndex: 9999, display: "flex", alignItems: "center", gap: 8 }}>
          <span>✓ {toastMessage}</span>
        </div>
      )}
    </div>
  );
}

const s: Record<string, React.CSSProperties> = {
  headerRow: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12, flexShrink: 0 },
  pageTitle: { fontSize: 24, fontWeight: 700, color: "#111827", letterSpacing: "-0.5px", margin: 0 },
  chatLayout: { display: "flex", gap: 20, alignItems: "stretch", flex: 1, minHeight: 0, overflow: "hidden" },
  channelsCard: { width: 320, minWidth: 300, background: "#ffffff", border: "1px solid #f3f4f6", borderRadius: 6, display: "flex", flexDirection: "column", overflow: "hidden" },
  channelList: { display: "flex", flexDirection: "column", flex: 1, overflowY: "auto" },
  channelItem: { padding: "14px 18px", borderBottom: "1px solid #f3f4f6", cursor: "pointer", display: "flex", flexDirection: "column", gap: 4, background: "#ffffff", transition: "background 0.1s" },
  channelItemActive: { padding: "14px 18px", borderBottom: "1px solid #f3f4f6", cursor: "pointer", display: "flex", flexDirection: "column", gap: 4, background: "#fafafa", borderLeft: "3px solid #161616" },
  channelTop: { display: "flex", justifyContent: "space-between", alignItems: "center" },
  chName: { fontSize: 13, fontWeight: 600, color: "#111827" },
  chNameActive: { fontSize: 13, fontWeight: 700, color: "#111827" },
  chProject: { fontSize: 11, color: "#9e9e9e" },
  conversationCard: { flex: 1, background: "#ffffff", border: "1px solid #f3f4f6", borderRadius: 6, display: "flex", flexDirection: "column", overflow: "hidden" },
  convHeader: { padding: "16px 24px", borderBottom: "1px solid #eeeeee", display: "flex", alignItems: "center", justifyContent: "space-between", background: "#fafafa" },
  convTitle: { fontSize: 15, fontWeight: 700, color: "#111827" },
  convSub: { fontSize: 12, color: "#9e9e9e", marginTop: 2 },
  lockPill: { fontSize: 11, fontWeight: 600, color: "#15803d", background: "#f0fdf4", border: "1px solid #bbf7d0", padding: "4px 10px", borderRadius: 14, display: "flex", alignItems: "center", gap: 6 },
  messagesBox: { flex: 1, padding: "28px 24px 20px", overflowY: "auto", display: "flex", flexDirection: "column", gap: 14, background: "#fafafa" },
  bubbleMe: { background: "#2563eb", color: "#ffffff", padding: "10px 16px", borderRadius: "16px 16px 2px 16px", minWidth: 160, maxWidth: "68%", boxShadow: "0 2px 6px rgba(37,99,235,0.25)", boxSizing: "border-box" as const, userSelect: "none" as const },
  bubbleThem: { background: "#ffffff", color: "#0f172a", padding: "10px 16px", borderRadius: "16px 16px 16px 2px", border: "1px solid #e2e8f0", minWidth: 160, maxWidth: "68%", boxShadow: "0 1px 3px rgba(0,0,0,0.04)", boxSizing: "border-box" as const, userSelect: "none" as const },
  msgHeader: { display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, marginBottom: 4 },
  inputRow: { display: "flex", gap: 10, padding: "12px 18px", borderTop: "1px solid #e2e8f0", background: "#ffffff" },
  msgInput: { flex: 1, padding: "10px 16px", fontSize: 13, border: "1px solid #e2e8f0", borderRadius: 20, outline: "none", background: "#f8fafc", color: "#0f172a", transition: "border 0.15s ease" },
  btnSend: { padding: "10px 22px", background: "#161616", color: "#ffffff", border: "none", borderRadius: 20, fontSize: 13, fontWeight: 600, cursor: "pointer", boxShadow: "0 2px 4px rgba(0,0,0,0.1)", transition: "transform 0.1s ease, background 0.15s ease" },
  summarizeBtn: { padding: "6px 14px", background: "#ffffff", border: "1px solid #f3f4f6", borderRadius: 6, fontSize: 12, fontWeight: 600, color: "#1c1c1c", cursor: "pointer", display: "flex", alignItems: "center", gap: 6, boxShadow: "0 1px 2px rgba(0,0,0,0.05)", transition: "all 0.15s ease" },
  selectionToolbar: { position: "fixed" as const, bottom: 80, left: "50%", transform: "translateX(-50%)", display: "flex", alignItems: "center", gap: 12, background: "#161616", color: "#fff", borderRadius: 40, padding: "10px 20px", boxShadow: "0 4px 24px rgba(0,0,0,0.25)", zIndex: 200 },
  selectionCount: { fontSize: 13, fontWeight: 500, color: "#e0e0e0" },
  selectionClearBtn: { padding: "5px 12px", fontSize: 12, fontWeight: 500, color: "#ccc", background: "transparent", border: "1px solid #444", borderRadius: 20, cursor: "pointer" },
  selectionSummarizeBtn: { padding: "6px 18px", fontSize: 13, fontWeight: 600, color: "#111827", background: "#ffffff", border: "none", borderRadius: 20, cursor: "pointer" },
  errorBanner: { position: "fixed" as const, bottom: 140, left: "50%", transform: "translateX(-50%)", background: "#fff3e0", border: "1px solid #ffb74d", borderRadius: 12, padding: "10px 16px", fontSize: 13, color: "#e65100", display: "flex", alignItems: "center", gap: 10, zIndex: 200, maxWidth: 500 },
  errorClose: { background: "none", border: "none", cursor: "pointer", color: "#e65100", fontWeight: 700, fontSize: 14 },
  modalOverlay: { position: "fixed" as const, inset: 0, background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 400, padding: 24 },
  modalBox: { background: "#ffffff", borderRadius: 16, width: "100%", maxWidth: 560, maxHeight: "80vh", display: "flex", flexDirection: "column" as const, overflow: "hidden", boxShadow: "0 20px 60px rgba(0,0,0,0.3)" },
  modalHeader: { display: "flex", alignItems: "center", gap: 10, padding: "18px 20px 14px", borderBottom: "1px solid #f3f4f6" },
  modalTitle: { fontSize: 16, fontWeight: 700, color: "#111827", flex: 1 },
  modalMeta: { fontSize: 11, color: "#9e9e9e", background: "#f5f5f5", borderRadius: 20, padding: "2px 10px" },
  modalClose: { background: "none", border: "none", fontSize: 16, cursor: "pointer", color: "#9e9e9e", padding: 4 },
  modalBody: { flex: 1, overflowY: "auto" as const, padding: "20px 24px", display: "flex", flexDirection: "column" as const, gap: 20 },
  summaryText: { fontSize: 14, lineHeight: 1.7, color: "#374151", margin: 0, padding: "14px 16px", background: "#f9f9f9", borderRadius: 12, borderLeft: "3px solid #4f46e5" },
  modalSection: { display: "flex", flexDirection: "column" as const, gap: 8 },
  modalSectionTitle: { fontSize: 13, fontWeight: 700, color: "#111827", letterSpacing: "0.2px" },
  modalList: { margin: 0, paddingLeft: 20, display: "flex", flexDirection: "column" as const, gap: 6 },
  modalListItem: { fontSize: 13, lineHeight: 1.6, color: "#374151" },
  modalFooter: { display: "flex", justifyContent: "flex-end", gap: 10, padding: "14px 20px", borderTop: "1px solid #f0f0f0" },
  modalCopyBtn: { padding: "7px 16px", fontSize: 13, fontWeight: 500, color: "#4f46e5", background: "#f0f0ff", border: "1px solid #c7d2fe", borderRadius: 12, cursor: "pointer" },
  modalCloseBtn: { padding: "7px 16px", fontSize: 13, fontWeight: 600, color: "#fff", background: "#161616", border: "none", borderRadius: 12, cursor: "pointer" },
  actionBtn: { background: "none", border: "none", cursor: "pointer", fontSize: 13, padding: "2px 4px", borderRadius: 4 },
  actionBtnDanger: { background: "none", border: "none", cursor: "pointer", fontSize: 13, padding: "2px 4px", borderRadius: 4, color: "#ef4444" },
};
