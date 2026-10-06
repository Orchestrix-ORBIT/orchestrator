package com.example.core_api.ai;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.UUID;

public record SavedSummaryResponse(UUID id, UUID projectId, String title, String summary,
                                   List<String> keyPoints, List<String> actionItems,
                                   int messageCount, String strategy, OffsetDateTime processedAt) {
    static SavedSummaryResponse from(SavedSummary saved) {
        return new SavedSummaryResponse(saved.getId(), saved.getProjectId(), saved.getTitle(),
                saved.getSummary(), saved.getKeyPoints(), saved.getActionItems(),
                saved.getMessageCount(), saved.getStrategy(), saved.getProcessedAt());
    }
}
