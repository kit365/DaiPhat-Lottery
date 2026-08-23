-- ============================================================
-- Cleanup migrations for PROXY_HOLDING status
-- (consolidated from V202608181000 and V202608181400)
-- ============================================================

-- PROXY_HOLDING was removed from LotteryTicketSerialStatus enum.
-- Any legacy serial rows with this status must be remapped to SOLD
-- before Hibernate can load them.
UPDATE lottery_ticket_serials
SET status = 'SOLD',
    updated_at = NOW(),
    last_modified_by = 'CLEANUP_PROXY_HOLDING'
WHERE status = 'PROXY_HOLDING';

-- order_details.status is VARCHAR so PROXY_HOLDING is valid here.
-- ACTIVE was replaced by PROXY_HOLDING ("Công ty đang giữ vé").
UPDATE order_details
SET status = 'PROXY_HOLDING',
    updated_at = NOW(),
    last_modified_by = 'CLEANUP_ORDER_ACTIVE'
WHERE status = 'ACTIVE';
