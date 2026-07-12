-- Move refund payout transfer evidence from refund_requests onto transactions.

ALTER TABLE transactions
    ADD COLUMN IF NOT EXISTS payment_evidence_url VARCHAR(500),
    ADD COLUMN IF NOT EXISTS payment_by UUID;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'fk_transactions_payment_by'
    ) THEN
        ALTER TABLE transactions
            ADD CONSTRAINT fk_transactions_payment_by
                FOREIGN KEY (payment_by) REFERENCES users (id);
    END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_transactions_payment_by ON transactions (payment_by);
CREATE INDEX IF NOT EXISTS idx_transactions_order_id_type ON transactions (order_id, type);

-- Backfill REFUND payout transactions from existing paid refund transfer data.
INSERT INTO transactions (
    order_id,
    amount,
    status,
    type,
    paid_at,
    payment_evidence_url,
    payment_by,
    note,
    created_at,
    updated_at
)
SELECT DISTINCT ON (rr.id)
    od.order_id,
    rr.refund_amount,
    'COMPLETED',
    'REFUND',
    COALESCE(rr.transferred_at, rr.updated_at, rr.created_at),
    rr.transfer_evidence_url,
    rr.transferred_by,
    rr.transfer_note,
    COALESCE(rr.transferred_at, rr.updated_at, rr.created_at, NOW()),
    COALESCE(rr.transferred_at, rr.updated_at, rr.created_at, NOW())
FROM refund_requests rr
JOIN order_details od ON od.refund_request_id = rr.id
WHERE rr.status = 'PAID'
  AND rr.transfer_evidence_url IS NOT NULL
  AND od.order_id IS NOT NULL
ORDER BY rr.id, od.id;

ALTER TABLE refund_requests
    DROP CONSTRAINT IF EXISTS fk_refund_requests_transferred_by;

ALTER TABLE refund_requests
    DROP COLUMN IF EXISTS transfer_evidence_url,
    DROP COLUMN IF EXISTS transferred_at,
    DROP COLUMN IF EXISTS transferred_by,
    DROP COLUMN IF EXISTS transfer_note;
