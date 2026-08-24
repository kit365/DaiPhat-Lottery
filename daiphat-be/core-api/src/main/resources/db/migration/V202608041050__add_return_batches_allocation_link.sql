-- Local DBs often created return_batches before V202607311400 gained
-- source_allocation_batch_id / return_batch_type. CREATE TABLE IF NOT EXISTS
-- then left those columns missing, so V202608041100's FK/CHECK failed.
-- Run immediately before vendor allocation schema.

ALTER TABLE return_batches
    ADD COLUMN IF NOT EXISTS return_batch_type VARCHAR(30) NOT NULL DEFAULT 'SUPPLIER_RETURN',
    ADD COLUMN IF NOT EXISTS source_allocation_batch_id BIGINT,
    ADD COLUMN IF NOT EXISTS batch_code VARCHAR(100),
    ADD COLUMN IF NOT EXISTS return_evidence_url VARCHAR(500),
    ADD COLUMN IF NOT EXISTS cancel_reason TEXT,
    ADD COLUMN IF NOT EXISTS cancelled_at TIMESTAMP;

ALTER TABLE return_batches
    ALTER COLUMN lottery_supplier_id DROP NOT NULL;

CREATE INDEX IF NOT EXISTS idx_return_batches_type
    ON return_batches (return_batch_type);
CREATE INDEX IF NOT EXISTS idx_return_batches_source_allocation
    ON return_batches (source_allocation_batch_id);
CREATE INDEX IF NOT EXISTS idx_return_batches_batch_code
    ON return_batches (batch_code);
