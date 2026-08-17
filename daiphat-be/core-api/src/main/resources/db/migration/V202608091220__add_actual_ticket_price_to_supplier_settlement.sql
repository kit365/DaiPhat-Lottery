-- Add actual_ticket_price to supplier_settlements
ALTER TABLE supplier_settlements
    ADD COLUMN IF NOT EXISTS actual_ticket_price NUMERIC(18, 3);
