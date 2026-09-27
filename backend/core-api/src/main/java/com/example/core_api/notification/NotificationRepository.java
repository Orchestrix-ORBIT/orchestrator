package com.example.core_api.notification;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;
import java.util.UUID;
import java.util.Optional;

@Repository
public interface NotificationRepository extends JpaRepository<Notification, UUID> {
    List<Notification> findAllByUserIdOrderByCreatedAtDesc(UUID userId);
    List<Notification> findAllByUserId(UUID userId);
    Optional<Notification> findByIdAndUserId(UUID id, UUID userId);
}
