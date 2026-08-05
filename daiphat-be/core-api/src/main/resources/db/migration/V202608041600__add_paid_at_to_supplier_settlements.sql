-- Add paid_at column to supplier_settlements
ALTER TABLE supplier_settlements
    ADD COLUMN IF NOT EXISTS paid_at TIMESTAMP;

CREATE INDEX IF NOT EXISTS idx_supplier_settlements_paid_at
    ON supplier_settlements (paid_at);
