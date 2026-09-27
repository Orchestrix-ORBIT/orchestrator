-- V5: Add btree_gist extension and an EXCLUDE constraint on resource_bookings
-- so the database atomically rejects overlapping APPROVED bookings,
-- even under concurrent inserts (race condition protection).

-- Step 1: Enable the btree_gist extension (required for EXCLUDE on non-range columns)
CREATE EXTENSION IF NOT EXISTS btree_gist;

-- Step 2: Add the EXCLUDE constraint.
-- This prevents two APPROVED bookings for the same resource from overlapping in time.
-- tstzrange(start_time, end_time, '[)') means: inclusive start, exclusive end.
ALTER TABLE public.resource_bookings
    ADD CONSTRAINT no_overlapping_approved_bookings
    EXCLUDE USING gist (
        resource_id WITH =,
        tstzrange(start_time, end_time, '[)') WITH &&
    )
    WHERE (status = 'APPROVED');
