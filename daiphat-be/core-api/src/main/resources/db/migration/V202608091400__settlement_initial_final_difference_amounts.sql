-- Replace estimated/actual settlement values with system-calculated initial/final/difference trio.

DO $$
BEGIN
    IF EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'supplier_settlements'
          AND column_name = 'estimated_settlement_value'
    ) AND NOT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'supplier_settlements'
          AND column_name = 'initial_estimated_settlement_value'
    ) THEN
        ALTER TABLE supplier_settlements
            RENAME COLUMN estimated_settlement_value TO initial_estimated_settlement_value;
    END IF;

    IF EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'supplier_settlements'
          AND column_name = 'actual_settlement_value'
    ) AND NOT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'supplier_settlements'
          AND column_name = 'final_settlement_value'
    ) THEN
        ALTER TABLE supplier_settlements
            RENAME COLUMN actual_settlement_value TO final_settlement_value;
    END IF;
END $$;

ALTER TABLE supplier_settlements
    ADD COLUMN IF NOT EXISTS settlement_difference_amount NUMERIC(18, 3);

UPDATE supplier_settlements
SET settlement_difference_amount =
        COALESCE(final_settlement_value, 0) - COALESCE(initial_estimated_settlement_value, 0)
WHERE settlement_difference_amount IS NULL
  AND (initial_estimated_settlement_value IS NOT NULL OR final_settlement_value IS NOT NULL);
