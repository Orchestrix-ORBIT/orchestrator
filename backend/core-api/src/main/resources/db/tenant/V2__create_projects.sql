CREATE TABLE IF NOT EXISTS projects (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name        VARCHAR(255) NOT NULL,
    description TEXT,
    status      VARCHAR(50)  NOT NULL DEFAULT 'ACTIVE',
    owner_id    UUID         NOT NULL REFERENCES users(id),
    team_id     UUID,
    created_at  TIMESTAMPTZ  NOT NULL DEFAULT now(),
    updated_at  TIMESTAMPTZ  NOT NULL DEFAULT now()
);