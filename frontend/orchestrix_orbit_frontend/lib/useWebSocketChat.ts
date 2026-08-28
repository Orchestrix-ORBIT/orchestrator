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
}

const WS_URL = "http://localhost:8080/ws";
const API_BASE = "http://localhost:8080";

export function useWebSocketChat(projectId: string) {
  const [messages, setMessages] = useState<ChatMessageItem[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const stompClientRef = useRef<Client | null>(null);

  // 1. Fetch historical messages via REST API
  const fetchHistory = useCallback(async () => {
    if (!projectId) return;
    try {
      const tenant = getTenantSlug() || "myorg";
      const res = await fetch(`${API_BASE}/api/chat/projects/${projectId}/messages`, {
        headers: {
          "X-Tenant-ID": tenant,
        },
      });
      if (res.ok) {
        const data = await res.json();
        setMessages(data);
      }
    } catch (e) {
      console.warn("Could not load chat history:", e);
    }
  }, [projectId]);

  // 2. Connect STOMP over SockJS / WebSocket
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
        client.subscribe(`/topic/project/${projectId}`, (message: IMessage) => {
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

  // 3. Send message over STOMP channel
  const sendMessage = useCallback(
    (content: string, senderDisplayName?: string) => {
      if (!content.trim() || !projectId) return;

      const tenant = getTenantSlug() || "myorg";
      const userEmail = getEmail() || "Researcher";
      const senderName = senderDisplayName || userEmail;

      const payload = {
        projectId,
        content: content.trim(),
        senderName,
        tenantId: tenant,
      };

      const optimisticMsg: ChatMessageItem = {
        id: `opt-${Date.now()}`,
        projectId,
        senderId: "me",
        senderName,
        content: content.trim(),
        createdAt: new Date().toISOString(),
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
    error,
    sendMessage,
    refetchHistory: fetchHistory,
  };
}
