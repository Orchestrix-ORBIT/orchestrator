package com.example.core_api.document;

import com.example.core_api.auth.User;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;


/**
 * REST controller that exposes HTTP endpoints for document management.
 *
 * BASE URL: /api/projects/{projectId}/documents
 *
 * The projectId is part of every URL because documents always belong to a project.
 * This makes the API naturally hierarchical:
 *   GET /api/projects/{projectId}/documents       → list all docs for a project
 *   GET /api/projects/{projectId}/documents/{id}  → get one specific doc
 *
 * RESPONSIBILITIES (controller should stay thin):
 *  - Map HTTP method + URL to a service call
 *  - Extract path variables and request body
 *  - Trigger @Valid validation before the service receives the request
 *  - Set the correct HTTP status code on the response
 *
 * The controller does NOT contain any business logic or DB access.
 * That all lives in DocumentService.
 */
@RestController
@RequestMapping("/api/projects/{projectId}/documents")
public class DocumentController {

    private final DocumentService documentService;

    // Constructor injection — avoids field-level @Autowired
    public DocumentController(DocumentService documentService) {
        this.documentService = documentService;
    }

    // ── POST /api/projects/{projectId}/documents ──────────────────────────────

    /**
     * Creates a new document inside the specified project.
     *
     * @Valid triggers validation on CreateDocumentRequest BEFORE the method body runs.
     * If @NotBlank on title fails, Spring automatically returns 400 Bad Request
     * with a descriptive error — the service is never even called.
     *
     * @ResponseStatus(CREATED) sets the HTTP response code to 201 instead of the
     * default 200. This signals to the client that a resource was created.
     *
     * TODO: Replace the hardcoded STUB_AUTHOR_ID with the real authenticated
     * user's UUID once JWT authentication is wired up (SecurityContext).
     */
    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public DocumentResponse createDocument(
            @PathVariable UUID projectId,
            @AuthenticationPrincipal User currentUser,
            @Valid @RequestBody CreateDocumentRequest request) {

        // STUB: hardcoded author ID until auth is implemented.
        // In production this will be: SecurityContextHolder → JWT claims → user UUID
        UUID authorId = currentUser.getId();
        return documentService.createDocument(projectId, authorId, request);
    }

    // ── GET /api/projects/{projectId}/documents ───────────────────────────────

    /**
     * Returns all documents that belong to the given project.
     * Returns an empty list (not 404) if the project exists but has no documents.
     */
    @GetMapping
    public List<DocumentResponse> getDocumentsByProject(@PathVariable UUID projectId) {
        return documentService.getDocumentsByProject(projectId);
    }

    // ── GET /api/projects/{projectId}/documents/{documentId} ──────────────────

    /**
     * Returns a single document by its ID.
     * projectId is in the path for URL consistency, but the service also uses
     * it to validate ownership (document must belong to this project).
     */
    @GetMapping("/{documentId}")
    public DocumentResponse getDocumentById(
            @PathVariable UUID projectId,
            @PathVariable UUID documentId) {
        return documentService.getDocumentById(documentId);
    }

    // ── PUT /api/projects/{projectId}/documents/{documentId} ──────────────────

    /**
     * Updates an existing document (partial update — only non-null fields are applied).
     *
     * We use @PutMapping (full-update semantics in REST convention), but
     * the service implements partial update behaviour to prevent accidental data loss.
     * No @Valid here because all UpdateDocumentRequest fields are optional.
     */
    @PutMapping("/{documentId}")
    public DocumentResponse updateDocument(
            @PathVariable UUID projectId,
            @PathVariable UUID documentId,
            @RequestBody UpdateDocumentRequest request) {
        return documentService.updateDocument(projectId, documentId, request);
    }

    // ── DELETE /api/projects/{projectId}/documents/{documentId} ───────────────

    /**
     * Deletes a document permanently.
     *
     * @ResponseStatus(NO_CONTENT) returns HTTP 204 — the standard response for
     * a successful DELETE that has no response body to return.
     */
    @DeleteMapping("/{documentId}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void deleteDocument(
            @PathVariable UUID projectId,
            @PathVariable UUID documentId) {
        documentService.deleteDocument(projectId, documentId);
    }
}
