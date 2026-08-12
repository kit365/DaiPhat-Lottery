-- Rename unit price column and add pricing / discrepancy fields for reconciliation.
DO $$
BEGIN
    IF EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'supplier_settlements'
          AND column_name = 'actual_ticket_price'
    ) AND NOT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'supplier_settlements'
          AND column_name = 'reconciled_ticket_unit_price'
    ) THEN
        ALTER TABLE supplier_settlements
            RENAME COLUMN actual_ticket_price TO reconciled_ticket_unit_price;
    END IF;
END $$;

ALTER TABLE supplier_settlements
    ADD COLUMN IF NOT EXISTS original_ticket_unit_price NUMERIC(18, 3);

ALTER TABLE supplier_settlements
    ADD COLUMN IF NOT EXISTS estimated_settlement_value NUMERIC(18, 3);

ALTER TABLE supplier_settlements
    ADD COLUMN IF NOT EXISTS discrepancy_types JSONB NOT NULL DEFAULT '[]'::jsonb;

UPDATE supplier_settlements ss
SET original_ticket_unit_price = ls.default_import_cost
FROM lottery_suppliers ls
WHERE ss.lottery_supplier_id = ls.id
  AND ss.original_ticket_unit_price IS NULL
  AND ls.default_import_cost IS NOT NULL;
