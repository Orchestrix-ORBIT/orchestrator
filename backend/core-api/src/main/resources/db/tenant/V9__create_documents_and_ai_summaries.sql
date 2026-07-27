CREATE TABLE documents (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id          UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    author_id           UUID NOT NULL REFERENCES users(id),
    title               VARCHAR(255) NOT NULL,
    content_encrypted   TEXT,
    file_storage_key    VARCHAR(512),
    version             INT NOT NULL DEFAULT 1,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE ai_summaries (
    id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id           UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    transcript_hash      VARCHAR(255) NOT NULL,
    summary_text         TEXT NOT NULL,
    action_items         JSONB DEFAULT '[]',
    deadline_suggestions JSONB DEFAULT '[]',
    processed_at         TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_documents_project ON documents(project_id);
CREATE INDEX idx_ai_summaries_project ON ai_summaries(project_id);
