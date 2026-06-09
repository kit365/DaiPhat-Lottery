DO $$
BEGIN
    -- Drop the old unique constraint on serial_number if it exists
    IF EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'uq_lottery_tickets_serial_number'
    ) THEN
        ALTER TABLE lottery_tickets DROP CONSTRAINT uq_lottery_tickets_serial_number;
    END IF;

    -- Also try alternative names in case they were used
    IF EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'uk_lottery_tickets_serial_number'
    ) THEN
        ALTER TABLE lottery_tickets DROP CONSTRAINT uk_lottery_tickets_serial_number;
    END IF;
END
$$;

-- Drop orphaned indexes from the old constraint (in case they exist)
DROP INDEX IF EXISTS uq_lottery_tickets_serial_number;
DROP INDEX IF EXISTS uk_lottery_tickets_serial_number;
DROP INDEX IF EXISTS lottery_tickets_serial_number_key;

-- Add the new composite unique constraint if it does not already exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'uk_lottery_ticket_product_serial_numbers_draw_date'
    ) THEN
        ALTER TABLE lottery_tickets
            ADD CONSTRAINT uk_lottery_ticket_product_serial_numbers_draw_date
                UNIQUE (product_id, serial_number, numbers, draw_date);
    END IF;
END
$$;
