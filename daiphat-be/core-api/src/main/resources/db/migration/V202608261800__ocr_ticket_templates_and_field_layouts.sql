-- Phase 1 OCR platform: per-station ticket templates + field layouts,
-- and nullable template_id on ocr_scan_results for scan attribution.

CREATE TABLE IF NOT EXISTS ocr_ticket_templates (
    id                  BIGSERIAL PRIMARY KEY,
    station_id          BIGINT NOT NULL,
    template_name       VARCHAR(150) NOT NULL,
    effective_from      DATE,
    effective_to        DATE,
    sample_image_url    VARCHAR(500),
    is_active           BOOLEAN NOT NULL DEFAULT TRUE,
    is_default          BOOLEAN NOT NULL DEFAULT FALSE,

    created_at          TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at          TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by          VARCHAR(100) DEFAULT 'SYSTEM',
    last_modified_by    VARCHAR(100) DEFAULT 'SYSTEM',
    deleted_at          TIMESTAMP,

    CONSTRAINT fk_ocr_ticket_templates_station
        FOREIGN KEY (station_id) REFERENCES lottery_stations(id) ON DELETE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS uk_ocr_ticket_templates_station_default
    ON ocr_ticket_templates (station_id)
    WHERE is_default = TRUE AND deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_ocr_ticket_templates_station_active_from
    ON ocr_ticket_templates (station_id, is_active, effective_from);

CREATE TABLE IF NOT EXISTS ocr_field_layouts (
    id                  BIGSERIAL PRIMARY KEY,
    template_id         BIGINT NOT NULL,
    field_name          VARCHAR(50) NOT NULL,
    bounding_box        JSONB NOT NULL,
    data_type           VARCHAR(30) NOT NULL DEFAULT 'STRING',
    is_required         BOOLEAN NOT NULL DEFAULT TRUE,

    created_at          TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at          TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by          VARCHAR(100) DEFAULT 'SYSTEM',
    last_modified_by    VARCHAR(100) DEFAULT 'SYSTEM',
    deleted_at          TIMESTAMP,

    CONSTRAINT fk_ocr_field_layouts_template
        FOREIGN KEY (template_id) REFERENCES ocr_ticket_templates(id) ON DELETE CASCADE,
    CONSTRAINT uk_ocr_field_layouts_template_field
        UNIQUE (template_id, field_name)
);

CREATE INDEX IF NOT EXISTS idx_ocr_field_layouts_template
    ON ocr_field_layouts (template_id);

ALTER TABLE ocr_scan_results
    ADD COLUMN IF NOT EXISTS template_id BIGINT;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'fk_ocr_scan_results_template'
    ) THEN
        ALTER TABLE ocr_scan_results
            ADD CONSTRAINT fk_ocr_scan_results_template
            FOREIGN KEY (template_id) REFERENCES ocr_ticket_templates(id) ON DELETE SET NULL;
    END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_ocr_scan_results_template
    ON ocr_scan_results (template_id);
