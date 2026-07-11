-- Enforce one Refund Request per Order (1:1).
-- Keep the newest refund_requests row per order_id, then add a unique constraint.

DELETE FROM refund_requests
WHERE id IN (
    SELECT id
    FROM (
        SELECT id,
               ROW_NUMBER() OVER (PARTITION BY order_id ORDER BY id DESC) AS rn
        FROM refund_requests
    ) ranked
    WHERE ranked.rn > 1
);

DROP INDEX IF EXISTS idx_refund_requests_order_id;

ALTER TABLE refund_requests
    DROP CONSTRAINT IF EXISTS uk_refund_requests_order_id;

ALTER TABLE refund_requests
    ADD CONSTRAINT uk_refund_requests_order_id UNIQUE (order_id);
