-- CCCD front/back for counter prize payout identity capture
ALTER TABLE prize_payout_requests
    ADD COLUMN IF NOT EXISTS recipient_id_image_back_url VARCHAR(500);
