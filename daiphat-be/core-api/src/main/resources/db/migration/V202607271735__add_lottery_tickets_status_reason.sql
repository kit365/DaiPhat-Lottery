ALTER TABLE lottery_tickets
    ADD COLUMN IF NOT EXISTS status_reason VARCHAR(500);
