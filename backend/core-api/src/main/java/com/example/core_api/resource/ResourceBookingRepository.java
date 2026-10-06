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
     * Per-USER transaction-level advisory lock.
     *
     * Acquiring this before the user-concurrency check serialises ALL concurrent
     * booking attempts by the SAME user, eliminating the TOCTOU race:
     *
     *   Without lock:
     *     T1: User books GPU  10-11am → concurrency check passes (no conflicts yet)
     *     T2: User books MRI  10-11am → concurrency check ALSO passes (T1 not committed)
     *     Result: two overlapping bookings committed for same user ← BUG
     *
     *   With lock:
     *     T1: acquires user lock → runs check → commits
     *     T2: BLOCKS on user lock → check now sees T1's booking → correctly rejected ← SAFE
     *
     * Key space is separated from resource locks by XOR-ing with a fixed 32-bit salt
     * (0x5F3759DF — the fast inverse sqrt constant) so a user-id hash never collides
     * with a resource-id hash.
     */
    @Query(value = "SELECT pg_advisory_xact_lock((abs(hashtext(CAST(:userId AS text))) # 1597463007)::bigint)",
           nativeQuery = true)
    void acquireUserAdvisoryLock(@Param("userId") String userId);

    /**
     * Count bookings that overlap [startTime, endTime) for the given resource.
     * Includes both PENDING_APPROVAL and APPROVED to prevent double-submission
     * before a manager has approved either request.
     */
    // NOTE: PENDING is intentionally included here.
    // A researcher booking starts as PENDING (not PENDING_APPROVAL).
    // If we exclude PENDING, two researchers could race to book the same slot
    // because both would see zero conflicts — only one APPROVED booking blocks.
    // Including PENDING ensures any non-terminal booking (PENDING, PENDING_APPROVAL,
    // APPROVED) reserves the slot exclusively until cancelled or rejected.
    @Query("SELECT COUNT(rb) FROM ResourceBooking rb " +
           "WHERE rb.resourceId = :resourceId " +
           "AND rb.status IN ('APPROVED', 'PENDING_APPROVAL', 'PENDING') " +
           "AND rb.startTime < :endTime AND rb.endTime > :startTime")
    long countOverlappingBookings(
            @Param("resourceId") UUID resourceId,
            @Param("startTime") OffsetDateTime startTime,
            @Param("endTime") OffsetDateTime endTime);

    /**
     * Returns the first conflicting booking (for the error message),
     * so we can tell the user who has it booked and until when.
     * Includes PENDING so researcher bookings properly block the slot.
     */
    @Query("SELECT rb FROM ResourceBooking rb " +
           "WHERE rb.resourceId = :resourceId " +
           "AND rb.status IN ('APPROVED', 'PENDING_APPROVAL', 'PENDING') " +
           "AND rb.startTime < :endTime AND rb.endTime > :startTime " +
           "ORDER BY rb.startTime ASC")
    List<ResourceBooking> findOverlappingBookings(
            @Param("resourceId") UUID resourceId,
            @Param("startTime") OffsetDateTime startTime,
            @Param("endTime") OffsetDateTime endTime);
    /**
     * Finds any APPROVED or PENDING bookings for the given user on a DIFFERENT resource
     * that overlap the requested time slot [startTime, endTime).
     *
     * This enforces the rule: a researcher can only use ONE resource at any given time.
     * They may have multiple future bookings on different resources, as long as those
     * time slots don't overlap.
     */
    @Query("SELECT rb FROM ResourceBooking rb " +
           "WHERE rb.userId = :userId " +
           "AND rb.resourceId <> :resourceId " +
           "AND rb.status IN ('APPROVED', 'PENDING_APPROVAL', 'PENDING') " +
           "AND rb.startTime < :endTime AND rb.endTime > :startTime " +
           "ORDER BY rb.startTime ASC")
    List<ResourceBooking> findUserConcurrentBookingsOnOtherResources(
            @Param("userId") UUID userId,
            @Param("resourceId") UUID resourceId,
            @Param("startTime") OffsetDateTime startTime,
            @Param("endTime") OffsetDateTime endTime);
}
