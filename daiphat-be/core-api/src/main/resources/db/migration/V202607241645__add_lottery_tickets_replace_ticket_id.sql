ALTER TABLE lottery_tickets
    ADD COLUMN IF NOT EXISTS replace_ticket_id BIGINT;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'fk_lottery_tickets_replace_ticket_id'
    ) THEN
        ALTER TABLE lottery_tickets
            ADD CONSTRAINT fk_lottery_tickets_replace_ticket_id
                FOREIGN KEY (replace_ticket_id) REFERENCES lottery_tickets(id);
    END IF;
END $$;
