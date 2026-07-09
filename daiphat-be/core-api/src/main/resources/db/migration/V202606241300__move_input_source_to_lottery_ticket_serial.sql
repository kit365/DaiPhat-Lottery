-- Move input_source from lottery_tickets to lottery_ticket_serials (per physical ticket)

ALTER TABLE lottery_ticket_serials
    ADD COLUMN IF NOT EXISTS input_source VARCHAR(20) NOT NULL DEFAULT 'MANUAL';

UPDATE lottery_ticket_serials
SET input_source = 'MANUAL'
WHERE input_source IS NULL;

-- Backfill from parent ticket when the previous column still exists
DO $$
BEGIN
    IF EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_name = 'lottery_tickets'
          AND column_name = 'input_source'
    ) THEN
        UPDATE lottery_ticket_serials s
        SET input_source = t.input_source
        FROM lottery_tickets t
        WHERE s.ticket_id = t.id
          AND t.input_source IS NOT NULL;
    END IF;
END $$;

DROP INDEX IF EXISTS idx_lottery_tickets_input_source;

ALTER TABLE lottery_tickets
    DROP COLUMN IF EXISTS input_source;

CREATE INDEX IF NOT EXISTS idx_lottery_ticket_serials_input_source ON lottery_ticket_serials(input_source);
