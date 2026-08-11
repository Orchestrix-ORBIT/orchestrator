package com.example.core_api.document;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Data;

/**
 * DTO (Data Transfer Object) for creating a new document.
 *
 * This class is the shape of the JSON body the client sends in a POST request.
 * It is NOT the database entity — it only carries input data and validation rules.
 *
 * The controller receives this object and passes it to the service layer,
 * which then constructs the actual Document entity from it.
 */
@Data   // Lombok: generates getters, setters, equals, hashCode, toString
public class CreateDocumentRequest {

    // ── Required field ────────────────────────────────────────────────────────

    /**
     * The display title of the document.
     * @NotBlank rejects null, empty string "", or whitespace-only " ".
     * @Size caps the length to match the VARCHAR(255) constraint in V9 SQL.
     */
    @NotBlank(message = "Title is required")
    @Size(max = 255, message = "Title must not exceed 255 characters")
    private String title;

    // ── Optional fields ───────────────────────────────────────────────────────

    /**
     * Inline text content of the document, stored encrypted in the DB.
     * Null when the document is a file upload rather than inline text.
     * The actual encryption/decryption is handled by the service layer (future).
     */
    private String contentEncrypted;

    /**
     * Object key pointing to the file stored in MinIO (S3-compatible storage).
     * Format example: "org_acme/projects/uuid/filename.pdf"
     * Null when the document has inline text content instead of a file.
     *
     * @Size caps the length to match the VARCHAR(512) constraint in V9 SQL.
     */
    @Size(max = 512, message = "File storage key must not exceed 512 characters")
    private String fileStorageKey;
}
