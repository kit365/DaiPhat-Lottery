-- Refund payout transactions are linked only via refund_request_id (not order_id).

ALTER TABLE transactions
    ALTER COLUMN order_id DROP NOT NULL;

-- Ensure refund_request_id is populated before detaching from orders.
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
  AND t.refund_request_id IS NULL
  AND t.order_id IS NOT NULL;

UPDATE transactions
SET order_id = NULL
WHERE type = 'REFUND'
  AND refund_request_id IS NOT NULL;
