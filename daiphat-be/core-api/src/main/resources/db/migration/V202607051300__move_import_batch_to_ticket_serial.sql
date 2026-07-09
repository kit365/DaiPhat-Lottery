ALTER TABLE lottery_ticket_serials
    ADD COLUMN IF NOT EXISTS import_batch_id BIGINT,
    ADD COLUMN IF NOT EXISTS import_batch_line_id BIGINT;

UPDATE lottery_ticket_serials s
SET import_batch_id = t.import_batch_id,
    import_batch_line_id = t.import_batch_line_id
FROM lottery_tickets t
WHERE s.ticket_id = t.id
  AND s.import_batch_line_id IS NULL
  AND t.import_batch_line_id IS NOT NULL;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'fk_lottery_ticket_serials_import_batch_id'
    ) THEN
        ALTER TABLE lottery_ticket_serials
            ADD CONSTRAINT fk_lottery_ticket_serials_import_batch_id
                FOREIGN KEY (import_batch_id) REFERENCES import_batches(id);
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'fk_lottery_ticket_serials_import_batch_line_id'
    ) THEN
        ALTER TABLE lottery_ticket_serials
            ADD CONSTRAINT fk_lottery_ticket_serials_import_batch_line_id
                FOREIGN KEY (import_batch_line_id) REFERENCES import_batch_lines(id);
    END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_lottery_ticket_serials_import_batch_id
    ON lottery_ticket_serials(import_batch_id);
CREATE INDEX IF NOT EXISTS idx_lottery_ticket_serials_import_batch_line_id
    ON lottery_ticket_serials(import_batch_line_id);

ALTER TABLE lottery_tickets DROP CONSTRAINT IF EXISTS fk_lottery_tickets_import_batch_id;
ALTER TABLE lottery_tickets DROP CONSTRAINT IF EXISTS fk_lottery_tickets_import_batch_line_id;
DROP INDEX IF EXISTS idx_lottery_tickets_import_batch_id;
DROP INDEX IF EXISTS idx_lottery_tickets_import_batch_line_id;
ALTER TABLE lottery_tickets DROP COLUMN IF EXISTS import_batch_id;
ALTER TABLE lottery_tickets DROP COLUMN IF EXISTS import_batch_line_id;
