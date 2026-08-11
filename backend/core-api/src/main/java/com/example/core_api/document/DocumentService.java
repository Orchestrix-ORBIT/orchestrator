package com.example.core_api.document;

import com.example.core_api.exception.ResourceNotFoundException;
import com.example.core_api.project.ProjectRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

/**
 * Business logic layer for document management.
 *
 * RESPONSIBILITIES:
 *  - Validate that referenced projects/documents actually exist before acting
 *  - Build Document entities from incoming request DTOs
 *  - Apply partial updates (only non-null fields from UpdateDocumentRequest)
 *  - Delegate persistence to DocumentRepository
 *  - Convert saved entities to DocumentResponse before returning
 *
 * @Transactional at class level means every public method runs inside a DB
 * transaction. If anything throws an exception, the whole operation rolls back
 * automatically — no partial writes reach the database.
 */
@Service
@Transactional
public class DocumentService {

    // ── Dependencies ─────────────────────────────────────────────────────────

    private final DocumentRepository documentRepository;

    /**
     * ProjectRepository is injected here to validate that the project referenced
     * by projectId exists BEFORE we attempt to insert a document row.
     * This prevents orphan documents from being created if a bad UUID is sent.
     */
    private final ProjectRepository projectRepository;

    // Constructor injection (preferred over @Autowired field injection)
    public DocumentService(DocumentRepository documentRepository,
                           ProjectRepository projectRepository) {
        this.documentRepository = documentRepository;
        this.projectRepository = projectRepository;
    }

    // ── CREATE ────────────────────────────────────────────────────────────────

    /**
     * Creates a new document linked to the given project.
     *
     * @param projectId  UUID of the owning project (from URL path)
     * @param authorId   UUID of the user creating the document (from auth context — stubbed for now)
     * @param request    validated request body containing title + optional content/file key
     * @return           the saved document as a response DTO
     * @throws ResourceNotFoundException if the project does not exist
     */
    public DocumentResponse createDocument(UUID projectId, UUID authorId, CreateDocumentRequest request) {

        // Guard: reject the request early if the project doesn't exist.
        // This prevents a foreign-key violation at the DB level and returns a
        // clean 404 instead of a cryptic 500.
        if (!projectRepository.existsById(projectId)) {
            throw new ResourceNotFoundException("Project not found with id: " + projectId);
        }

        // Build the entity using the Lombok @Builder pattern.
        // version starts at 1 (set as @Builder.Default in Document.java).
        Document document = Document.builder()
                .projectId(projectId)
                .authorId(authorId)
                .title(request.getTitle())
                .contentEncrypted(request.getContentEncrypted())
                .fileStorageKey(request.getFileStorageKey())
                .build();

        document = documentRepository.save(document);
        return DocumentResponse.from(document);
    }

    // ── READ (all) ─────────────────────────────────────────────────────────────

    /**
     * Returns all documents that belong to a specific project.
     *
     * @Transactional(readOnly = true) is a performance hint to Hibernate and the
     * DB driver: no dirty-checking is needed, so Hibernate skips its flush phase.
     * This makes read-only queries noticeably faster under load.
     */
    @Transactional(readOnly = true)
    public List<DocumentResponse> getDocumentsByProject(UUID projectId) {
        return documentRepository.findAllByProjectId(projectId)
                .stream()
                .map(DocumentResponse::from)   // method reference → same as doc -> DocumentResponse.from(doc)
                .collect(Collectors.toList());
    }

    // ── READ (single) ──────────────────────────────────────────────────────────

    /**
     * Fetches a single document by its ID.
     *
     * @throws ResourceNotFoundException if no document exists with the given ID
     */
    @Transactional(readOnly = true)
    public DocumentResponse getDocumentById(UUID documentId) {
        Document document = documentRepository.findById(documentId)
                .orElseThrow(() ->
                        new ResourceNotFoundException("Document not found with id: " + documentId));
        return DocumentResponse.from(document);
    }

    // ── UPDATE ─────────────────────────────────────────────────────────────────

    /**
     * Partially updates a document — only applies fields that are non-null in the request.
     *
     * WHY PARTIAL UPDATE PATTERN?
     * If the client only sends { "title": "New Title" }, we should NOT clear
     * contentEncrypted or fileStorageKey. Checking each field for null before
     * setting it ensures untouched fields remain as-is in the database.
     *
     * VERSION BUMP:
     * When contentEncrypted or fileStorageKey changes (i.e., the actual content
     * is being replaced), we increment version to track revision history.
     * This is important for audit trails and future conflict resolution.
     *
     * @throws ResourceNotFoundException if no document with (documentId + projectId) exists
     */
    public DocumentResponse updateDocument(UUID projectId, UUID documentId, UpdateDocumentRequest request) {

        // existsByIdAndProjectId ensures the document belongs to THIS project,
        // preventing one project's users from modifying another project's documents.
        if (!documentRepository.existsByIdAndProjectId(documentId, projectId)) {
            throw new ResourceNotFoundException(
                    "Document not found with id: " + documentId + " in project: " + projectId);
        }

        Document document = documentRepository.findById(documentId)
                .orElseThrow(() ->
                        new ResourceNotFoundException("Document not found with id: " + documentId));

        // Apply only non-null fields from the request
        if (request.getTitle() != null) {
            document.setTitle(request.getTitle());
        }
        if (request.getContentEncrypted() != null) {
            document.setContentEncrypted(request.getContentEncrypted());
            document.setVersion(document.getVersion() + 1);   // bump version on content change
        }
        if (request.getFileStorageKey() != null) {
            document.setFileStorageKey(request.getFileStorageKey());
            document.setVersion(document.getVersion() + 1);   // bump version on file replacement
        }

        document = documentRepository.save(document);
        return DocumentResponse.from(document);
    }

    // ── DELETE ─────────────────────────────────────────────────────────────────

    /**
     * Deletes a document permanently.
     *
     * The existsByIdAndProjectId check is the same ownership guard as in updateDocument:
     * it prevents deleting a document that belongs to a different project.
     *
     * @throws ResourceNotFoundException if the document doesn't exist or belongs to a different project
     */
    public void deleteDocument(UUID projectId, UUID documentId) {
        if (!documentRepository.existsByIdAndProjectId(documentId, projectId)) {
            throw new ResourceNotFoundException(
                    "Document not found with id: " + documentId + " in project: " + projectId);
        }
        documentRepository.deleteById(documentId);
    }
}
