-- Sequence for Return Batch header codes (phiếu trả vé: PT-{drawDate}-{sequence})
CREATE SEQUENCE IF NOT EXISTS return_batch_header_code_seq START WITH 1 INCREMENT BY 1;

-- Add batch_code column to return_batches
ALTER TABLE return_batches
    ADD COLUMN IF NOT EXISTS batch_code VARCHAR(100);

CREATE INDEX IF NOT EXISTS idx_return_batches_batch_code
    ON return_batches (batch_code);

-- Backfill existing return_batches rows if any have null batch_code
UPDATE return_batches
SET batch_code = 'PT-' || TO_CHAR(draw_date, 'YYYYMMDD') || '-' || LPAD(id::text, 4, '0')
WHERE batch_code IS NULL;
