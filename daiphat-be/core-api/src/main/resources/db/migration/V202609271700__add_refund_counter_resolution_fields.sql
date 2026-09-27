-- In-person resolution of MANUAL_RESOLUTION refunds: customer CCCD eKYC (OCR only) + counter payout method.

ALTER TABLE refund_requests
    ADD COLUMN IF NOT EXISTS cccd_front_image_url VARCHAR(500),
    ADD COLUMN IF NOT EXISTS cccd_back_image_url VARCHAR(500),
    ADD COLUMN IF NOT EXISTS ekyc_status VARCHAR(32),
    ADD COLUMN IF NOT EXISTS ekyc_failure_reason VARCHAR(500),
    ADD COLUMN IF NOT EXISTS ekyc_ocr_name VARCHAR(255),
    ADD COLUMN IF NOT EXISTS ekyc_ocr_id_number VARCHAR(64),
    ADD COLUMN IF NOT EXISTS ekyc_ocr_dob VARCHAR(32),
    ADD COLUMN IF NOT EXISTS ekyc_ocr_gender VARCHAR(32),
    ADD COLUMN IF NOT EXISTS ekyc_ocr_nationality VARCHAR(100),
    ADD COLUMN IF NOT EXISTS ekyc_ocr_place_of_birth VARCHAR(500),
    ADD COLUMN IF NOT EXISTS ekyc_ocr_place_of_residence VARCHAR(500),
    ADD COLUMN IF NOT EXISTS ekyc_ocr_issue_date VARCHAR(64),
    ADD COLUMN IF NOT EXISTS ekyc_ocr_expiry_date VARCHAR(64),
    ADD COLUMN IF NOT EXISTS ekyc_verified_at TIMESTAMP,
    ADD COLUMN IF NOT EXISTS counter_payout_method VARCHAR(20);
