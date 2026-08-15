ALTER TABLE supplier_settlements
    ADD COLUMN IF NOT EXISTS payment_evidence_urls jsonb NOT NULL DEFAULT '[]'::jsonb;
