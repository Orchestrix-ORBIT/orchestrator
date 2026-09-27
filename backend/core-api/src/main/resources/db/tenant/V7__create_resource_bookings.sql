CREATE TABLE resource_bookings (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    resource_id     UUID NOT NULL REFERENCES resources(id) ON DELETE CASCADE,
    user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    start_time      TIMESTAMPTZ NOT NULL,
    end_time        TIMESTAMPTZ NOT NULL,
    status          VARCHAR(50) NOT NULL DEFAULT 'PENDING_APPROVAL',
    purpose         TEXT,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT chk_booking_times CHECK (end_time > start_time)
);

CREATE INDEX idx_resource_bookings_range ON resource_bookings(resource_id, start_time, end_time);
CREATE INDEX idx_resource_bookings_user ON resource_bookings(user_id);
CREATE INDEX idx_resource_bookings_status ON resource_bookings(status);
