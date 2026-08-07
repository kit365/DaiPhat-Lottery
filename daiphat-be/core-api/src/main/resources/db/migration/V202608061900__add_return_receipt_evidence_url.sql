ALTER TABLE return_batches
    ADD COLUMN IF NOT EXISTS return_receipt_evidence_url VARCHAR(500);
