-- Repair orphan ORDER_DETAIL refund requests created during order inspection
-- without linking order_details (order_id is not stored on refund_requests).
--
-- Staff transfer (PATCH .../transfer) resolves the order via
-- order_details.refund_request_id — without that link, requireOrderId() fails
-- with ORDER_NOT_FOUND / HTTP 404.
--
-- Strategy: for each orphan refund, link ACTIVE unlinked details on the same
-- customer's PENDING_PICKUP orders whose allocated serial is LOST/DAMAGED.
-- Prefer refunds whose amount matches the detail line subtotal when ambiguous.

WITH orphan_refunds AS (
    SELECT rr.id AS refund_id,
           rr.requested_by AS customer_id,
           rr.refund_amount
    FROM refund_requests rr
    WHERE rr.refund_type = 'ORDER_DETAIL'
      AND rr.status IN ('WAITING_FOR_INFO', 'READY_TO_PAY', 'APPROVED')
      AND NOT EXISTS (
          SELECT 1
          FROM order_details od
          WHERE od.refund_request_id = rr.id
      )
),
faulted_details AS (
    SELECT od.id AS order_detail_id,
           od.order_id,
           o.user_id AS customer_id,
           (od.price * COALESCE(od.quantity, 1)) AS line_amount
    FROM orders o
    JOIN order_details od
      ON od.order_id = o.id
     AND od.refund_request_id IS NULL
     AND od.status = 'ACTIVE'
    WHERE o.status = 'PENDING_PICKUP'
      AND EXISTS (
          SELECT 1
          FROM lottery_ticket_serials s
          WHERE s.status IN ('LOST', 'DAMAGED')
            AND (
                s.id = od.lottery_ticket_serial_id
                OR EXISTS (
                    SELECT 1
                    FROM order_detail_serials ods
                    WHERE ods.order_detail_id = od.id
                      AND ods.lottery_ticket_serial_id = s.id
                )
            )
      )
),
ranked AS (
    SELECT fd.order_detail_id,
           orf.refund_id,
           ROW_NUMBER() OVER (
               PARTITION BY fd.order_detail_id
               ORDER BY
                   CASE
                       WHEN orf.refund_amount IS NOT NULL
                            AND orf.refund_amount = fd.line_amount THEN 0
                       ELSE 1
                   END,
                   orf.refund_id
           ) AS rn_detail,
           ROW_NUMBER() OVER (
               PARTITION BY orf.refund_id
               ORDER BY
                   CASE
                       WHEN orf.refund_amount IS NOT NULL
                            AND orf.refund_amount = fd.line_amount THEN 0
                       ELSE 1
                   END,
                   fd.order_detail_id
           ) AS rn_refund
    FROM orphan_refunds orf
    JOIN faulted_details fd
      ON fd.customer_id = orf.customer_id
)
UPDATE order_details od
SET refund_request_id = r.refund_id,
    status = 'REFUND_PENDING'
FROM ranked r
WHERE od.id = r.order_detail_id
  AND r.rn_detail = 1
  AND r.rn_refund = 1;
