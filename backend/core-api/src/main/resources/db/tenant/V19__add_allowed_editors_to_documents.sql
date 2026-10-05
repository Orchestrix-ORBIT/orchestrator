-- V15: Add allowed_editors column to documents table
-- allowed_editors stores a comma-separated list of UUIDs representing users who have edit access
ALTER TABLE documents
    ADD COLUMN allowed_editors TEXT;
