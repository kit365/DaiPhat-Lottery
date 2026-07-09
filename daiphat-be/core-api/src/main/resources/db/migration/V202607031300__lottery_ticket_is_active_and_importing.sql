ALTER TABLE lottery_tickets
    ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT TRUE;

CREATE INDEX IF NOT EXISTS idx_lottery_tickets_is_active
    ON lottery_tickets(is_active);
