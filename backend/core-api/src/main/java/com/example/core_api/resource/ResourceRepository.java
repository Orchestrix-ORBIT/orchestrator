package com.example.core_api.resource;

import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.UUID;

public interface ResourceRepository extends JpaRepository<Resource, UUID> {
    List<Resource> findAllByType(ResourceType type);
    List<Resource> findAllByStatus(ResourceStatus status);
}
