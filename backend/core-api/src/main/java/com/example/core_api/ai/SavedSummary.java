package com.example.core_api.ai;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.UUID;

@Entity
@Table(name = "ai_summaries")
@Getter
@Setter
public class SavedSummary {
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(name = "project_id", nullable = false)
    private UUID projectId;

    @Column(name = "transcript_hash", nullable = false)
    private String transcriptHash;

    @Column(name = "summary_text", nullable = false, columnDefinition = "TEXT")
    private String summary;

    private String title;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "key_points", columnDefinition = "jsonb")
    private List<String> keyPoints;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "action_items", columnDefinition = "jsonb")
    private List<String> actionItems;

    @Column(name = "message_count", nullable = false)
    private int messageCount;

    @Column(nullable = false)
    private String strategy;

    @Column(name = "processed_at", nullable = false)
    private OffsetDateTime processedAt;

    @PrePersist
    void onCreate() {
        if (processedAt == null) processedAt = OffsetDateTime.now();
    }
}
