ALTER TABLE supplier_settlements
    ADD COLUMN IF NOT EXISTS discrepancy_items JSONB NOT NULL DEFAULT '[]'::jsonb;
