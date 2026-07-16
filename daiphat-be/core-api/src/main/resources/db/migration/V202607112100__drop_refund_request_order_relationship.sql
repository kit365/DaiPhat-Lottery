-- Remove RefundRequest ↔ Order relationship. Authoritative link is order_details.refund_request_id only.

-- Ensure any orphaned refunds still get details linked before dropping order_id (idempotent with V1900).
UPDATE order_details od
SET refund_request_id = rr.id
FROM refund_requests rr
WHERE rr.order_id = od.order_id
  AND od.refund_request_id IS NULL;

ALTER TABLE refund_requests
    DROP CONSTRAINT IF EXISTS fk_refund_requests_order;

ALTER TABLE refund_requests
    DROP CONSTRAINT IF EXISTS uk_refund_requests_order_id;

DROP INDEX IF EXISTS idx_refund_requests_order_id;

ALTER TABLE refund_requests
    DROP COLUMN IF EXISTS order_id;
