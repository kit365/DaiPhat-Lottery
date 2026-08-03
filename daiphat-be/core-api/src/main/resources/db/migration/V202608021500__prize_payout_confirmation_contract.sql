-- Counter payout: signed confirmation contract from customer
ALTER TABLE prize_payout_requests
    ADD COLUMN IF NOT EXISTS confirmation_contract_url VARCHAR(500);
