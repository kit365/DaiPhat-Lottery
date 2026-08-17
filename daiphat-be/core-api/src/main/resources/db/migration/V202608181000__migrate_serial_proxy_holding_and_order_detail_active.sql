-- Company-hold moved off lottery_ticket_serials onto order_details.
-- Local/seed rows still store LotteryTicketSerialStatus.PROXY_HOLDING, which Hibernate
-- can no longer map after that constant was removed from the enum.
UPDATE lottery_ticket_serials
SET status = 'SOLD',
    updated_at = NOW()
WHERE status = 'PROXY_HOLDING';

-- OrderDetailStatus.ACTIVE was replaced by PROXY_HOLDING ("Công ty đang giữ vé").
ALTER TABLE order_details
    ALTER COLUMN status TYPE VARCHAR(40);

UPDATE order_details
SET status = 'PROXY_HOLDING',
    updated_at = NOW()
WHERE status = 'ACTIVE';
