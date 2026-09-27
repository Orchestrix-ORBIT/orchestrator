package com.example.core_api.resource;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.UUID;

public interface ResourceBookingRepository extends JpaRepository<ResourceBooking, UUID> {
    List<ResourceBooking> findAllByResourceId(UUID resourceId);
    List<ResourceBooking> findAllByUserId(UUID userId);

    /**
     * PostgreSQL transaction-level advisory lock on this resource.
     *
     * pg_advisory_xact_lock(bigint) acquires an EXCLUSIVE lock that is automatically
     * released when the surrounding @Transactional method commits or rolls back.
     *
     * Unlike SELECT FOR UPDATE, this works even when the resource has ZERO existing
     * bookings — which is exactly the race-condition scenario for a fresh slot.
     *
     * We derive a deterministic 64-bit key by taking the least-significant 64 bits
     * of the resource UUID's hashCode, so each resource gets its own lock namespace.
     *
     * Any concurrent transaction that calls this with the same resourceId will BLOCK
     * until the first transaction finishes, then proceed — serialising the check+insert.
     */
    @Query(value = "SELECT pg_advisory_xact_lock(abs(hashtext(CAST(:resourceId AS text))))",
           nativeQuery = true)
    void acquireResourceAdvisoryLock(@Param("resourceId") String resourceId);

    /**
     * Count bookings that overlap [startTime, endTime) for the given resource.
     * Includes both PENDING_APPROVAL and APPROVED to prevent double-submission
     * before a manager has approved either request.
     */
    @Query("SELECT COUNT(rb) FROM ResourceBooking rb " +
           "WHERE rb.resourceId = :resourceId " +
           "AND rb.status IN ('APPROVED', 'PENDING_APPROVAL') " +
           "AND rb.startTime < :endTime AND rb.endTime > :startTime")
    long countOverlappingBookings(
            @Param("resourceId") UUID resourceId,
            @Param("startTime") OffsetDateTime startTime,
            @Param("endTime") OffsetDateTime endTime);

    /**
     * Returns the first conflicting booking (for the error message),
     * so we can tell the user who has it booked and until when.
     */
    @Query("SELECT rb FROM ResourceBooking rb " +
           "WHERE rb.resourceId = :resourceId " +
           "AND rb.status IN ('APPROVED', 'PENDING_APPROVAL') " +
           "AND rb.startTime < :endTime AND rb.endTime > :startTime " +
           "ORDER BY rb.startTime ASC")
    List<ResourceBooking> findOverlappingBookings(
            @Param("resourceId") UUID resourceId,
            @Param("startTime") OffsetDateTime startTime,
            @Param("endTime") OffsetDateTime endTime);
}
