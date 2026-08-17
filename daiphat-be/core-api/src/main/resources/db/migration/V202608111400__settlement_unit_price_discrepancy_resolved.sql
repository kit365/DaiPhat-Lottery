ALTER TABLE supplier_settlements
    ADD COLUMN IF NOT EXISTS unit_price_discrepancy_resolved BOOLEAN NOT NULL DEFAULT TRUE;

UPDATE supplier_settlements
SET unit_price_discrepancy_resolved = FALSE
WHERE COALESCE(discrepancy_types, '[]'::jsonb) @> '["IMPORT_UNIT_PRICE"]'::jsonb
  AND reconciliation_phase IN (
      'MATCHING',
      'DISCREPANCY_DETECTED',
      'RESOLVING_IMPORT_DISCREPANCY',
      'RESOLVING_RETURN_DISCREPANCY'
  );
