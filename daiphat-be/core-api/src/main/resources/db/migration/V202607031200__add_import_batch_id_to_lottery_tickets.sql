ALTER TABLE lottery_tickets
    ADD COLUMN IF NOT EXISTS import_batch_id BIGINT;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'fk_lottery_tickets_import_batch_id'
    ) THEN
        ALTER TABLE lottery_tickets
            ADD CONSTRAINT fk_lottery_tickets_import_batch_id
                FOREIGN KEY (import_batch_id) REFERENCES import_batches(id);
    END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_lottery_tickets_import_batch_id
    ON lottery_tickets(import_batch_id);
