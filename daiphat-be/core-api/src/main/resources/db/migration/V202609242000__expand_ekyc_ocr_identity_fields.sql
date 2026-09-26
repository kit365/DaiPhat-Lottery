-- Expand eKYC OCR identity fields; allow Street Agent CCCD to be set from OCR after verify.

-- street_agent_profiles: nullable CCCD until OCR verify; partial unique for non-null values
ALTER TABLE street_agent_profiles
    ALTER COLUMN cccd DROP NOT NULL;

ALTER TABLE street_agent_profiles
    DROP CONSTRAINT IF EXISTS uq_street_agent_profiles_cccd,
    DROP CONSTRAINT IF EXISTS street_agent_profiles_cccd_key;

CREATE UNIQUE INDEX IF NOT EXISTS uq_street_agent_profiles_cccd_not_null
    ON street_agent_profiles (cccd)
    WHERE cccd IS NOT NULL AND deleted_at IS NULL;

ALTER TABLE street_agent_profiles
    ADD COLUMN IF NOT EXISTS ekyc_ocr_dob VARCHAR(32),
    ADD COLUMN IF NOT EXISTS ekyc_ocr_gender VARCHAR(32),
    ADD COLUMN IF NOT EXISTS ekyc_ocr_nationality VARCHAR(100),
    ADD COLUMN IF NOT EXISTS ekyc_ocr_place_of_birth VARCHAR(500),
    ADD COLUMN IF NOT EXISTS ekyc_ocr_place_of_residence VARCHAR(500),
    ADD COLUMN IF NOT EXISTS ekyc_ocr_issue_date VARCHAR(64),
    ADD COLUMN IF NOT EXISTS ekyc_ocr_expiry_date VARCHAR(64);

ALTER TABLE prize_payout_requests
    ADD COLUMN IF NOT EXISTS ekyc_ocr_id_number VARCHAR(64),
    ADD COLUMN IF NOT EXISTS ekyc_ocr_dob VARCHAR(32),
    ADD COLUMN IF NOT EXISTS ekyc_ocr_gender VARCHAR(32),
    ADD COLUMN IF NOT EXISTS ekyc_ocr_nationality VARCHAR(100),
    ADD COLUMN IF NOT EXISTS ekyc_ocr_place_of_birth VARCHAR(500),
    ADD COLUMN IF NOT EXISTS ekyc_ocr_place_of_residence VARCHAR(500),
    ADD COLUMN IF NOT EXISTS ekyc_ocr_issue_date VARCHAR(64),
    ADD COLUMN IF NOT EXISTS ekyc_ocr_expiry_date VARCHAR(64);
