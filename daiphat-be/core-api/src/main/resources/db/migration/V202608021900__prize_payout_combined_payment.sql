-- Combined (cash + transfer) payout split for counter prize payouts
ALTER TABLE prize_payout_requests
    ADD COLUMN IF NOT EXISTS cash_amount NUMERIC(15, 2),
    ADD COLUMN IF NOT EXISTS transfer_amount NUMERIC(15, 2);

COMMENT ON COLUMN prize_payout_requests.cash_amount IS 'Cash portion paid at counter (COMBINED / CASH)';
COMMENT ON COLUMN prize_payout_requests.transfer_amount IS 'Bank transfer portion (COMBINED / TRANSFER)';
