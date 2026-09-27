package com.example.core_api.ai;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.util.List;
import java.util.UUID;

public record SummarizeRequest(
        @NotEmpty @Size(max = 500) List<@Valid Message> messages,
        @NotNull UUID projectId
) {
    public record Message(@NotBlank String senderName, @NotBlank String content, String createdAt) {}
}
