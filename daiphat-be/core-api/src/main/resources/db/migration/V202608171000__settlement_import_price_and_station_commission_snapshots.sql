ALTER TABLE supplier_settlements
    ADD COLUMN IF NOT EXISTS system_ticket_import_price numeric(18, 3),
    ADD COLUMN IF NOT EXISTS actual_ticket_import_price numeric(18, 3),
    ADD COLUMN IF NOT EXISTS station_commission_snapshots jsonb NOT NULL DEFAULT '[]'::jsonb;
