-- supplier_settlements created before V202607311100 gained return-expiry columns.
-- CREATE TABLE IF NOT EXISTS skipped the canonical shape; later ALTERs never added these.

ALTER TABLE supplier_settlements
    ADD COLUMN IF NOT EXISTS is_return_expired BOOLEAN NOT NULL DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS expired_return_value NUMERIC(18, 3) NOT NULL DEFAULT 0.000,
    ADD COLUMN IF NOT EXISTS paid_at TIMESTAMP;
