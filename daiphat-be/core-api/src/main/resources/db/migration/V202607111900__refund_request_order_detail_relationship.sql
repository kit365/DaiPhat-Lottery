-- Move RefundRequest relationship from Order (1:1) to OrderDetail (1:N).
-- OrderDetail.refund_request_id is the owning side; order_id on refund_requests remains for query convenience (non-unique).

ALTER TABLE order_details
    ADD COLUMN IF NOT EXISTS refund_request_id BIGINT;

-- Backfill: link every order detail of an order to that order's refund request (if any).
UPDATE order_details od
SET refund_request_id = rr.id
FROM refund_requests rr
WHERE rr.order_id = od.order_id
  AND od.refund_request_id IS NULL;

ALTER TABLE order_details
    DROP CONSTRAINT IF EXISTS fk_order_details_refund_request;

ALTER TABLE order_details
    ADD CONSTRAINT fk_order_details_refund_request
        FOREIGN KEY (refund_request_id) REFERENCES refund_requests (id);

CREATE INDEX IF NOT EXISTS idx_order_details_refund_request_id
    ON order_details (refund_request_id);

-- Drop single-detail FK from refund_requests
ALTER TABLE refund_requests
    DROP CONSTRAINT IF EXISTS fk_refund_requests_order_detail;

DROP INDEX IF EXISTS idx_refund_requests_order_detail_id;

ALTER TABLE refund_requests
    DROP COLUMN IF EXISTS order_detail_id;

-- Drop Order↔RefundRequest 1:1 uniqueness (relationship now via order_details)
ALTER TABLE refund_requests
    DROP CONSTRAINT IF EXISTS uk_refund_requests_order_id;

CREATE INDEX IF NOT EXISTS idx_refund_requests_order_id
    ON refund_requests (order_id);
