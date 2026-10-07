package com.example.realtime_service.chat;

import java.util.UUID;

public record SendChatMessageRequest(
        UUID projectId,
        UUID taskId,
        String content,
        String senderName,
        UUID senderId,
        String tenantId,
        UUID replyToId,
        String replyToSender,
        String replyToContent
) {}
