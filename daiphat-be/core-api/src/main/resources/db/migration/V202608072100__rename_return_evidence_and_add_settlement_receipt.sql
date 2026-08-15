-- Separate return-batch evidence from supplier-settlement receipt.

-- 1) Rename return_batches.return_receipt_evidence_url → return_evidence_url
DO $$
BEGIN
    IF EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_name = 'return_batches'
          AND column_name = 'return_receipt_evidence_url'
    ) AND NOT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_name = 'return_batches'
          AND column_name = 'return_evidence_url'
    ) THEN
        ALTER TABLE return_batches
            RENAME COLUMN return_receipt_evidence_url TO return_evidence_url;
    END IF;
END $$;

-- 2) Settlement-level receipt/evidence for reconciling import vs return
ALTER TABLE supplier_settlements
    ADD COLUMN IF NOT EXISTS supplier_settlement_receipt_url VARCHAR(500);
