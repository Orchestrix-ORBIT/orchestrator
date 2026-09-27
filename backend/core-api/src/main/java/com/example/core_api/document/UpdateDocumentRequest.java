package com.example.core_api.document;

import jakarta.validation.constraints.Size;
import lombok.Data;

/**
 * DTO for updating an existing document (PUT request body).
 * All fields are nullable — only non-null fields are applied (partial update pattern).
 */
@Data
public class UpdateDocumentRequest {

    @Size(max = 255, message = "Title must not exceed 255 characters")
    private String title;

    /**
     * Category: MEETING_MINUTES | EXPERIMENTAL_PROTOCOL | PRE_PRINT_PAPER | ARCHIVED_DATASET | OTHER
     */
    private String category;

    /**
     * Replacement encrypted content. Null = keep the existing content unchanged.
     * When non-null, the service will also bump the document's version counter.
     */
    private String contentEncrypted;

    /**
     * Replacement MinIO object key. Null = keep the existing file key unchanged.
     */
    @Size(max = 512, message = "File storage key must not exceed 512 characters")
    private String fileStorageKey;
}

