CREATE TABLE IF NOT EXISTS tasks (
    id          UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    title       VARCHAR(255) NOT NULL,
    description TEXT,
    status      VARCHAR(50)  NOT NULL DEFAULT 'TODO',
    priority    VARCHAR(50)  NOT NULL DEFAULT 'MEDIUM',
    project_id  UUID         NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    assignee_id UUID         REFERENCES users(id),
    due_date    DATE,
    created_at  TIMESTAMPTZ  NOT NULL DEFAULT now(),
    updated_at  TIMESTAMPTZ  NOT NULL DEFAULT now()
);