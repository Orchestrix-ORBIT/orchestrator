package com.example.core_api.chat;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

import java.util.UUID;

public record SendChatMessageRequest(
        @NotNull(message = "projectId is required")
        UUID projectId,

        UUID taskId,

        @NotBlank(message = "content is required")
        String content,

        String senderName,

        String tenantId
) {}
