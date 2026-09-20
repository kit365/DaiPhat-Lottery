-- Configurable OCR field validation rules (per ticket template / field).
-- Failures from these rules are stored on ocr_scan_result_fields.validation_failures.

CREATE TABLE IF NOT EXISTS ocr_field_validation_rules (
    id                  BIGSERIAL PRIMARY KEY,
    template_id         BIGINT NOT NULL,
    field_layout_id     BIGINT,
    field_name          VARCHAR(50) NOT NULL,
    rule_type           VARCHAR(30) NOT NULL,
    rule_config         JSONB NOT NULL DEFAULT '{}'::jsonb,
    severity            VARCHAR(20) NOT NULL DEFAULT 'HARD_FAIL',
    is_active           BOOLEAN NOT NULL DEFAULT TRUE,
    sort_order          INT NOT NULL DEFAULT 0,

    created_at          TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at          TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by          VARCHAR(100) DEFAULT 'SYSTEM',
    last_modified_by    VARCHAR(100) DEFAULT 'SYSTEM',
    deleted_at          TIMESTAMP,

    CONSTRAINT fk_ocr_field_validation_rules_template
        FOREIGN KEY (template_id) REFERENCES ocr_ticket_templates(id) ON DELETE CASCADE,
    CONSTRAINT fk_ocr_field_validation_rules_field_layout
        FOREIGN KEY (field_layout_id) REFERENCES ocr_field_layouts(id) ON DELETE SET NULL,
    CONSTRAINT ck_ocr_field_validation_rules_rule_type
        CHECK (rule_type IN ('REGEX', 'VALUE_LIST', 'DATE_RANGE', 'NUMBER_RANGE', 'REFERENCE_LOOKUP')),
    CONSTRAINT ck_ocr_field_validation_rules_severity
        CHECK (severity IN ('HARD_FAIL', 'SOFT_WARNING'))
);

CREATE INDEX IF NOT EXISTS idx_ocr_field_validation_rules_template
    ON ocr_field_validation_rules (template_id)
    WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_ocr_field_validation_rules_template_field
    ON ocr_field_validation_rules (template_id, field_name)
    WHERE deleted_at IS NULL AND is_active = TRUE;

ALTER TABLE ocr_scan_result_fields
    ADD COLUMN IF NOT EXISTS validation_failures JSONB;
