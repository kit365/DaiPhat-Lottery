-- Add CCCD eKYC image + verification audit columns (nullable for legacy rows).

ALTER TABLE street_agent_profiles
    ADD COLUMN IF NOT EXISTS cccd_front_image_url VARCHAR(500),
    ADD COLUMN IF NOT EXISTS cccd_back_image_url VARCHAR(500),
    ADD COLUMN IF NOT EXISTS cccd_selfie_image_url VARCHAR(500),
    ADD COLUMN IF NOT EXISTS ekyc_status VARCHAR(32),
    ADD COLUMN IF NOT EXISTS ekyc_face_distance DOUBLE PRECISION,
    ADD COLUMN IF NOT EXISTS ekyc_liveness_score DOUBLE PRECISION,
    ADD COLUMN IF NOT EXISTS ekyc_failure_reason VARCHAR(500),
    ADD COLUMN IF NOT EXISTS ekyc_ocr_name VARCHAR(255),
    ADD COLUMN IF NOT EXISTS ekyc_ocr_id_number VARCHAR(64),
    ADD COLUMN IF NOT EXISTS ekyc_verified_at TIMESTAMPTZ;

ALTER TABLE prize_payout_requests
    ADD COLUMN IF NOT EXISTS recipient_selfie_url VARCHAR(500),
    ADD COLUMN IF NOT EXISTS ekyc_status VARCHAR(32),
    ADD COLUMN IF NOT EXISTS ekyc_face_distance DOUBLE PRECISION,
    ADD COLUMN IF NOT EXISTS ekyc_liveness_score DOUBLE PRECISION,
    ADD COLUMN IF NOT EXISTS ekyc_failure_reason VARCHAR(500),
    ADD COLUMN IF NOT EXISTS ekyc_ocr_name VARCHAR(255),
    ADD COLUMN IF NOT EXISTS ekyc_verified_at TIMESTAMPTZ;
