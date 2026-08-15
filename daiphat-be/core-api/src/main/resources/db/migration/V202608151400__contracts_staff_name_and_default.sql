-- Staff-facing name + exactly one default template per contract type.
ALTER TABLE contracts
    ADD COLUMN IF NOT EXISTS staff_name VARCHAR(255),
    ADD COLUMN IF NOT EXISTS is_default BOOLEAN NOT NULL DEFAULT FALSE;

UPDATE contracts
SET staff_name = COALESCE(NULLIF(TRIM(staff_name), ''), title)
WHERE staff_name IS NULL OR TRIM(staff_name) = '';

ALTER TABLE contracts
    ALTER COLUMN staff_name SET NOT NULL;

-- Existing seeded templates become the defaults for their type.
UPDATE contracts
SET is_default = TRUE
WHERE deleted_at IS NULL
  AND code IN ('TPL-SALES-001', 'TPL-PAYOUT-001')
  AND NOT EXISTS (
      SELECT 1
      FROM contracts other
      WHERE other.type = contracts.type
        AND other.is_default = TRUE
        AND other.deleted_at IS NULL
        AND other.id <> contracts.id
  );

CREATE UNIQUE INDEX IF NOT EXISTS uq_contracts_one_default_per_type
    ON contracts (type)
    WHERE is_default = TRUE AND deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_contracts_type_default
    ON contracts (type, is_default)
    WHERE deleted_at IS NULL;
