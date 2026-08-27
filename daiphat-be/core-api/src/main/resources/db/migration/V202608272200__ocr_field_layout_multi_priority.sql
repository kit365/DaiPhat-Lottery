-- Allow multiple OCR_Field_Layout rows per fieldName on one template,
-- ordered by priority (1 = primary). Track which layout produced each scan field.

ALTER TABLE ocr_field_layouts
    ADD COLUMN IF NOT EXISTS priority INT NOT NULL DEFAULT 1;

ALTER TABLE ocr_field_layouts
    DROP CONSTRAINT IF EXISTS uk_ocr_field_layouts_template_field;

-- Soft-delete-aware uniqueness: one priority slot per field per live template.
CREATE UNIQUE INDEX IF NOT EXISTS uk_ocr_field_layouts_template_field_priority
    ON ocr_field_layouts (template_id, field_name, priority)
    WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_ocr_field_layouts_template_field_priority
    ON ocr_field_layouts (template_id, field_name, priority)
    WHERE deleted_at IS NULL;

ALTER TABLE ocr_scan_result_fields
    ADD COLUMN IF NOT EXISTS field_layout_id BIGINT;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'fk_ocr_scan_result_fields_field_layout'
    ) THEN
        ALTER TABLE ocr_scan_result_fields
            ADD CONSTRAINT fk_ocr_scan_result_fields_field_layout
            FOREIGN KEY (field_layout_id) REFERENCES ocr_field_layouts(id) ON DELETE SET NULL;
    END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_ocr_scan_result_fields_field_layout
    ON ocr_scan_result_fields (field_layout_id);

-- Snapshot of fieldName -> layoutId used for the recognized value (parent JSON).
ALTER TABLE ocr_scan_results
    ADD COLUMN IF NOT EXISTS used_field_layouts JSONB;
