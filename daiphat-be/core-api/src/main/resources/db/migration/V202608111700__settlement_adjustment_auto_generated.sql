ALTER TABLE supplier_settlement_adjustments
    ADD COLUMN IF NOT EXISTS auto_generated BOOLEAN NOT NULL DEFAULT FALSE;

COMMENT ON COLUMN supplier_settlement_adjustments.auto_generated IS
    'True when the SETTLEMENT adjustment was auto-created from receipt actual-paid vs final settlement difference.';
