package com.example.realtime_service.chat;

import java.time.OffsetDateTime;
import java.util.UUID;

public record ChatMessageResponse(
        UUID id,
        UUID projectId,
        UUID taskId,
        UUID senderId,
        String senderName,
        String content,
        OffsetDateTime createdAt
) {}
