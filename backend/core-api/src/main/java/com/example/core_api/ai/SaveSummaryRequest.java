package com.example.core_api.ai;

import jakarta.validation.constraints.*;
import java.util.List;
import java.util.UUID;

public record SaveSummaryRequest(
        @NotNull UUID projectId,
        @NotBlank @Size(max = 255) String title,
        @NotBlank String summary,
        @NotNull List<@NotBlank String> keyPoints,
        @NotNull List<@NotBlank String> actionItems,
        @Min(1) int messageCount,
        @NotBlank String strategy
) {}
