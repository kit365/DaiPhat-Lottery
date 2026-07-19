-- Chat branch still maps batch_code on lottery_tickets (legacy create/list API).
-- V202607051200 dropped it for the import-batch flow; restore for current entity/FE.
ALTER TABLE lottery_tickets
    ADD COLUMN IF NOT EXISTS batch_code VARCHAR(100);

UPDATE lottery_tickets
SET batch_code = 'LEGACY-' || id::text
WHERE batch_code IS NULL;

ALTER TABLE lottery_tickets
    ALTER COLUMN batch_code SET NOT NULL;

CREATE INDEX IF NOT EXISTS idx_lottery_tickets_batch_code
    ON lottery_tickets (batch_code);
