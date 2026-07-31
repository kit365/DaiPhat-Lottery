-- Enforce 1 lottery-ticket-serial = 1 order-detail, then drop the junction table.
-- Live purchase already creates one detail per serial; this cleans legacy grouped rows.

-- 1) Ensure primary serial is populated from the first allocation when missing.
UPDATE order_details od
SET lottery_ticket_serial_id = src.lottery_ticket_serial_id,
    quantity = 1
FROM (
    SELECT DISTINCT ON (order_detail_id)
           order_detail_id,
           lottery_ticket_serial_id
    FROM order_detail_serials
    ORDER BY order_detail_id, id
) src
WHERE od.id = src.order_detail_id
  AND od.lottery_ticket_serial_id IS NULL;

-- 2) Expand extra allocations into their own order-detail rows.
INSERT INTO order_details (
    order_id,
    lottery_ticket_id,
    lottery_ticket_serial_id,
    replaced_by_ticket_serial_id,
    refund_request_id,
    quantity,
    price,
    status,
    created_at,
    updated_at,
    created_by,
    last_modified_by
)
SELECT
    od.order_id,
    COALESCE(
        od.lottery_ticket_id,
        (SELECT lts.ticket_id FROM lottery_ticket_serials lts WHERE lts.id = ods.lottery_ticket_serial_id)
    ),
    ods.lottery_ticket_serial_id,
    NULL,
    od.refund_request_id,
    1,
    od.price,
    od.status,
    COALESCE(ods.created_at, od.created_at, NOW()),
    COALESCE(od.updated_at, NOW()),
    od.created_by,
    od.last_modified_by
FROM order_detail_serials ods
JOIN order_details od ON od.id = ods.order_detail_id
WHERE ods.lottery_ticket_serial_id IS DISTINCT FROM od.lottery_ticket_serial_id
  AND NOT EXISTS (
        SELECT 1
        FROM order_details existing
        WHERE existing.order_id = od.order_id
          AND existing.lottery_ticket_serial_id = ods.lottery_ticket_serial_id
    );

-- 3) Normalize quantity on all details.
UPDATE order_details
SET quantity = 1
WHERE quantity IS DISTINCT FROM 1;

-- 4) Drop junction table — serial ownership lives on order_details.lottery_ticket_serial_id
--    (and replaced_by_ticket_serial_id after replacement).
DROP TABLE IF EXISTS order_detail_serials;
