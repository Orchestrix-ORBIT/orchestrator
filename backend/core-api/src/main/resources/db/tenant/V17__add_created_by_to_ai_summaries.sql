-- V17: Add created_by to ai_summaries for per-user summary isolation
-- Each summary is now scoped to the user (team lead) who triggered it.
-- GET /api/ai-summaries will only return summaries owned by the authenticated user.

ALTER TABLE ai_summaries
    ADD COLUMN created_by UUID REFERENCES users(id) ON DELETE SET NULL;

CREATE INDEX idx_ai_summaries_created_by ON ai_summaries(created_by);
