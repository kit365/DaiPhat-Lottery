CREATE SEQUENCE IF NOT EXISTS import_batch_header_code_seq START WITH 1 INCREMENT BY 1;

ALTER TABLE import_batches
    ADD COLUMN IF NOT EXISTS batch_code VARCHAR(50);

UPDATE import_batches b
SET batch_code = 'PN-'
    || TO_CHAR(b.draw_date, 'YYYYMMDD')
    || '-'
    || LPAD(b.id::text, 4, '0')
WHERE b.batch_code IS NULL;

ALTER TABLE import_batches
    ALTER COLUMN batch_code SET NOT NULL;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'uq_import_batches_batch_code'
    ) THEN
        ALTER TABLE import_batches
            ADD CONSTRAINT uq_import_batches_batch_code UNIQUE (batch_code);
    END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_import_batches_batch_code
    ON import_batches (batch_code);

SELECT setval(
    'import_batch_header_code_seq',
    GREATEST(
        COALESCE((SELECT MAX(id) FROM import_batches), 0),
        COALESCE((SELECT last_value FROM import_batch_header_code_seq), 0)
    )
);
