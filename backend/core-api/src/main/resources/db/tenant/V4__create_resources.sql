CREATE TABLE resources (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name            VARCHAR(255) NOT NULL,
    type            VARCHAR(100) NOT NULL,  -- GPU | CPU | STORAGE | DATASET | API_KEY
    description     TEXT,
    owner_id        UUID NOT NULL REFERENCES users(id),
    status          VARCHAR(50) NOT NULL DEFAULT 'AVAILABLE',
    metadata        JSONB DEFAULT '{}',     -- Flexible: GPU model, VRAM, etc.
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE resource_allocations (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    resource_id     UUID NOT NULL REFERENCES resources(id),
    task_id         UUID NOT NULL REFERENCES tasks(id),
    allocated_by    UUID NOT NULL REFERENCES users(id),
    quantity        NUMERIC(10,4),
    allocated_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
    released_at     TIMESTAMPTZ,
    UNIQUE (resource_id, task_id)
);