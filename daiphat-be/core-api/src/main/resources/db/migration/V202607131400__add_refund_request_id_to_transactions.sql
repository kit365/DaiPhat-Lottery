-- Link refund payout transactions to their RefundRequest (1 RefundRequest → N Transactions).

ALTER TABLE transactions
    ADD COLUMN IF NOT EXISTS refund_request_id BIGINT;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'fk_transactions_refund_request'
    ) THEN
        ALTER TABLE transactions
            ADD CONSTRAINT fk_transactions_refund_request
                FOREIGN KEY (refund_request_id) REFERENCES refund_requests (id);
    END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_transactions_refund_request_id
    ON transactions (refund_request_id);

-- Backfill existing REFUND payouts via the order_details → refund_request link.
UPDATE transactions t
SET refund_request_id = (
    SELECT od.refund_request_id
    FROM order_details od
    WHERE od.order_id = t.order_id
      AND od.refund_request_id IS NOT NULL
    ORDER BY od.id
    LIMIT 1
)
WHERE t.type = 'REFUND'
  AND t.refund_request_id IS NULL;
