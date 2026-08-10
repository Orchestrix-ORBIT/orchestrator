package com.example.core_api.resource;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.UUID;

public interface ResourceBookingRepository extends JpaRepository<ResourceBooking, UUID> {
    List<ResourceBooking> findAllByResourceId(UUID resourceId);
    List<ResourceBooking> findAllByUserId(UUID userId);

    @Query("SELECT rb FROM ResourceBooking rb WHERE rb.resourceId = :resourceId AND rb.status = 'APPROVED' " +
           "AND rb.startTime < :endTime AND rb.endTime > :startTime")
    List<ResourceBooking> findOverlappingBookings(
            @Param("resourceId") UUID resourceId,
            @Param("startTime") OffsetDateTime startTime,
            @Param("endTime") OffsetDateTime endTime);
}
