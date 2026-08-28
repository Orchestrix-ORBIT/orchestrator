package com.example.realtime_service.chat;

import java.util.UUID;

public record SendChatMessageRequest(
        UUID projectId,
        UUID taskId,
        String content,
        String senderName,
        String tenantId
) {}
