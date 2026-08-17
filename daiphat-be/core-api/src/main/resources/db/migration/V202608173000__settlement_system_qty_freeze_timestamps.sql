ALTER TABLE supplier_settlements
    ADD COLUMN IF NOT EXISTS system_import_quantity_frozen_at timestamptz,
    ADD COLUMN IF NOT EXISTS system_return_quantity_frozen_at timestamptz;
