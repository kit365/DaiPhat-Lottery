CREATE SEQUENCE IF NOT EXISTS import_batch_code_seq START WITH 1 INCREMENT BY 1;

ALTER TABLE import_batch_lines
    ADD COLUMN IF NOT EXISTS batch_code VARCHAR(100);

UPDATE import_batch_lines l
SET batch_code = LPAD(nextval('import_batch_code_seq')::text, 4, '0')
    || '_ST' || l.lottery_station_id
    || '_' || l.batch_type
    || '_' || TO_CHAR(COALESCE(l.created_at, CURRENT_TIMESTAMP), 'YYYYMMDD')
WHERE l.batch_code IS NULL;

ALTER TABLE import_batch_lines
    ALTER COLUMN batch_code SET NOT NULL;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'uq_import_batch_lines_batch_code'
    ) THEN
        ALTER TABLE import_batch_lines
            ADD CONSTRAINT uq_import_batch_lines_batch_code UNIQUE (batch_code);
    END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_import_batch_lines_batch_code
    ON import_batch_lines (batch_code);
