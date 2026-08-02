-- Guardrails: recipient identity capture for high-value / manual-only counter payouts
ALTER TABLE prize_payout_requests
    ADD COLUMN IF NOT EXISTS recipient_full_name VARCHAR(200),
    ADD COLUMN IF NOT EXISTS recipient_id_number VARCHAR(20),
    ADD COLUMN IF NOT EXISTS recipient_id_image_url VARCHAR(500),
    ADD COLUMN IF NOT EXISTS recipient_identity_captured_at TIMESTAMPTZ;
