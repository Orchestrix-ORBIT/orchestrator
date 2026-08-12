package com.example.core_api.document;

import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.UUID;

public interface DocumentRepository extends JpaRepository<Document, UUID> {

    // Fetch all documents belonging to a specific project
    List<Document> findAllByProjectId(UUID projectId);

    // Check if a document exists under a given project (used for ownership validation)
    boolean existsByIdAndProjectId(UUID id, UUID projectId);
}
