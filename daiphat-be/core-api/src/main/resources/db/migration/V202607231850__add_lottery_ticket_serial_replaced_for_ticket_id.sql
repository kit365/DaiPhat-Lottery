ALTER TABLE lottery_ticket_serials
    ADD COLUMN IF NOT EXISTS replaced_for_ticket_id BIGINT;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'fk_lottery_ticket_serials_replaced_for_ticket_id'
    ) THEN
        ALTER TABLE lottery_ticket_serials
            ADD CONSTRAINT fk_lottery_ticket_serials_replaced_for_ticket_id
                FOREIGN KEY (replaced_for_ticket_id) REFERENCES lottery_ticket_serials(id);
    END IF;
END $$;
