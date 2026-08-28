-- Phase 2: per-field OCR rows for analytics and Admin corrections.
-- Parent ocr_scan_results JSONB snapshots remain the FE read model.

CREATE TABLE IF NOT EXISTS ocr_scan_result_fields (
    id                      BIGSERIAL PRIMARY KEY,
    ocr_scan_result_id      BIGINT NOT NULL,
    field_name              VARCHAR(50) NOT NULL,

    ai_value                TEXT,
    ai_confidence           DOUBLE PRECISION,
    detected_bounding_box   JSONB,

    corrected_value         TEXT,
    is_corrected            BOOLEAN NOT NULL DEFAULT FALSE,
    corrected_by            UUID,
    corrected_at            TIMESTAMP,

    validation_status       VARCHAR(20),
    validation_message      VARCHAR(500),
    expected_value          TEXT,

    created_at              TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at              TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by              VARCHAR(100) DEFAULT 'SYSTEM',
    last_modified_by        VARCHAR(100) DEFAULT 'SYSTEM',
    deleted_at              TIMESTAMP,

    CONSTRAINT fk_ocr_scan_result_fields_result
        FOREIGN KEY (ocr_scan_result_id) REFERENCES ocr_scan_results(id) ON DELETE CASCADE,
    CONSTRAINT fk_ocr_scan_result_fields_corrected_by
        FOREIGN KEY (corrected_by) REFERENCES users(id) ON DELETE SET NULL,
    CONSTRAINT uk_ocr_scan_result_fields_result_field
        UNIQUE (ocr_scan_result_id, field_name)
);

CREATE INDEX IF NOT EXISTS idx_ocr_scan_result_fields_result
    ON ocr_scan_result_fields (ocr_scan_result_id);

CREATE INDEX IF NOT EXISTS idx_ocr_scan_result_fields_corrected
    ON ocr_scan_result_fields (is_corrected, field_name)
    WHERE deleted_at IS NULL;
