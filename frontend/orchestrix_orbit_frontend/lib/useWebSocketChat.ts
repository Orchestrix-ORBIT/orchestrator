"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { Client, IMessage } from "@stomp/stompjs";
import SockJS from "sockjs-client";
import { getTenantSlug, getEmail, getToken } from "./auth";
import { fetchProjectMessages, type ChatMessageItem } from "./services/chat";

export type { ChatMessageItem } from "./services/chat";

const WS_URL = process.env.NEXT_PUBLIC_CHAT_WS_URL ?? "http://localhost:8082/ws";

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
      const data = await fetchProjectMessages(projectId, tenant, 0, pageSize);
      setMessages(data);
      setHasMore(data.length >= pageSize);
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
      const olderData = await fetchProjectMessages(projectId, tenant, nextPage, pageSize);
      if (olderData.length > 0) {
        pageRef.current = nextPage;
        setMessages((prev) => {
          const existingIds = new Set(prev.map((m) => m.id));
          const filtered = olderData.filter((m) => !existingIds.has(m.id));
          return [...filtered, ...prev];
        });
      }
      setHasMore(olderData.length >= pageSize);
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
      connectHeaders: { Authorization: `Bearer ${getToken() ?? ""}` },
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
