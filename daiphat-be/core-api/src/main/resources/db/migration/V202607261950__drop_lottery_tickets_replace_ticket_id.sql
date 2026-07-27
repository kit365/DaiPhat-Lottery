-- Drop replace_ticket_id column and foreign key constraint from lottery_tickets.
-- Audit trail for replaced serials lives on lottery_ticket_serials.replaced_for_ticket_id.
ALTER TABLE lottery_tickets
    DROP CONSTRAINT IF EXISTS fk_lottery_tickets_replace_ticket_id;

ALTER TABLE lottery_tickets
    DROP COLUMN IF EXISTS replace_ticket_id;
