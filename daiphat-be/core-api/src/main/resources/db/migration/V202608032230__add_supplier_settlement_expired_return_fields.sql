-- Add is_return_expired and expired_return_value to supplier_settlements
ALTER TABLE supplier_settlements
    ADD COLUMN IF NOT EXISTS is_return_expired BOOLEAN NOT NULL DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS expired_return_value NUMERIC(18, 3) NOT NULL DEFAULT 0.000;

COMMENT ON COLUMN supplier_settlements.is_return_expired IS 'Flag indicating whether the cutoff time for returning tickets to supplier has passed';
COMMENT ON COLUMN supplier_settlements.expired_return_value IS 'Value of in-stock/uninspected tickets that expired past the cutoff time';
