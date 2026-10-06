"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import LoadingState from "@/components/ui/LoadingState";
import { useWebSocketChat } from "@/lib/useWebSocketChat";
import { getEmail, getTenantSlug, getUserId } from "@/lib/auth";
import { summarizeMessages, SummaryResult } from "@/lib/services/summarize";
import { saveAiSummary } from "@/lib/services/aiSummaries";
import { SavedSummariesService } from "@/lib/services/savedSummaries";

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
  if (parts.length >= 2) {
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }
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

/** Convert email/raw string to readable display name.
 *  1. Roster lookup by email. 2. Humanise local part.
 */
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

export default function ChatPage() {
  const [mounted, setMounted] = useState(false);
  const [loading, setLoading] = useState(true);
  const [projects, setProjects] = useState<any[]>([]);
  const [teamMembers, setTeamMembers] = useState<any[]>([]);
  const [selectedChannel, setSelectedChannel] = useState<Channel | null>(null);
  const [assignedProjectMembers, setAssignedProjectMembers] = useState<any[]>([]);
  const [inputText, setInputText] = useState("");
  // ── AI Summarization state ───────────────────────────────────────────────
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [summarizing, setSummarizing] = useState(false);
  const [summaryResult, setSummaryResult] = useState<SummaryResult | null>(null);
  const [summaryError, setSummaryError] = useState<string | null>(null);
  const [summaryProject, setSummaryProject] = useState<{ id: string; name: string } | null>(null);
  const [savingSummary, setSavingSummary] = useState(false);
  const [summarySaved, setSummarySaved] = useState(false);
  const [aiTriggered, setAiTriggered] = useState(false);
  // Per-user task suggestions (lead only, FR-AI-07/08)
  interface SuggestedTask { senderName: string; senderId?: string; title: string; description: string; priority: string; rejected: boolean; }
  const [suggestedTasks, setSuggestedTasks] = useState<SuggestedTask[]>([]);
  const [createdTaskTitles, setCreatedTaskTitles] = useState<Set<string>>(new Set());
  const [approvingTask, setApprovingTask] = useState<string | null>(null); // senderName being approved
  const [openAssigneeDropdownId, setOpenAssigneeDropdownId] = useState<string | null>(null);
  const [assigneeSearchQuery, setAssigneeSearchQuery] = useState("");

  // ── Industry Standard Chat state ──────────────────────────────────────────
  const [replyingTo, setReplyingTo] = useState<{ id: string; senderName: string; content: string } | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [deletedIds, setDeletedIds] = useState<Set<string>>(new Set());
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingText, setEditingText] = useState("");
  const [editedContents, setEditedContents] = useState<Record<string, string>>({});
  const [reactions, setReactions] = useState<Record<string, Record<string, number>>>({});
  const [hoveredMsgId, setHoveredMsgId] = useState<string | null>(null);
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
      const nextCount = currentCount > 0 ? 0 : 1;
      return {
        ...prev,
        [msgId]: {
          ...msgReactions,
          [emoji]: nextCount,
        },
      };
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

  // Close action toolbar on clicking anywhere else on screen
  useEffect(() => {
    if (!activeActionMsgId) return;
    const handleOutsideClick = () => {
      setActiveActionMsgId(null);
    };
    window.addEventListener("click", handleOutsideClick);
    return () => {
      window.removeEventListener("click", handleOutsideClick);
    };
  }, [activeActionMsgId]);

  useEffect(() => {
    setMounted(true);
  }, []);

  const currentUserEmail = getEmail() || "Research Admin";
  const currentUserId = getUserId() || "";

  const currentDisplayName = React.useMemo(() => {
    return getSenderDisplayName({ senderName: currentUserEmail }, teamMembers);
  }, [currentUserEmail, teamMembers]);

  const myUserId = React.useMemo(() => {
    if (currentUserId) return currentUserId;
    const currentMember = teamMembers.find(m => (m.email || m.userEmail || "").toLowerCase() === currentUserEmail.toLowerCase());
    return currentMember?.userId || currentMember?.id;
  }, [currentUserId, currentUserEmail, teamMembers]);

  // Load real projects and team members from database API
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
              name: data[0].name.toLowerCase().replace(/\s+/g, "-"),
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

  const [isLoadingMembers, setIsLoadingMembers] = useState(false);

  useEffect(() => {
    if (!selectedChannel) {
      setAssignedProjectMembers([]);
      return;
    }
    const assignmentsMap = typeof window !== "undefined" ? JSON.parse(localStorage.getItem("project_assigned_members") || "{}") : {};
    const localAssignedIds: string[] = assignmentsMap[selectedChannel.projectId] || [];

    if (selectedChannel.teamId) {
      setIsLoadingMembers(true);
      TeamsService.getTeamMembers(selectedChannel.teamId)
        .then(members => {
          setAssignedProjectMembers(members);
        })
        .catch(() => {
          setAssignedProjectMembers([]);
        })
        .finally(() => {
          setIsLoadingMembers(false);
        });
    } else {
      setAssignedProjectMembers([]);
    }
  }, [selectedChannel, teamMembers]);

  const activeProjectId = selectedChannel ? selectedChannel.projectId : "";
  const {
    messages: liveMessages,
    isConnected,
    isLoadingHistory,
    isLoadingMore,
    hasMore,
    sendMessage,
    loadMoreMessages,
  } = useWebSocketChat(activeProjectId, 15);

  const messagesBoxRef = useRef<HTMLDivElement>(null);
  const prevScrollHeightRef = useRef<number>(0);

  // Auto-scroll to bottom when channel changes or new message arrives
  useEffect(() => {
    if (!isLoadingHistory && messagesBoxRef.current && !isLoadingMore && prevScrollHeightRef.current === 0) {
      messagesBoxRef.current.scrollTop = messagesBoxRef.current.scrollHeight;
    }
  }, [liveMessages.length, isLoadingHistory, selectedChannel?.id]);

  // Restore scroll position after loading older messages via reverse pagination
  useEffect(() => {
    if (messagesBoxRef.current && prevScrollHeightRef.current > 0) {
      const newScrollHeight = messagesBoxRef.current.scrollHeight;
      const heightDiff = newScrollHeight - prevScrollHeightRef.current;
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

  const handleTriggerAiEngine = () => {
    setSelectionMode((prev) => !prev);
    setSelectedIds(new Set());
    setSummaryResult(null);
    setSummaryError(null);
    setSummarySaved(false);
    setAiTriggered(false);
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
    // Capture the selected messages
    const selectedMessages = liveMessages.filter((m) => selectedIds.has(m.id));
    const selected = selectedMessages.map((m) => ({ 
      senderName: m.senderName || "Lead", 
      senderId: m.senderId || "",
      content: m.content, 
      createdAt: m.createdAt 
    }));
    
    // Unique senders mapping to their user IDs for accurate task assignment
    const senderMap = new Map<string, string>();
    selectedMessages.forEach((m) => {
      const name = m.senderName || "Researcher";
      if (!senderMap.has(name)) {
        senderMap.set(name, m.senderId || "");
      }
    });
    const uniqueSenders = Array.from(senderMap.keys());
    setSummarizing(true);
    setSummaryError(null);
    setSummaryResult(null);
    setSummarySaved(false);
    setSuggestedTasks([]);
    setCreatedTaskTitles(new Set());
    try {
      const result = await summarizeMessages(selected, activeProjectId, getTenantSlug() || "myorg");
      setSummaryResult(result);
      setSummaryProject({ id: activeProjectId, name: selectedChannel?.project || "Chat" });
      setSelectionMode(false);
      setSelectedIds(new Set());

      // Build suggested tasks strictly from the AI's extracted_tasks response
      if (result.extracted_tasks && result.extracted_tasks.length > 0) {
        const tasks: SuggestedTask[] = result.extracted_tasks.map((taskData) => ({
          senderName: taskData.assignee_name,
          senderId: taskData.assignee_id || undefined,
          title: taskData.title,
          description: taskData.description || `Extracted from chat summary in #${selectedChannel?.project || "project"}.`,
          priority: "MEDIUM",
          rejected: false,
        }));
        setSuggestedTasks(tasks);
      } else if (result.action_items && result.action_items.length > 0 && uniqueSenders.length > 0) {
        // Fallback to legacy behavior if AI didn't return extracted_tasks
        const tasks: SuggestedTask[] = uniqueSenders.map((sender, idx) => ({
          senderName: sender,
          senderId: senderMap.get(sender) || undefined,
          title: result.action_items[idx % result.action_items.length],
          description: `Extracted from chat summary in #${selectedChannel?.project || "project"}.`,
          priority: "MEDIUM",
          rejected: false,
        }));
        setSuggestedTasks(tasks);
      }
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
      const currentProj = projects.find((p: any) => p.id === summaryProject.id);
      const topic = summaryResult.summary.length > 70 ? summaryResult.summary.slice(0, 67) + "..." : summaryResult.summary;
      
      const serializedActionItems = suggestedTasks
        .filter(t => !t.rejected && !createdTaskTitles.has(t.senderName))
        .map(t => JSON.stringify({
          title: t.title,
          description: t.description,
          priority: t.priority,
          assigneeName: t.senderName,
          assigneeId: t.senderId,
        }));

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
        status: "Pending Approval",
        createdBy: currentUserEmail,
        messageCount: summaryResult.message_count,
      });
      setSummarySaved(true);
      showToast("✓ Added to AI Summaries for review!");
    } catch (err) {
      setSummaryError(err instanceof Error ? err.message : "Could not save summary.");
    } finally {
      setSavingSummary(false);
    }
  };

  const handleUpdateSuggestedTask = (senderName: string, field: "title" | "description" | "priority", value: string) => {
    setSuggestedTasks((prev) => prev.map((t) => t.senderName === senderName ? { ...t, [field]: value } : t));
  };

  const handleRejectTask = (senderName: string) => {
    setSuggestedTasks((prev) => prev.map((t) => t.senderName === senderName ? { ...t, rejected: true } : t));
  };

  const handleApproveTask = async (task: SuggestedTask) => {
    if (!summaryProject || approvingTask) return;
    setApprovingTask(task.senderName);
    try {
      const { TasksService } = await import("@/lib/services/tasks");
      
      let finalAssigneeId = task.senderId;
      if (!finalAssigneeId) {
        // Fallback: Find assignee by name in teamMembers
        const member = teamMembers.find((m: any) =>
          (m.displayName || m.userDisplayName || m.name || "").toLowerCase() === task.senderName.toLowerCase()
        );
        finalAssigneeId = member?.id || member?.userId;
      }

      await TasksService.create(summaryProject.id, {
        title: task.title,
        description: task.description,
        priority: task.priority as any,
        assigneeId: finalAssigneeId || undefined,
      });
      setCreatedTaskTitles((prev) => new Set(prev).add(task.senderName));
      showToast(`✓ Task created for ${task.senderName}!`);
    } catch (err) {
      setSummaryError(err instanceof Error ? err.message : "Failed to create task.");
    } finally {
      setApprovingTask(null);
    }
  };

  const allDisplayMessages = liveMessages.map((m) => ({
    id: m.id,
    senderId: m.senderId,
    senderName: m.senderName || "Researcher",
    content: m.content,
    createdAt: m.createdAt ? new Date(m.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : "Just now",
    replyToId: m.replyToId,
    replyToSender: m.replyToSender,
    replyToContent: m.replyToContent,
  }));

  const filteredMessages = allDisplayMessages.filter((m) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    const content = (editedContents[m.id] || m.content).toLowerCase();
    const sender = m.senderName.toLowerCase();
    return content.includes(q) || sender.includes(q);
  });

  const channelList: Channel[] = projects.map((p) => ({
    id: p.id,
    projectId: p.id,
    teamId: p.teamId,
    name: p.name.toLowerCase().replace(/\s+/g, "-"),
    project: p.name,
  }));


  if (!mounted) {
    return <div suppressHydrationWarning />;
  }

  if (loading) {
    return <LoadingState variant="researcher-chat" title="Workspace Chat" />;
  }

  return (
    <div style={{ position: "relative", flex: 1, width: "100%", display: "flex", flexDirection: "column", height: "100%", overflow: "hidden", paddingRight: 20, paddingBottom: 20 }} suppressHydrationWarning>
      <style>{`
        .chat-search-input {
          padding: 6px 12px 6px 28px;
          font-size: 12px;
          border-radius: 16px;
          border: 1px solid #e2e8f0;
          outline: none;
          width: 160px;
          background: #f8fafc;
          color: #0f172a;
          transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
        }
        .chat-search-input:hover {
          background: #ffffff;
          border-color: #cbd5e1;
        }
        .chat-search-input:focus {
          background: #ffffff;
          border-color: #3b82f6;
          box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
          width: 220px;
        }
        .stomp-pill {
          font-size: 11px;
          font-weight: 600;
          color: #475569;
          background: #ffffff;
          border: 1px solid #e2e8f0;
          padding: 5px 12px;
          border-radius: 16px;
          display: flex;
          align-items: center;
          gap: 6px;
          transition: all 0.2s ease;
          cursor: default;
          box-shadow: 0 1px 2px rgba(0,0,0,0.02);
        }
        .stomp-pill:hover {
          background: #f8fafc;
          border-color: #cbd5e1;
          box-shadow: 0 2px 4px rgba(0,0,0,0.04);
        }
        .chat-action-btn {
          padding: 6px 14px;
          background: #ffffff;
          border: 1px solid #e2e8f0;
          border-radius: 8px;
          font-size: 12px;
          font-weight: 600;
          color: #0f172a;
          cursor: pointer;
          display: flex;
          align-items: center;
          gap: 6px;
          box-shadow: 0 1px 2px rgba(0,0,0,0.02);
          transition: all 0.2s ease;
        }
        .chat-action-btn:hover {
          background: #f8fafc;
          border-color: #cbd5e1;
          box-shadow: 0 2px 4px rgba(0,0,0,0.04);
          transform: translateY(-1px);
        }
        .chat-action-btn.active-selection {
          background: #161616;
          color: #ffffff;
          border: 1px solid #161616;
          box-shadow: 0 4px 12px rgba(0,0,0,0.1);
        }
        .chat-action-btn.active-selection:hover {
          background: #2a2a2a;
          transform: translateY(-1px);
        }
        
        /* New AI Summarization UI Styles */
        .selection-bar-btn {
          padding: 6px 12px;
          font-size: 12px;
          font-weight: 500;
          color: #475569;
          background: #f8fafc;
          border: 1px solid #e2e8f0;
          border-radius: 6px;
          cursor: pointer;
          transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
        }
        .selection-bar-btn:hover {
          background: #ffffff;
          border-color: #cbd5e1;
          color: #0f172a;
          box-shadow: 0 2px 4px rgba(0,0,0,0.04);
        }
        .selection-summarize-btn {
          padding: 6px 16px;
          font-size: 13px;
          font-weight: 600;
          color: #ffffff;
          background: #0f172a;
          border: 1px solid #0f172a;
          border-radius: 6px;
          cursor: pointer;
          transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
          box-shadow: 0 1px 2px rgba(0,0,0,0.05);
        }
        .selection-summarize-btn:hover:not(:disabled) {
          background: #1e293b;
          border-color: #1e293b;
          transform: translateY(-1px);
          box-shadow: 0 4px 6px rgba(0,0,0,0.1);
        }
        .selection-summarize-btn:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .summary-modal {
          background: rgba(255, 255, 255, 0.98);
          backdrop-filter: blur(12px);
          border-radius: 16px;
          width: 100%;
          max-width: 640px;
          max-height: 85vh;
          display: flex;
          flex-direction: column;
          overflow: hidden;
          box-shadow: 0 24px 48px rgba(0,0,0,0.12), 0 4px 12px rgba(0,0,0,0.08), 0 0 0 1px rgba(255,255,255,0.5) inset;
          border: 1px solid rgba(226, 232, 240, 0.8);
          animation: slideUp 0.4s cubic-bezier(0.16, 1, 0.3, 1);
        }
        @keyframes slideUp {
          from { opacity: 0; transform: translateY(10px) scale(0.98); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }
        @keyframes slideUpBar {
          from { opacity: 0; transform: translate(-50%, 20px); }
          to { opacity: 1; transform: translate(-50%, 0); }
        }

        .suggested-task-card {
          background: #ffffff;
          border: 1px solid #e2e8f0;
          border-radius: 12px;
          padding: 16px;
          transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
          display: flex;
          flex-direction: column;
          gap: 12px;
          box-shadow: 0 1px 3px rgba(0,0,0,0.02);
        }
        .suggested-task-card:hover {
          border-color: #94a3b8;
          box-shadow: 0 8px 24px rgba(0,0,0,0.06);
          transform: translateY(-2px);
        }
        
        .task-input {
          width: 100%;
          padding: 8px 12px;
          font-size: 13px;
          border-radius: 8px;
          border: 1px solid #e2e8f0;
          background: #f8fafc;
          color: #0f172a;
          transition: all 0.2s ease;
          outline: none;
        }
        .task-input:focus {
          border-color: #3b82f6;
          box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
          background: #ffffff;
        }
        
        .task-textarea {
          width: 100%;
          padding: 8px 12px;
          font-size: 13px;
          border-radius: 8px;
          border: 1px solid #e2e8f0;
          background: #f8fafc;
          color: #334155;
          transition: all 0.2s ease;
          outline: none;
          resize: vertical;
          min-height: 60px;
          font-family: inherit;
        }
        .task-textarea:focus {
          border-color: #3b82f6;
          box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
          background: #ffffff;
        }
        
        .task-select {
          width: 120px;
          padding: 8px 12px;
          font-size: 12px;
          font-weight: 500;
          border-radius: 8px;
          border: 1px solid #e2e8f0;
          background: #f8fafc;
          color: #0f172a;
          transition: all 0.2s ease;
          outline: none;
          cursor: pointer;
          appearance: none;
          background-image: url("data:image/svg+xml;charset=US-ASCII,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%2214%22%20height%3D%2214%22%20viewBox%3D%220%200%2024%2024%22%20fill%3D%22none%22%20stroke%3D%22%2364748b%22%20stroke-width%3D%222%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%3E%3Cpolyline%20points%3D%226%209%2012%2015%2018%209%22%3E%3C%2Fpolyline%3E%3C%2Fsvg%3E");
          background-repeat: no-repeat;
          background-position: right 8px center;
          padding-right: 28px;
        }
        .task-select:focus {
          border-color: #3b82f6;
          box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
          background-color: #ffffff;
        }
        .task-select:hover {
          border-color: #cbd5e1;
        }
        
        .task-action-btn {
          padding: 8px 14px;
          font-size: 12px;
          font-weight: 600;
          border-radius: 6px;
          cursor: pointer;
          transition: all 0.2s ease;
          border: 1px solid transparent;
        }
        .task-action-btn.approve {
          background: linear-gradient(135deg, #2563eb, #4f46e5);
          color: #ffffff;
          box-shadow: 0 2px 4px rgba(37, 99, 235, 0.2);
        }
        .task-action-btn.approve:hover {
          background: linear-gradient(135deg, #1d4ed8, #4338ca);
          transform: translateY(-1px);
          box-shadow: 0 4px 8px rgba(37, 99, 235, 0.3);
        }
        .task-action-btn.reject {
          background: #ffffff;
          color: #64748b;
          border-color: #e2e8f0;
        }
        .task-action-btn.reject:hover {
          background: #f1f5f9;
          color: #ef4444;
          border-color: #fca5a5;
        }
      `}</style>
      {/* ── Page Header ────────────────────────────────────────────────────── */}
      <div style={s.headerRow}>
        <h1 style={s.pageTitle}>Workspace Chat</h1>
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
                      <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={active ? "#2563eb" : "#94a3b8"} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="4" y1="9" x2="20" y2="9"></line><line x1="4" y1="15" x2="20" y2="15"></line><line x1="10" y1="3" x2="8" y2="21"></line><line x1="16" y1="3" x2="14" y2="21"></line></svg>
                        <span style={active ? s.chNameActive : s.chName}>{ch.name}</span>
                      </span>
                    </div>
                    <span style={{ ...s.chProject, marginLeft: 20 }}>{ch.project}</span>
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
                  <h3 style={{ ...s.convTitle, display: "flex", alignItems: "center", gap: 8 }}>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#64748b" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="4" y1="9" x2="20" y2="9"></line><line x1="4" y1="15" x2="20" y2="15"></line><line x1="10" y1="3" x2="8" y2="21"></line><line x1="16" y1="3" x2="14" y2="21"></line></svg>
                    {selectedChannel.name}
                  </h3>
                  <p style={s.convSub}>
                    {selectedChannel.project} • {isLoadingMembers ? (
                      <span className="animate-pulse" style={{ display: 'inline-block', width: '120px', height: '10px', background: '#e2e8f0', borderRadius: '4px', marginLeft: '4px' }}></span>
                    ) : (
                      assignedProjectMembers.length > 0 ? assignedProjectMembers.map(m => m.displayName || m.email).join(", ") : "No assigned project members"
                    )}
                  </p>
                </div>

                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <div style={{ position: "relative", display: "flex", alignItems: "center" }}>
                    <input
                      type="text"
                      placeholder="Search messages..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="chat-search-input"
                    />
                    <span style={{ position: "absolute", left: 8, fontSize: 11, color: "#94a3b8" }}>🔍</span>
                    {searchQuery && (
                      <button
                        type="button"
                        onClick={() => setSearchQuery("")}
                        style={{ position: "absolute", right: 6, background: "none", border: "none", cursor: "pointer", color: "#94a3b8", fontSize: 10 }}
                      >
                        ✕
                      </button>
                    )}
                  </div>
                  <div className="stomp-pill">
                    <span style={{ fontSize: 8, color: isConnected ? "#22c55e" : "#f59e0b" }}>●</span>{" "}
                    {isConnected ? "Live Sync" : "Connecting..."}
                  </div>
                  <button 
                    id="btn-summarize-ai"
                    onClick={handleTriggerAiEngine}
                    className={`chat-action-btn ${selectionMode ? 'active-selection' : ''}`}
                    title="Select messages to summarize with AI"
                  >
                    {selectionMode ? "✕ Cancel Selection" : (summarizing ? "Summarizing..." : "⚡ Summarize with AI")}
                  </button>
                </div>
              </div>

              {/* Messages Stream */}
              <div ref={messagesBoxRef} onScroll={handleMessagesScroll} style={s.messagesBox}>
                {isLoadingHistory ? (
                  <div className="animate-pulse" style={{ display: "flex", flexDirection: "column", gap: 24, padding: "10px 0" }}>
                    <div style={{ alignSelf: "flex-start", width: "60%" }}>
                      <div style={{ display: "flex", gap: 10, alignItems: "center", marginBottom: 8 }}>
                        <div style={{ width: 32, height: 32, borderRadius: "50%", background: "#f1f5f9" }} />
                        <div style={{ width: 100, height: 12, background: "#f1f5f9", borderRadius: 4 }} />
                      </div>
                      <div style={{ width: "100%", height: 50, background: "#f1f5f9", borderRadius: "16px 16px 16px 2px", marginLeft: 42 }} />
                    </div>
                    <div style={{ alignSelf: "flex-end", width: "40%" }}>
                      <div style={{ display: "flex", gap: 10, alignItems: "center", marginBottom: 8, justifyContent: "flex-end" }}>
                        <div style={{ width: 60, height: 12, background: "#e2e8f0", borderRadius: 4 }} />
                      </div>
                      <div style={{ width: "100%", height: 40, background: "#e2e8f0", borderRadius: "16px 16px 2px 16px" }} />
                    </div>
                    <div style={{ alignSelf: "flex-start", width: "70%" }}>
                      <div style={{ display: "flex", gap: 10, alignItems: "center", marginBottom: 8 }}>
                        <div style={{ width: 32, height: 32, borderRadius: "50%", background: "#f1f5f9" }} />
                        <div style={{ width: 140, height: 12, background: "#f1f5f9", borderRadius: 4 }} />
                      </div>
                      <div style={{ width: "100%", height: 70, background: "#f1f5f9", borderRadius: "16px 16px 16px 2px", marginLeft: 42 }} />
                    </div>
                  </div>
                ) : (
                  <>
                    {/* Reverse Pagination Top Indicator */}
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
                          onClick={() => {
                            if (messagesBoxRef.current) {
                              prevScrollHeightRef.current = messagesBoxRef.current.scrollHeight;
                            }
                            loadMoreMessages();
                          }}
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
                            onDoubleClick={(e) => {
                              e.stopPropagation();
                              if (typeof window !== "undefined" && window.getSelection) {
                                window.getSelection()?.removeAllRanges();
                              }
                              setActiveActionMsgId((prev) => (prev === m.id ? null : m.id));
                            }}
                            style={{
                              position: "relative",
                              display: "flex",
                              justifyContent: isMe ? "flex-end" : "flex-start",
                              alignItems: "flex-end",
                              width: "100%",
                              marginTop: 2,
                              marginBottom: 2,
                              paddingTop: 4,
                              paddingBottom: 4,
                              paddingLeft: 4,
                              paddingRight: 4,
                              borderRadius: 8,
                              background: selectionMode && isSelected ? "#f8fafc" : "transparent",
                              border: selectionMode && isSelected ? "1px solid #cbd5e1" : "1px solid transparent",
                              cursor: selectionMode ? "pointer" : "default",
                              transition: "background 0.15s ease, border 0.15s ease",
                            }}
                            onClick={selectionMode ? () => handleToggleMessageSelect(m.id) : undefined}
                          >
                            {/* Double-Click Quick Actions Bar */}
                            {activeActionMsgId === m.id && !isDeleted && !selectionMode && (
                              <div
                                onClick={(e) => e.stopPropagation()}
                                style={{
                                  position: "absolute",
                                  top: -26,
                                  [isMe ? "right" : "left"]: isMe ? 8 : 40,
                                  background: "#ffffff",
                                  border: "1px solid #cbd5e1",
                                  borderRadius: 18,
                                  padding: "2px 8px",
                                  display: "flex",
                                  alignItems: "center",
                                  gap: 4,
                                  boxShadow: "0 4px 12px rgba(0,0,0,0.12)",
                                  zIndex: 30,
                                }}
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

                            {selectionMode && (
                              <input type="checkbox" checked={isSelected} readOnly style={{ marginRight: 8, accentColor: "#4f46e5", alignSelf: "center" }} />
                            )}
                            {!isMe && (
                              <div style={{
                                width: 32,
                                height: 32,
                                borderRadius: "50%",
                                background: senderColor,
                                color: "#ffffff",
                                fontSize: 11,
                                fontWeight: 700,
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                marginRight: 8,
                                flexShrink: 0,
                                marginBottom: 2,
                                boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
                              }}>
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
                                  <div style={{
                                    padding: "4px 8px",
                                    marginBottom: 6,
                                    borderRadius: 6,
                                    background: isMe ? "rgba(255,255,255,0.15)" : "#f1f5f9",
                                    borderLeft: `3px solid ${isMe ? "#ffffff" : "#2563eb"}`,
                                    fontSize: 11,
                                  }}>
                                    <strong style={{ color: isMe ? "#dbeafe" : "#2563eb", display: "block" }}>
                                      {m.replyToSender || "Message"}
                                    </strong>
                                    <span style={{ color: isMe ? "#f1f5f9" : "#475569", fontStyle: "italic" }}>
                                      {m.replyToContent}
                                    </span>
                                  </div>
                                )}

                                {isDeleted ? (
                                  <p style={{ fontSize: 12, fontStyle: "italic", color: isMe ? "#e2e8f0" : "#94a3b8", margin: 0 }}>
                                    🚫 This message was deleted
                                  </p>
                                ) : isEditing ? (
                                  <div style={{ display: "flex", flexDirection: "column", gap: 6, marginTop: 4 }}>
                                    <input
                                      type="text"
                                      value={editingText}
                                      onChange={(e) => setEditingText(e.target.value)}
                                      style={{
                                        padding: "4px 8px",
                                        fontSize: 12,
                                        borderRadius: 4,
                                        border: "1px solid #ccc",
                                        color: "#111827",
                                      }}
                                    />
                                    <div style={{ display: "flex", gap: 6, justifyContent: "flex-end" }}>
                                      <button type="button" onClick={() => setEditingId(null)} style={{ fontSize: 10, padding: "2px 6px", borderRadius: 4, background: "none", border: "1px solid #ccc", cursor: "pointer", color: isMe ? "#fff" : "#161616" }}>Cancel</button>
                                      <button type="button" onClick={() => handleSaveEdit(m.id)} style={{ fontSize: 10, padding: "2px 6px", borderRadius: 4, background: "#161616", color: "#fff", border: "none", cursor: "pointer" }}>Save</button>
                                    </div>
                                  </div>
                                ) : (
                                  <p style={{ fontSize: 13, lineHeight: 1.45, margin: 0, color: isMe ? "#f8fafc" : "#0f172a", wordBreak: "break-word" }}>
                                    {displayContent}
                                  </p>
                                )}
                              </div>

                              {/* Emoji Reactions Badges */}
                              {Object.entries(msgReactions).some(([_, count]) => count > 0) && !isDeleted && (
                                <div style={{ display: "flex", gap: 4, marginTop: 3 }}>
                                  {Object.entries(msgReactions).map(([emoji, count]) =>
                                    count > 0 ? (
                                      <span
                                        key={emoji}
                                        onClick={() => handleToggleReaction(m.id, emoji)}
                                        style={{
                                          fontSize: 11,
                                          background: "#ffffff",
                                          border: "1px solid #cbd5e1",
                                          borderRadius: 12,
                                          padding: "1px 6px",
                                          cursor: "pointer",
                                          boxShadow: "0 1px 2px rgba(0,0,0,0.05)",
                                        }}
                                      >
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

              {/* Quoted Reply Preview Banner */}
              {replyingTo && (
                <div style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  padding: "8px 16px",
                  background: "#e0e7ff",
                  borderTop: "1px solid #bfdbfe",
                  borderLeft: "4px solid #2563eb",
                  fontSize: 12,
                }}>
                  <div style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    <strong style={{ color: "#1d4ed8", marginRight: 6 }}>Replying to {replyingTo.senderName}:</strong>
                    <span style={{ color: "#475569", fontStyle: "italic" }}>"{replyingTo.content}"</span>
                  </div>
                  <button type="button" onClick={() => setReplyingTo(null)} style={{ background: "none", border: "none", cursor: "pointer", color: "#64748b", fontWeight: 700 }}>✕</button>
                </div>
              )}

              {/* Message Input Box */}
              <form onSubmit={handleSendMessage} style={s.inputRow}>
                <input
                  type="text"
                  placeholder={replyingTo ? `Replying to ${replyingTo.senderName}...` : `Message #${selectedChannel.name}...`}
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  style={s.msgInput}
                />
                <button type="submit" disabled={!inputText.trim() || !isConnected} style={{ ...s.btnSend, opacity: inputText.trim() && isConnected ? 1 : 0.6 }}>
                  Send
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="22" y1="2" x2="11" y2="13"></line><polygon points="22 2 15 22 11 13 2 9 22 2"></polygon></svg>
                </button>
              </form>
            </>
          ) : (
            <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: 40, textAlign: "center", color: "#9e9e9e" }}>
              <span style={{ fontSize: 36, marginBottom: 12 }}>📁</span>
              <h3 style={{ fontSize: 16, fontWeight: 600, color: "#111827", marginBottom: 6 }}>No Project Selected</h3>
              <p style={{ fontSize: 13, maxWidth: 320, marginBottom: 16 }}>Create a project in your workspace to enable real-time WebSocket chat rooms.</p>
              <Link href="/lead-dashboard/projects" style={{ background: "#161616", color: "#ffffff", padding: "8px 16px", borderRadius: 4, textDecoration: "none", fontSize: 13, fontWeight: 600 }}>Create Your First Project</Link>
            </div>
          )}
        </div>
      </div>

      {/* ── Floating selection toolbar ─────────────────────────────────────── */}
      {selectionMode && (
        <div style={s.selectionToolbar}>
          <span style={s.selectionCount}>{selectedIds.size} message{selectedIds.size !== 1 ? "s" : ""} selected</span>
          <div style={{ display: "flex", gap: 8 }}>
            <button className="selection-bar-btn" onClick={() => setSelectedIds(new Set())}>Clear</button>
            <button className="selection-bar-btn" onClick={handleSelectAll}>Select All</button>
            <button id="btn-run-summarize" className="selection-summarize-btn" onClick={handleSummarize} disabled={summarizing || selectedIds.size === 0}>
              {summarizing ? "Summarizing..." : `Summarize ${selectedIds.size > 0 ? `(${selectedIds.size})` : ""} →`}
            </button>
          </div>
        </div>
      )}

      {/* ── Summary Error Banner ───────────────────────────────────────────── */}
      {summaryError && !summaryResult && (
        <div style={s.errorBanner}>
          ⚠️ {summaryError}
          <button style={s.errorClose} onClick={() => setSummaryError(null)}>✕</button>
        </div>
      )}

      {/* ── Summary Modal ──────────────────────────────────────────────────── */}
      {summaryResult && (
        <div style={s.modalOverlay} onClick={() => setOpenAssigneeDropdownId(null)}>
          <div className="summary-modal" onClick={(e) => { e.stopPropagation(); setOpenAssigneeDropdownId(null); }}>

            <div style={s.modalHeader}>
              <div style={{...s.modalTitle, display: "flex", alignItems: "center", gap: "8px"}}>
                <span style={{
                  background: "linear-gradient(135deg, #8b5cf6, #3b82f6)", 
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                  fontWeight: 800
                }}>✨ AI Generated Summary</span>
              </div>
              <div style={s.modalMeta}>{summaryResult.message_count} messages analyzed</div>
              <button style={s.modalClose} onClick={() => { setSummaryResult(null); setSuggestedTasks([]); }}>✕</button>
            </div>
            
            <div style={s.modalBody}>
              <div style={s.modalSection}>
                <div style={s.modalSectionTitle}>Executive Summary</div>
                <p style={s.summaryText}>{summaryResult.summary}</p>
              </div>

              {summaryResult.key_points.length > 0 && (
                <div style={s.modalSection}>
                  <div style={s.modalSectionTitle}>🔑 Key Takeaways</div>
                  <ul style={s.modalList}>
                    {summaryResult.key_points.map((kp, i) => <li key={i} style={s.modalListItem}>{kp}</li>)}
                  </ul>
                </div>
              )}

              {/* ── Suggested Tasks — one per unique sender ─────────────── */}
              <div style={{ background: "#ffffff", borderRadius: 8, padding: "16px", border: "1px solid #e2e8f0", marginTop: 4 }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: "#0f172a" }}>
                    🎯 Action Items & Extracted Tasks
                  </div>
                  {suggestedTasks.length > 0 && (
                    <span style={{ fontSize: 11, background: "#f8fafc", color: "#475569", border: "1px solid #e2e8f0", fontWeight: 600, padding: "2px 8px", borderRadius: 12 }}>
                      {suggestedTasks.filter(t => !t.rejected).length} pending approval
                    </span>
                  )}
                </div>

                {suggestedTasks.length === 0 ? (
                  <div style={{ padding: "20px 0", textAlign: "center", color: "#64748b", fontSize: 12, background: "#f8fafc", borderRadius: 6, border: "1px dashed #cbd5e1" }}>
                    <div style={{ fontSize: 20, marginBottom: 8 }}>📋</div>
                    <div style={{ fontWeight: 600, color: "#475569", marginBottom: 4 }}>No action items identified</div>
                    <div>The AI couldn't detect any explicit tasks or action items in this selection.</div>
                  </div>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                    {suggestedTasks.map((task, i) => (
                      <div key={i} className="suggested-task-card" style={{
                        background: task.rejected ? "#fafafa" : createdTaskTitles.has(task.senderName) ? "#f0fdf4" : "#ffffff",
                        borderColor: task.rejected ? "#e2e8f0" : createdTaskTitles.has(task.senderName) ? "#bbf7d0" : "#e2e8f0",
                        opacity: task.rejected ? 0.5 : 1,
                      }}>
                        {/* Header row */}
                        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                          <div style={{ width: 28, height: 28, borderRadius: "50%", background: getSenderColor(task.senderName), display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontSize: 11, fontWeight: 700, flexShrink: 0 }}>
                            {getInitials(task.senderName)}
                          </div>
                          <div style={{ flex: 1, position: "relative" }}>
                            {(!task.rejected && !createdTaskTitles.has(task.senderName)) ? (
                              <div className="custom-dropdown-container" onClick={(e) => e.stopPropagation()}>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setOpenAssigneeDropdownId(openAssigneeDropdownId === i.toString() ? null : i.toString());
                                    setAssigneeSearchQuery("");
                                  }}
                                  style={{
                                    display: "flex", justifyContent: "space-between", alignItems: "center", gap: 6,
                                    padding: "2px 6px", margin: "-2px -6px", fontSize: 12, fontWeight: 600, color: "#0f172a",
                                    borderRadius: 4, border: "1px solid transparent", cursor: "pointer",
                                    background: openAssigneeDropdownId === i.toString() ? "#f1f5f9" : "transparent",
                                    transition: "background 0.2s"
                                  }}
                                  onMouseEnter={e => e.currentTarget.style.background = "#f8fafc"}
                                  onMouseLeave={e => e.currentTarget.style.background = openAssigneeDropdownId === i.toString() ? "#f1f5f9" : "transparent"}
                                >
                                  <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
                                    {task.senderName}
                                    {task.senderName === currentDisplayName && <span style={{ fontSize: 10, background: "#e2e8f0", color: "#475569", padding: "2px 6px", borderRadius: 10, fontWeight: 600 }}>Me</span>}
                                  </span>
                                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#64748b" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M6 9l6 6 6-6"/></svg>
                                </button>
                                
                                {openAssigneeDropdownId === i.toString() && (
                                  <div style={{ position: "absolute", top: "100%", left: 0, marginTop: 4, background: "#ffffff", border: "1px solid #e2e8f0", borderRadius: 8, boxShadow: "0 10px 15px -3px rgba(0,0,0,0.1)", zIndex: 100, minWidth: 200, overflow: "hidden", display: "flex", flexDirection: "column" }}>
                                    <div style={{ padding: "6px", borderBottom: "1px solid #f1f5f9" }}>
                                      <input 
                                        type="text" autoFocus placeholder="Search members..." 
                                        value={assigneeSearchQuery} onChange={(e) => setAssigneeSearchQuery(e.target.value)} 
                                        style={{ width: "100%", padding: "4px 8px", fontSize: 12, border: "1px solid #e2e8f0", borderRadius: 4, outline: "none" }} 
                                        onClick={(e) => e.stopPropagation()} 
                                      />
                                    </div>
                                    <div style={{ maxHeight: 160, overflowY: "auto", display: "flex", flexDirection: "column" }}>
                                      {[{ id: "", displayName: "Unassigned" }, ...assignedProjectMembers]
                                        .filter(mem => {
                                          const name = mem.displayName || mem.userDisplayName || mem.name || mem.email || "Unassigned";
                                          return name.toLowerCase().includes(assigneeSearchQuery.toLowerCase());
                                        })
                                        .map(mem => {
                                          const id = mem.id || mem.userId || "";
                                          const name = mem.displayName || mem.userDisplayName || mem.name || mem.email || "Unassigned";
                                          const isSelected = task.senderName === name;
                                          const isMe = name === currentDisplayName;
                                          return (
                                            <button 
                                              type="button" 
                                              key={id || name || "unassigned"} 
                                              onClick={() => { 
                                                setSuggestedTasks(prev => {
                                                  const newArr = [...prev];
                                                  newArr[i] = { ...newArr[i], senderName: name, senderId: id };
                                                  return newArr;
                                                });
                                                setOpenAssigneeDropdownId(null); 
                                                setAssigneeSearchQuery(""); 
                                              }} 
                                              style={{ padding: "8px 12px", background: isSelected ? "#f8fafc" : "transparent", border: "none", textAlign: "left", fontSize: 12, fontWeight: 500, color: "#0f172a", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "space-between" }} 
                                              onMouseEnter={e => e.currentTarget.style.background = "#f1f5f9"} 
                                              onMouseLeave={e => e.currentTarget.style.background = isSelected ? "#f8fafc" : "transparent"}
                                            >
                                              <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
                                                {name}
                                                {isMe && <span style={{ fontSize: 10, background: "#e2e8f0", color: "#475569", padding: "2px 6px", borderRadius: 10, fontWeight: 600 }}>Me</span>}
                                              </span>
                                              {isSelected && <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>}
                                            </button>
                                          );
                                        })}
                                    </div>
                                  </div>
                                )}
                              </div>
                            ) : (
                              <div style={{ fontSize: 12, fontWeight: 600, color: "#0f172a" }}>{task.senderName}</div>
                            )}
                            <div style={{ fontSize: 11, color: "#64748b" }}>Suggested Assignee</div>
                          </div>
                          {createdTaskTitles.has(task.senderName) ? (
                            <span style={{ fontSize: 11, color: "#15803d", fontWeight: 700, display: "flex", alignItems: "center", gap: 4 }}>
                              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
                              Created
                            </span>
                          ) : task.rejected ? (
                            <span style={{ fontSize: 11, color: "#ef4444", fontWeight: 600 }}>Discarded</span>
                          ) : (
                            <div style={{ display: "flex", gap: 6 }}>
                              <button
                                type="button"
                                onClick={() => handleRejectTask(task.senderName)}
                                className="task-action-btn reject"
                              >
                                Discard
                              </button>
                              <button
                                type="button"
                                onClick={() => handleApproveTask(task)}
                                className="task-action-btn approve"
                                disabled={approvingTask === task.senderName}
                              >
                                {approvingTask === task.senderName ? "Approving..." : "Approve Task"}
                              </button>
                            </div>
                          )}
                        </div>

                        {/* Editable Fields */}
                        {!task.rejected && !createdTaskTitles.has(task.senderName) && (
                          <div style={{ display: "flex", flexDirection: "column", gap: 12, marginTop: 4 }}>
                            
                            {/* Title Field */}
                            <div>
                              <input
                                type="text"
                                value={task.title}
                                onChange={(e) => handleUpdateSuggestedTask(task.senderName, "title", e.target.value)}
                                className="task-input"
                                placeholder="Task title"
                                style={{ fontWeight: 600 }}
                              />
                            </div>
                            
                            {/* Description Field */}
                            <div>
                              <textarea
                                value={task.description}
                                onChange={(e) => handleUpdateSuggestedTask(task.senderName, "description", e.target.value)}
                                className="task-textarea"
                                placeholder="Task description..."
                                rows={2}
                              />
                            </div>

                            {/* Priority Field */}
                            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                              <span style={{ fontSize: 12, fontWeight: 600, color: "#64748b" }}>Priority:</span>
                              <select
                                value={task.priority}
                                onChange={(e) => handleUpdateSuggestedTask(task.senderName, "priority", e.target.value)}
                                className="task-select"
                              >
                                <option value="LOW">Low</option>
                                <option value="MEDIUM">Medium</option>
                                <option value="HIGH">High</option>
                              </select>
                            </div>
                            
                          </div>
                        )}
                        
                        {(task.rejected || createdTaskTitles.has(task.senderName)) && (
                          <div style={{ fontSize: 12, color: "#0f172a", fontWeight: 500, padding: "4px 0" }}>
                            {task.title}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {summaryError && <p role="alert" style={{ color: "#b42318", padding: "0 24px", fontSize: 12, margin: 0 }}>{summaryError}</p>}
            
            <div style={s.modalFooter}>
              <div style={{ display: "flex", gap: 10, width: "100%", justifyContent: "flex-end" }}>
                <button className="selection-bar-btn" style={{ marginRight: "auto" }} onClick={() => copyToClipboard(`Summary:\n${summaryResult.summary}\n\nKey Points:\n${summaryResult.key_points.map(k => `• ${k}`).join("\n")}\n\nAction Items:\n${summaryResult.action_items.map(a => `• ${a}`).join("\n")}`)}>
                  📋 Copy Text
                </button>
                <button className="selection-bar-btn" onClick={() => { setSummaryResult(null); setSuggestedTasks([]); }}>
                  Close
                </button>
                {summarySaved && (
                  <Link href="/lead-dashboard/ai-insights" className="selection-bar-btn" style={{ textDecoration: "none", display: "flex", alignItems: "center" }}>
                    Review in AI Summaries →
                  </Link>
                )}
                <button
                  className="selection-summarize-btn"
                  onClick={handleSaveSummary}
                  disabled={savingSummary || summarySaved}
                  style={summarySaved ? { background: "#15803d", borderColor: "#15803d" } : {}}
                >
                  {savingSummary ? "Saving..." : summarySaved ? "✓ Saved to Database" : "💾 Save Summary"}
                </button>
              </div>
            </div>

          </div>
        </div>
      )}


      {/* ── Toast Notification Banner ────────────────────────────────────── */}
      {toastMessage && (
        <div style={{
          position: "fixed",
          bottom: 24,
          right: 24,
          background: "#161616",
          color: "#ffffff",
          padding: "10px 18px",
          borderRadius: 12,
          fontSize: 12,
          fontWeight: 600,
          boxShadow: "0 4px 14px rgba(0,0,0,0.18)",
          zIndex: 9999,
          display: "flex",
          alignItems: "center",
          gap: 8,
        }}>
          <span>✓ {toastMessage}</span>
        </div>
      )}
    </div>
  );
}

const s: Record<string, React.CSSProperties> = {
  headerRow: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
    flexShrink: 0,
  },
  pageTitle: {
    fontSize: 24,
    fontWeight: 700,
    color: "#0f172a",
    letterSpacing: "-0.5px",
    margin: 0,
  },
  pageSub: {
    fontSize: 12,
    color: "#6b7280",
    margin: 0,
    marginTop: 2,
  },
  statBadge: {
    display: "flex",
    alignItems: "center",
    gap: 6,
    background: "#ffffff",
    border: "1px solid #f3f4f6",
    borderRadius: 6,
    padding: "6px 12px",
    boxShadow: "0 1px 2px rgba(0,0,0,0.03)",
  },
  statBadgeLabel: {
    fontSize: 10,
    fontWeight: 700,
    color: "#6b7280",
    letterSpacing: "0.5px",
  },
  statBadgeValue: {
    fontSize: 12,
    fontWeight: 700,
    color: "#111827",
  },
  chatLayout: {
    display: "flex",
    gap: 20,
    alignItems: "stretch",
    flex: 1,
    minHeight: 0,
    overflow: "hidden",
  },
  channelsCard: {
    width: 280,
    minWidth: 260,
    background: "#ffffff",
    border: "1px solid #e2e8f0",
    borderRadius: 16,
    display: "flex",
    flexDirection: "column",
    overflow: "hidden",
    boxShadow: "0 2px 4px rgba(0,0,0,0.02)",
  },
  channelList: {
    display: "flex",
    flexDirection: "column",
    flex: 1,
    overflowY: "auto",
  },
  channelItem: {
    padding: "14px 18px",
    borderBottom: "1px solid #f3f4f6",
    cursor: "pointer",
    display: "flex",
    flexDirection: "column",
    gap: 4,
    margin: "4px 8px",
    borderRadius: 8,
    background: "transparent",
    transition: "background 0.15s",
  },
  channelItemActive: {
    padding: "14px 18px",
    cursor: "pointer",
    display: "flex",
    flexDirection: "column",
    gap: 4,
    margin: "4px 8px",
    background: "#f1f5f9",
    borderLeft: "4px solid #2563eb",
    borderRadius: "0 8px 8px 0",
  },
  channelTop: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
  },
  chName: {
    fontSize: 14,
    fontWeight: 600,
    color: "#334155",
  },
  chNameActive: {
    fontSize: 14,
    fontWeight: 700,
    color: "#0f172a",
  },
  chProject: {
    fontSize: 12,
    color: "#64748b",
  },
  conversationCard: {
    flex: 1,
    background: "#ffffff",
    border: "1px solid #e2e8f0",
    borderRadius: 16,
    display: "flex",
    flexDirection: "column",
    overflow: "hidden",
    boxShadow: "0 2px 4px rgba(0,0,0,0.02)",
  },
  convHeader: {
    padding: "20px 24px",
    borderBottom: "1px solid #e2e8f0",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    background: "#ffffff",
  },
  convTitle: {
    fontSize: 16,
    fontWeight: 700,
    color: "#0f172a",
  },
  convSub: {
    fontSize: 13,
    color: "#64748b",
    marginTop: 4,
  },
  lockPill: {
    fontSize: 11,
    fontWeight: 600,
    color: "#15803d",
    background: "#f0fdf4",
    border: "1px solid #bbf7d0",
    padding: "4px 10px",
    borderRadius: 14,
    display: "flex",
    alignItems: "center",
    gap: 6,
  },
  messagesBox: {
    flex: 1,
    padding: "28px 24px 20px",
    overflowY: "auto",
    display: "flex",
    flexDirection: "column",
    gap: 14,
    background: "#fafafa",
  },
  msgRowMe: {
    display: "flex",
    justifyContent: "flex-end",
  },
  msgRowThem: {
    display: "flex",
    justifyContent: "flex-start",
    alignItems: "flex-end",
  },
  bubbleMe: {
    background: "#2563eb",
    color: "#ffffff",
    padding: "10px 16px",
    borderRadius: "16px 16px 2px 16px",
    minWidth: 160,
    maxWidth: "68%",
    boxShadow: "0 2px 6px rgba(37, 99, 235, 0.25)",
    boxSizing: "border-box" as const,
    userSelect: "none" as const,
  },
  bubbleThem: {
    background: "#ffffff",
    color: "#0f172a",
    padding: "10px 16px",
    borderRadius: "16px 16px 16px 2px",
    border: "1px solid #e2e8f0",
    minWidth: 160,
    maxWidth: "68%",
    boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
    boxSizing: "border-box" as const,
    userSelect: "none" as const,
  },
  msgHeader: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    marginBottom: 4,
  },
  senderMe: {
    fontSize: 11,
    fontWeight: 600,
    color: "#a1a1aa",
  },
  senderThem: {
    fontSize: 11,
    fontWeight: 700,
    color: "#4f46e5",
  },
  msgTime: {
    fontSize: 10,
    color: "#94a3b8",
  },
  msgText: {
    fontSize: 14,
    lineHeight: 1.5,
  },
  inputRow: {
    display: "flex",
    gap: 12,
    padding: "16px 24px",
    borderTop: "1px solid #e2e8f0",
    background: "#ffffff",
  },
  msgInput: {
    flex: 1,
    padding: "14px 20px",
    fontSize: 14,
    border: "1px solid #e2e8f0",
    borderRadius: 24,
    outline: "none",
    background: "#f8fafc",
    color: "#0f172a",
    transition: "all 0.2s ease",
    boxShadow: "inset 0 1px 2px rgba(0,0,0,0.02)",
  },
  btnSend: {
    padding: "0 24px",
    background: "#2563eb",
    color: "#ffffff",
    border: "none",
    borderRadius: 24,
    fontSize: 14,
    fontWeight: 600,
    cursor: "pointer",
    boxShadow: "0 4px 12px rgba(37, 99, 235, 0.2)",
    transition: "transform 0.1s ease, background 0.15s ease",
    display: "flex",
    alignItems: "center",
    gap: 8,
  },
  summarizeBtn: {
    padding: "6px 14px",
    background: "#ffffff",
    border: "1px solid #f3f4f6",
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
    bottom: 30,
    left: "50%",
    transform: "translateX(-50%)",
    display: "flex",
    alignItems: "center",
    gap: 16,
    background: "#ffffff",
    borderRadius: 12,
    padding: "12px 24px",
    boxShadow: "0 10px 30px rgba(0,0,0,0.1), 0 1px 3px rgba(0,0,0,0.05)",
    border: "1px solid #e2e8f0",
    zIndex: 200,
    animation: "slideUpBar 0.3s cubic-bezier(0.16, 1, 0.3, 1)",
  },
  selectionCount: { fontSize: 13, fontWeight: 700, color: "#0f172a", marginRight: 8 },
  errorBanner: {
    position: "fixed" as const, bottom: 90, left: "50%", transform: "translateX(-50%)",
    background: "#fef2f2", border: "1px solid #fecaca", borderRadius: 8,
    padding: "10px 16px", fontSize: 13, color: "#dc2626", fontWeight: 500,
    display: "flex", alignItems: "center", gap: 10, zIndex: 200, maxWidth: 500,
    boxShadow: "0 4px 6px rgba(0,0,0,0.05)",
  },
  errorClose: { background: "none", border: "none", cursor: "pointer", color: "#ef4444", fontWeight: 700, fontSize: 14, transition: "color 0.15s ease" },
  modalOverlay: {
    position: "fixed" as const, inset: 0, background: "rgba(15, 23, 42, 0.6)",
    display: "flex", alignItems: "center", justifyContent: "center", zIndex: 400, padding: 24,
    backdropFilter: "blur(2px)",
  },
  modalHeader: { display: "flex", alignItems: "center", gap: 12, padding: "20px 28px", borderBottom: "1px solid rgba(226, 232, 240, 0.8)" },
  modalTitle: { fontSize: 18, fontWeight: 700, color: "#0f172a", flex: 1, letterSpacing: "-0.01em" },
  modalMeta: { fontSize: 12, fontWeight: 600, color: "#64748b", background: "#f1f5f9", borderRadius: 8, padding: "4px 10px", border: "1px solid #e2e8f0" },
  modalClose: { background: "none", border: "none", fontSize: 20, cursor: "pointer", color: "#94a3b8", padding: 4, transition: "color 0.2s ease" },
  modalBody: {
    flex: 1, overflowY: "auto" as const, padding: "28px",
    display: "flex", flexDirection: "column" as const, gap: 28,
    background: "#fafafa",
  },
  summaryText: {
    fontSize: 14, lineHeight: 1.6, color: "#334155", margin: 0,
    padding: "20px", background: "#ffffff", borderRadius: 12, border: "1px solid #e2e8f0",
    boxShadow: "0 2px 4px rgba(0,0,0,0.02)"
  },
  modalSection: { display: "flex", flexDirection: "column" as const, gap: 10 },
  modalSectionTitle: { fontSize: 13, fontWeight: 700, color: "#0f172a", letterSpacing: "0.2px", textTransform: "uppercase" as const },
  modalList: { margin: 0, paddingLeft: 20, display: "flex", flexDirection: "column" as const, gap: 8 },
  modalListItem: { fontSize: 14, lineHeight: 1.5, color: "#334155" },
  modalFooter: { display: "flex", justifyContent: "flex-end", gap: 10, padding: "16px 24px", borderTop: "1px solid #e2e8f0", background: "#ffffff" },

  actionBtn: {
    background: "none",
    border: "none",
    cursor: "pointer",
    fontSize: 13,
    padding: "2px 4px",
    borderRadius: 4,
  },
  actionBtnDanger: {
    background: "none",
    border: "none",
    cursor: "pointer",
    fontSize: 13,
    padding: "2px 4px",
    borderRadius: 4,
    color: "#ef4444",
  },
};
