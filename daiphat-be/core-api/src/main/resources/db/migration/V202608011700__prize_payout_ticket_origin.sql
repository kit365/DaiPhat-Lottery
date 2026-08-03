-- Distinguish IN_PERSON ticket origins and allow payouts without linked customer (offline walk-in).

ALTER TABLE prize_payout_requests
    ADD COLUMN IF NOT EXISTS ticket_origin VARCHAR(30),
    ADD COLUMN IF NOT EXISTS ownership_verification_level VARCHAR(30),
    ADD COLUMN IF NOT EXISTS manual_ownership_confirmed BOOLEAN NOT NULL DEFAULT FALSE;

UPDATE prize_payout_requests p
SET ticket_origin = CASE
        WHEN o.order_type = 'ONLINE' THEN 'INTERNAL_ONLINE'
        ELSE 'INTERNAL_OFFLINE'
    END
FROM orders o
WHERE p.order_id = o.id
  AND p.ticket_origin IS NULL;

UPDATE prize_payout_requests
SET ticket_origin = COALESCE(ticket_origin, 'INTERNAL_OFFLINE'),
    ownership_verification_level = COALESCE(
        ownership_verification_level,
        CASE
            WHEN ticket_origin = 'INTERNAL_ONLINE' THEN 'AUTO_MATCHED'
            WHEN customer_id IS NOT NULL THEN 'CUSTOMER_LINKED'
            ELSE 'MANUAL_ONLY'
        END
    );

ALTER TABLE prize_payout_requests
    ALTER COLUMN ticket_origin SET NOT NULL,
    ALTER COLUMN ownership_verification_level SET NOT NULL;

ALTER TABLE prize_payout_requests
    ALTER COLUMN customer_id DROP NOT NULL;

CREATE INDEX IF NOT EXISTS idx_prize_payout_requests_ticket_origin
    ON prize_payout_requests (ticket_origin);
