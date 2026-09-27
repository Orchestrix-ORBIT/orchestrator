package com.example.core_api.document;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Data;

/**
 * DTO (Data Transfer Object) for creating a new document.
 */
@Data
public class CreateDocumentRequest {

    @NotBlank(message = "Title is required")
    @Size(max = 255, message = "Title must not exceed 255 characters")
    private String title;

    /**
     * Category: MEETING_MINUTES | EXPERIMENTAL_PROTOCOL | PRE_PRINT_PAPER | ARCHIVED_DATASET | OTHER
     */
    private String category = "OTHER";

    /**
     * Inline text content of the document, stored encrypted in the DB.
     */
    private String contentEncrypted;

    /**
     * Object key pointing to the file stored in MinIO.
     */
    @Size(max = 512, message = "File storage key must not exceed 512 characters")
    private String fileStorageKey;
}

