-- Align order_details.status with refund lifecycle:
-- REFUND_PENDING while refund request is open; REFUNDED when payout completed.

UPDATE order_details od
SET status = 'REFUNDED'
WHERE od.refund_request_id IS NOT NULL
  AND EXISTS (
        SELECT 1
          FROM refund_requests r
         WHERE r.id = od.refund_request_id
           AND r.status IN ('PAID', 'TRANSFERRED')
    );

UPDATE order_details od
SET status = 'REFUND_PENDING'
WHERE od.refund_request_id IS NOT NULL
  AND od.status <> 'REFUNDED'
  AND EXISTS (
        SELECT 1
          FROM refund_requests r
         WHERE r.id = od.refund_request_id
           AND r.status NOT IN ('PAID', 'TRANSFERRED')
    );
