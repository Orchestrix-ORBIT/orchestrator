package com.example.core_api.ai;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface SavedSummaryRepository extends JpaRepository<SavedSummary, UUID> {
    List<SavedSummary> findAllByOrderByProcessedAtDesc();
}
