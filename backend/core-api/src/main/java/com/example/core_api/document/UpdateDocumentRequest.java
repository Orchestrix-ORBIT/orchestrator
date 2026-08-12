package com.example.core_api.document;

import jakarta.validation.constraints.Size;
import lombok.Data;

/**
 * DTO for updating an existing document (PUT request body).
 *
 * KEY DESIGN CHOICE — all fields are nullable (no @NotBlank):
 * The service layer only applies a field if the client actually sent it
 * (i.e., if it is non-null). This is a "partial update" pattern:
 * the client can send just { "title": "New Name" } without touching other fields.
 *
 * This avoids accidentally overwriting contentEncrypted or fileStorageKey
 * when the client only intends to rename the document.
 */
@Data
public class UpdateDocumentRequest {

    /**
     * New title for the document. Null = keep the existing title unchanged.
     * @Size still guards against oversized input even though the field is optional.
     */
    @Size(max = 255, message = "Title must not exceed 255 characters")
    private String title;

    /**
     * Replacement encrypted content. Null = keep the existing content unchanged.
     * When non-null, the service will also bump the document's version counter
     * (version++) to track that the content has changed.
     */
    private String contentEncrypted;

    /**
     * Replacement MinIO object key (e.g. after re-uploading a file).
     * Null = keep the existing file key unchanged.
     */
    @Size(max = 512, message = "File storage key must not exceed 512 characters")
    private String fileStorageKey;
}
