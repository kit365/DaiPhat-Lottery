ALTER TABLE lottery_tickets
    ADD COLUMN IF NOT EXISTS input_source VARCHAR(20) NOT NULL DEFAULT 'MANUAL';

UPDATE lottery_tickets
SET input_source = 'MANUAL'
WHERE input_source IS NULL;

CREATE INDEX IF NOT EXISTS idx_lottery_tickets_input_source ON lottery_tickets(input_source);
