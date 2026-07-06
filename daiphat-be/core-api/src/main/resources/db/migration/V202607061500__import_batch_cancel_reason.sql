ALTER TABLE import_batches
    ADD COLUMN IF NOT EXISTS cancel_reason TEXT;
