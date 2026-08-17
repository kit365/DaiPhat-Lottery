-- Tickets-branch enum: company-hold is OrderDetailStatus.PROXY_HOLDING, not a serial status.
-- V202608181200 still wrote LotteryTicketSerialStatus.PROXY_HOLDING which Hibernate cannot map.

UPDATE lottery_ticket_serials
SET status = 'SOLD',
    updated_at = NOW(),
    last_modified_by = 'FIX_SERIAL_PROXY_HOLDING'
WHERE status = 'PROXY_HOLDING';

UPDATE order_details
SET status = 'PROXY_HOLDING',
    updated_at = NOW(),
    last_modified_by = 'FIX_DETAIL_ACTIVE'
WHERE status = 'ACTIVE';
