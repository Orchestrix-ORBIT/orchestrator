package com.example.core_api.document;

import lombok.Builder;
import lombok.Data;
import java.time.OffsetDateTime;
import java.util.UUID;

/**
 * DTO for the API response returned to the client after any document operation.
 *
 * WHY a separate response class instead of returning Document directly?
 * 1. DECOUPLING  — the API contract stays stable even if the DB schema changes.
 * 2. SECURITY    — we control exactly which fields are exposed. For example,
 *                  we include contentEncrypted here for now, but if we add
 *                  internal audit fields later, they won't leak to clients.
 * 3. FLEXIBILITY — we can add computed/derived fields (e.g. a download URL)
 *                  without touching the entity or the database.
 */
@Data
@Builder    // Allows DocumentResponse.builder().id(...).title(...).build()
public class DocumentResponse {

    private UUID id;
    private UUID projectId;
    private UUID authorId;
    private String title;

    // Raw (currently unencrypted in MVP) text content; null for file-based documents
    private String contentEncrypted;

    // MinIO object key; null for inline-text documents
    private String fileStorageKey;

    // Tracks how many times this document's content has been updated
    private int version;

    private OffsetDateTime createdAt;
    private OffsetDateTime updatedAt;

    // ── Static factory ────────────────────────────────────────────────────────

    /**
     * Converts a Document entity (from the database) into a DocumentResponse (for the API).
     *
     * Using a static factory instead of a constructor keeps conversion logic
     * in one place. If a field is added to Document, you update only this method.
     *
     * @param document the JPA entity fetched from the DB
     * @return a fully populated DocumentResponse ready to be serialised to JSON
     */
    public static DocumentResponse from(Document document) {
        return DocumentResponse.builder()
                .id(document.getId())
                .projectId(document.getProjectId())
                .authorId(document.getAuthorId())
                .title(document.getTitle())
                .contentEncrypted(document.getContentEncrypted())
                .fileStorageKey(document.getFileStorageKey())
                .version(document.getVersion())
                .createdAt(document.getCreatedAt())
                .updatedAt(document.getUpdatedAt())
                .build();
    }
}
