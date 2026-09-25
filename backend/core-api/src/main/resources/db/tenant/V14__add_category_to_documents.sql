-- V14: Add category column to documents table
-- Category stores the document type: MEETING_MINUTES, EXPERIMENTAL_PROTOCOL, PRE_PRINT_PAPER, ARCHIVED_DATASET, OTHER
ALTER TABLE documents
    ADD COLUMN category VARCHAR(50) NOT NULL DEFAULT 'OTHER';
