"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { Client, IMessage } from "@stomp/stompjs";
import SockJS from "sockjs-client";
import { getTenantSlug, getEmail } from "./auth";

export interface ChatMessageItem {
  id: string;
  projectId: string;
  taskId?: string;
  senderId: string;
  senderName: string;
  content: string;
  createdAt: string;
  replyToId?: string;
  replyToSender?: string;
  replyToContent?: string;
  isDeleted?: boolean;
  isEdited?: boolean;
  reactions?: Record<string, number>;
}

const WS_URL = process.env.NEXT_PUBLIC_CHAT_WS_URL ?? "http://localhost:8082/ws";
const API_BASE = process.env.NEXT_PUBLIC_CHAT_API_URL ?? "http://localhost:8082";

export function useWebSocketChat(projectId: string, pageSize = 15) {
  const [messages, setMessages] = useState<ChatMessageItem[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [isLoadingHistory, setIsLoadingHistory] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const pageRef = useRef(0);
  const stompClientRef = useRef<Client | null>(null);

  // 1. Fetch initial batch of recent messages (page 0)
  const fetchHistory = useCallback(async () => {
    if (!projectId) return;
    setIsLoadingHistory(true);
    pageRef.current = 0;
    try {
      const tenant = getTenantSlug() || "myorg";
      const res = await fetch(
        `${API_BASE}/api/chat/projects/${projectId}/messages?page=0&size=${pageSize}`,
        {
          headers: {
            "X-Tenant-ID": tenant,
          },
        }
      );
      if (res.ok) {
        const data: ChatMessageItem[] = await res.json();
        setMessages(data);
        setHasMore(data.length >= pageSize);
      } else {
        setMessages([]);
        setHasMore(false);
      }
    } catch (e) {
      console.warn("Could not load chat history:", e);
      setMessages([]);
      setHasMore(false);
    } finally {
      setIsLoadingHistory(false);
    }
  }, [projectId, pageSize]);

  // 2. Fetch older messages on scroll up (reverse pagination)
  const loadMoreMessages = useCallback(async () => {
    if (!projectId || isLoadingMore || !hasMore) return;
    const nextPage = pageRef.current + 1;
    setIsLoadingMore(true);
    try {
      const tenant = getTenantSlug() || "myorg";
      const res = await fetch(
        `${API_BASE}/api/chat/projects/${projectId}/messages?page=${nextPage}&size=${pageSize}`,
        {
          headers: {
            "X-Tenant-ID": tenant,
          },
        }
      );
      if (res.ok) {
        const olderData: ChatMessageItem[] = await res.json();
        if (olderData.length > 0) {
          pageRef.current = nextPage;
          setMessages((prev) => {
            const existingIds = new Set(prev.map((m) => m.id));
            const filtered = olderData.filter((m) => !existingIds.has(m.id));
            return [...filtered, ...prev];
          });
        }
        setHasMore(olderData.length >= pageSize);
      } else {
        setHasMore(false);
      }
    } catch (e) {
      console.warn("Could not load older messages:", e);
    } finally {
      setIsLoadingMore(false);
    }
  }, [projectId, pageSize, isLoadingMore, hasMore]);

  // 3. Connect STOMP over SockJS / WebSocket
  useEffect(() => {
    if (!projectId) return;

    fetchHistory();

    const client = new Client({
      webSocketFactory: () => new SockJS(WS_URL),
      reconnectDelay: 5000,
      heartbeatIncoming: 4000,
      heartbeatOutgoing: 4000,
      onConnect: () => {
        setIsConnected(true);
        setError(null);

        // Subscribe to live messages for this project
        const tenant = (getTenantSlug() || "myorg").toLowerCase().replace(/-/g, "_");
        client.subscribe(`/topic/tenant/${tenant}/project/${projectId}`, (message: IMessage) => {
          try {
            const receivedMsg: ChatMessageItem = JSON.parse(message.body);
            setMessages((prev) => {
              if (prev.some((m) => m.id === receivedMsg.id)) {
                return prev;
              }
              // Replace optimistic message if matching content & sender
              const optIndex = prev.findIndex(
                (m) => m.id.startsWith("opt-") && m.content === receivedMsg.content && m.senderName === receivedMsg.senderName
              );
              if (optIndex !== -1) {
                const next = [...prev];
                next[optIndex] = receivedMsg;
                return next;
              }
              return [...prev, receivedMsg];
            });
          } catch (e) {
            console.error("Error parsing incoming message:", e);
          }
        });
      },
      onDisconnect: () => {
        setIsConnected(false);
      },
      onStompError: (frame) => {
        console.error("STOMP error:", frame.headers["message"]);
        setError("Connection error");
      },
    });

    client.activate();
    stompClientRef.current = client;

    return () => {
      if (client.active) {
        client.deactivate();
      }
    };
  }, [projectId, fetchHistory]);

  // 4. Send message over STOMP channel
  const sendMessage = useCallback(
    (
      content: string,
      senderDisplayName?: string,
      replyTo?: { id: string; senderName: string; content: string } | null
    ) => {
      if (!content.trim() || !projectId) return;

      const tenant = getTenantSlug() || "myorg";
      const userEmail = getEmail() || "Researcher";
      const senderName = senderDisplayName || userEmail;

      const payload = {
        projectId,
        content: content.trim(),
        senderName,
        tenantId: tenant,
        replyToId: replyTo?.id || null,
        replyToSender: replyTo?.senderName || null,
        replyToContent: replyTo?.content || null,
      };

      const optimisticMsg: ChatMessageItem = {
        id: `opt-${Date.now()}`,
        projectId,
        senderId: "me",
        senderName,
        content: content.trim(),
        createdAt: new Date().toISOString(),
        replyToId: replyTo?.id,
        replyToSender: replyTo?.senderName,
        replyToContent: replyTo?.content,
      };

      // Optimistically show message immediately in UI
      setMessages((prev) => [...prev, optimisticMsg]);

      if (stompClientRef.current && isConnected) {
        stompClientRef.current.publish({
          destination: "/app/chat.sendMessage",
          body: JSON.stringify(payload),
        });
      }
    },
    [projectId, isConnected]
  );

  return {
    messages,
    isConnected,
    isLoadingHistory,
    isLoadingMore,
    hasMore,
    error,
    sendMessage,
    loadMoreMessages,
    refetchHistory: fetchHistory,
  };
}
