CREATE TABLE IF NOT EXISTS resource_maintenance (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    resource_id     UUID REFERENCES resources(id),
    asset_name      VARCHAR(255) NOT NULL,
    category        VARCHAR(100),
    start_date      VARCHAR(255),
    end_date        VARCHAR(255),
    downtime_type   VARCHAR(255),
    technician      VARCHAR(255),
    status          VARCHAR(50) DEFAULT 'Scheduled',
    notes           TEXT,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);
