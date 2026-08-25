-- Extend ocr_scan_results for bbox overlay, field confidence, and system validation.

ALTER TABLE ocr_scan_results
    ADD COLUMN IF NOT EXISTS source_image_name VARCHAR(255),
    ADD COLUMN IF NOT EXISTS bbox JSONB,
    ADD COLUMN IF NOT EXISTS image_width INTEGER,
    ADD COLUMN IF NOT EXISTS image_height INTEGER,
    ADD COLUMN IF NOT EXISTS field_confidences JSONB,
    ADD COLUMN IF NOT EXISTS field_validations JSONB,
    ADD COLUMN IF NOT EXISTS overall_validation_status VARCHAR(20),
    ADD COLUMN IF NOT EXISTS extracted_batch_code VARCHAR(100),
    ADD COLUMN IF NOT EXISTS extracted_price VARCHAR(50),
    ADD COLUMN IF NOT EXISTS adjusted_confidence DOUBLE PRECISION;
