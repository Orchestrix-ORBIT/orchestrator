package com.example.core_api.aisummary;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface AiSummaryRepository extends JpaRepository<AiSummary, UUID> {
    List<AiSummary> findByProjectIdOrderByProcessedAtDesc(UUID projectId);
    List<AiSummary> findAllByOrderByProcessedAtDesc();
    List<AiSummary> findByCreatedByOrderByProcessedAtDesc(UUID createdBy);
    List<AiSummary> findByCreatedByAndProjectIdOrderByProcessedAtDesc(UUID createdBy, UUID projectId);
}
