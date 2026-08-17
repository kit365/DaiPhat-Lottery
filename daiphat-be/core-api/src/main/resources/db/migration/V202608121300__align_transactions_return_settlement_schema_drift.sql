-- Local DBs often created transactions / return_batches / supplier_settlements via
-- older CREATE TABLE IF NOT EXISTS shapes. Later migrations only ALTER missing pieces
-- when rewritten; Flyway can mark them applied while columns stay missing.
-- Align to current JPA entities (TransactionEntity, ReturnBatchEntity, SupplierSettlementEntity).

-- ========== transactions (from V202608041100) ==========
ALTER TABLE transactions
    ADD COLUMN IF NOT EXISTS street_agent_profile_id BIGINT,
    ADD COLUMN IF NOT EXISTS allocation_batch_id BIGINT,
    ADD COLUMN IF NOT EXISTS prize_payout_request_id BIGINT,
    ADD COLUMN IF NOT EXISTS business_date DATE,
    ADD COLUMN IF NOT EXISTS transaction_type VARCHAR(30);

UPDATE transactions
SET transaction_type = CASE
    WHEN type = 'REFUND' THEN 'ORDER_REFUND'
    ELSE 'ORDER_PAYMENT'
END
WHERE transaction_type IS NULL;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'transactions_street_agent_profile_id_fkey'
    ) AND EXISTS (
        SELECT 1 FROM information_schema.tables WHERE table_name = 'street_agent_profiles'
    ) THEN
        ALTER TABLE transactions
            ADD CONSTRAINT transactions_street_agent_profile_id_fkey
                FOREIGN KEY (street_agent_profile_id) REFERENCES street_agent_profiles(id);
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'transactions_allocation_batch_id_fkey'
    ) AND EXISTS (
        SELECT 1 FROM information_schema.tables WHERE table_name = 'allocation_batches'
    ) THEN
        ALTER TABLE transactions
            ADD CONSTRAINT transactions_allocation_batch_id_fkey
                FOREIGN KEY (allocation_batch_id) REFERENCES allocation_batches(id);
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'transactions_prize_payout_request_id_fkey'
    ) AND EXISTS (
        SELECT 1 FROM information_schema.tables WHERE table_name = 'prize_payout_requests'
    ) THEN
        ALTER TABLE transactions
            ADD CONSTRAINT transactions_prize_payout_request_id_fkey
                FOREIGN KEY (prize_payout_request_id) REFERENCES prize_payout_requests(id);
    END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_transactions_street_agent_profile
    ON transactions(street_agent_profile_id)
    WHERE street_agent_profile_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_transactions_allocation_batch
    ON transactions(allocation_batch_id)
    WHERE allocation_batch_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_transactions_prize_payout_request
    ON transactions(prize_payout_request_id)
    WHERE prize_payout_request_id IS NOT NULL;

-- ========== return_batches ==========
-- Older local schemas used return_receipt_evidence_url; entity expects return_evidence_url.
ALTER TABLE return_batches
    ADD COLUMN IF NOT EXISTS return_evidence_url VARCHAR(500);

DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'return_batches'
          AND column_name = 'return_receipt_evidence_url'
    ) THEN
        UPDATE return_batches
        SET return_evidence_url = COALESCE(return_evidence_url, return_receipt_evidence_url)
        WHERE return_evidence_url IS NULL
          AND return_receipt_evidence_url IS NOT NULL;
    END IF;
END $$;

-- ========== supplier_settlements (from V202607311100) ==========
ALTER TABLE supplier_settlements
    ADD COLUMN IF NOT EXISTS supplier_settlement_code VARCHAR(100),
    ADD COLUMN IF NOT EXISTS supplier_settlement_receipt_url VARCHAR(500),
    ADD COLUMN IF NOT EXISTS reconciliation_phase VARCHAR(40) NOT NULL DEFAULT 'MATCHING',
    ADD COLUMN IF NOT EXISTS system_import_quantity INTEGER,
    ADD COLUMN IF NOT EXISTS system_import_value NUMERIC(18, 3),
    ADD COLUMN IF NOT EXISTS system_return_quantity INTEGER,
    ADD COLUMN IF NOT EXISTS system_return_value NUMERIC(18, 3),
    ADD COLUMN IF NOT EXISTS actual_ticket_import_quantity INTEGER,
    ADD COLUMN IF NOT EXISTS actual_ticket_import_value NUMERIC(18, 3),
    ADD COLUMN IF NOT EXISTS actual_return_ticket_quantity INTEGER,
    ADD COLUMN IF NOT EXISTS actual_return_ticket_value NUMERIC(18, 3),
    ADD COLUMN IF NOT EXISTS original_ticket_unit_price NUMERIC(18, 3),
    ADD COLUMN IF NOT EXISTS reconciled_ticket_unit_price NUMERIC(18, 3),
    ADD COLUMN IF NOT EXISTS initial_estimated_settlement_value NUMERIC(18, 3),
    ADD COLUMN IF NOT EXISTS final_settlement_value NUMERIC(18, 3),
    ADD COLUMN IF NOT EXISTS actual_paid_amount NUMERIC(18, 3),
    ADD COLUMN IF NOT EXISTS settlement_difference_amount NUMERIC(18, 3),
    ADD COLUMN IF NOT EXISTS discrepancy_types JSONB NOT NULL DEFAULT '[]'::jsonb,
    ADD COLUMN IF NOT EXISTS discrepancy_items JSONB NOT NULL DEFAULT '[]'::jsonb,
    ADD COLUMN IF NOT EXISTS import_quantity_mismatch BOOLEAN NOT NULL DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS import_value_mismatch BOOLEAN NOT NULL DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS return_quantity_mismatch BOOLEAN NOT NULL DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS return_value_mismatch BOOLEAN NOT NULL DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS import_discrepancy_resolved BOOLEAN NOT NULL DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS return_discrepancy_resolved BOOLEAN NOT NULL DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS unit_price_discrepancy_resolved BOOLEAN NOT NULL DEFAULT TRUE,
    ADD COLUMN IF NOT EXISTS recalculated_total_paid_amount NUMERIC(18, 3),
    ADD COLUMN IF NOT EXISTS reconciliation_note TEXT,
    ADD COLUMN IF NOT EXISTS matching_confirmed_at TIMESTAMP,
    ADD COLUMN IF NOT EXISTS matching_confirmed_by UUID,
    ADD COLUMN IF NOT EXISTS completed_at TIMESTAMP,
    ADD COLUMN IF NOT EXISTS completed_by UUID;

-- Backfill settlement codes for rows created before the column existed.
UPDATE supplier_settlements
SET supplier_settlement_code = 'LEGACY-' || id::text
WHERE supplier_settlement_code IS NULL OR btrim(supplier_settlement_code) = '';

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'uq_supplier_settlements_code'
    ) THEN
        ALTER TABLE supplier_settlements
            ADD CONSTRAINT uq_supplier_settlements_code UNIQUE (supplier_settlement_code);
    END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_supplier_settlements_reconciliation_phase
    ON supplier_settlements (reconciliation_phase);
