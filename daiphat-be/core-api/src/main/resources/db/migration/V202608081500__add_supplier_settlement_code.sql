-- Sequence for supplier settlement codes (đối soát NCC: DS-{periodFrom}-{sequence})
CREATE SEQUENCE IF NOT EXISTS supplier_settlement_code_seq START WITH 1 INCREMENT BY 1;

ALTER TABLE supplier_settlements
    ADD COLUMN IF NOT EXISTS supplier_settlement_code VARCHAR(100);

-- Backfill existing rows using period_from + id (stable, unique)
UPDATE supplier_settlements
SET supplier_settlement_code = 'DS-' || TO_CHAR(period_from, 'YYYYMMDD') || '-' || LPAD(id::text, 4, '0')
WHERE supplier_settlement_code IS NULL;

ALTER TABLE supplier_settlements
    ALTER COLUMN supplier_settlement_code SET NOT NULL;

-- Keep sequence ahead of existing ids so new codes stay unique after backfill
SELECT setval(
    'supplier_settlement_code_seq',
    GREATEST(
        (SELECT COALESCE(MAX(id), 0) FROM supplier_settlements),
        1
    )
);

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.table_constraints
        WHERE table_name = 'supplier_settlements'
          AND constraint_name = 'uq_supplier_settlements_code'
    ) THEN
        ALTER TABLE supplier_settlements
            ADD CONSTRAINT uq_supplier_settlements_code UNIQUE (supplier_settlement_code);
    END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_supplier_settlements_code
    ON supplier_settlements (supplier_settlement_code);
