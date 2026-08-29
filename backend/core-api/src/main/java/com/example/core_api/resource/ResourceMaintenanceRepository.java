package com.example.core_api.resource;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.UUID;

@Repository
public interface ResourceMaintenanceRepository extends JpaRepository<ResourceMaintenance, UUID> {
}
