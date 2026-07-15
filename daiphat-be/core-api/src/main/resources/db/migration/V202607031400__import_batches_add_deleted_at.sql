ALTER TABLE import_batches
    ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP;
