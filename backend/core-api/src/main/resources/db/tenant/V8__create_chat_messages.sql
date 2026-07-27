CREATE TABLE chat_messages (
    id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id        UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    task_id           UUID REFERENCES tasks(id) ON DELETE SET NULL,
    sender_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    content_encrypted TEXT NOT NULL,
    created_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_chat_messages_project ON chat_messages(project_id, created_at);
CREATE INDEX idx_chat_messages_task ON chat_messages(task_id);
CREATE INDEX idx_chat_messages_sender ON chat_messages(sender_id);
