-- DP-269 follow-up: scan/verification audit trail, kept separate from a
-- general-purpose audit log (faster reporting queries, scan-specific
-- fields like scan_method/is_valid, no extra weight on Audit_Log).

CREATE TABLE IF NOT EXISTS ocr_scan_results (
    id                          BIGSERIAL PRIMARY KEY,

    -- Correlates back to ticket-vision's scan batch (TicketScanResponse.scanId)
    -- and this ticket's position within it.
    scan_id                     VARCHAR(100) NOT NULL,
    ticket_index                INTEGER NOT NULL,

    import_batch_line_id        BIGINT,
    station_id                  BIGINT,

    extracted_station_name      VARCHAR(255),
    extracted_serial_number     VARCHAR(100),
    extracted_numbers           VARCHAR(50),
    extracted_draw_date         DATE,
    confidence                  DOUBLE PRECISION,

    -- ScannedTicketStatus: COMPLETE / NEEDS_REVIEW / INCOMPLETE
    status                      VARCHAR(20),
    missing_fields               JSONB,
    validation_errors           JSONB,
    business_validation_errors  JSONB,
    cropped_image_url           VARCHAR(500),

    scanned_by                  UUID NOT NULL,
    scanned_at                  TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    -- Audit
    created_at                  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at                  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by                  VARCHAR(100) DEFAULT 'SYSTEM',
    last_modified_by            VARCHAR(100) DEFAULT 'SYSTEM',
    deleted_at                  TIMESTAMP,

    CONSTRAINT fk_ocr_scan_results_import_batch_line
        FOREIGN KEY (import_batch_line_id) REFERENCES import_batch_lines(id) ON DELETE SET NULL,
    CONSTRAINT fk_ocr_scan_results_station
        FOREIGN KEY (station_id) REFERENCES lottery_stations(id) ON DELETE SET NULL,
    CONSTRAINT fk_ocr_scan_results_scanned_by
        FOREIGN KEY (scanned_by) REFERENCES users(id) ON DELETE RESTRICT
);

CREATE INDEX IF NOT EXISTS idx_ocr_scan_results_scan_id ON ocr_scan_results(scan_id);
CREATE INDEX IF NOT EXISTS idx_ocr_scan_results_scanned_by ON ocr_scan_results(scanned_by);
CREATE INDEX IF NOT EXISTS idx_ocr_scan_results_import_batch_line ON ocr_scan_results(import_batch_line_id);

CREATE TABLE IF NOT EXISTS lottery_scan_logs (
    id                          BIGSERIAL PRIMARY KEY,

    -- ScanEventType: SCAN_STARTED, OCR_COMPLETED, MANUAL_INPUT, VERIFY_PASSED,
    -- VERIFY_FAILED, TICKET_CREATED, TICKET_FOUND, TICKET_NOT_FOUND,
    -- INVALID_TICKET, SCAN_COMPLETED
    event_type                  VARCHAR(30) NOT NULL,

    ocr_scan_result_id          BIGINT,
    lottery_ticket_serial_id    BIGINT,
    scanned_by                  UUID NOT NULL,

    -- ScanMethod: QR_SCAN, OCR_SCAN, MANUAL_INPUT. OCR_SCAN was added
    -- alongside qr_scan/manual_input (the two the spec named) so every
    -- OCR-camera-scan event has a coherent value here too.
    scan_method                 VARCHAR(20),
    is_valid                    BOOLEAN,
    note                        VARCHAR(500),

    scanned_at                  TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    -- Audit
    created_at                  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at                  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by                  VARCHAR(100) DEFAULT 'SYSTEM',
    last_modified_by            VARCHAR(100) DEFAULT 'SYSTEM',
    deleted_at                  TIMESTAMP,

    CONSTRAINT fk_lottery_scan_logs_ocr_scan_result
        FOREIGN KEY (ocr_scan_result_id) REFERENCES ocr_scan_results(id) ON DELETE SET NULL,
    CONSTRAINT fk_lottery_scan_logs_ticket_serial
        FOREIGN KEY (lottery_ticket_serial_id) REFERENCES lottery_ticket_serials(id) ON DELETE SET NULL,
    CONSTRAINT fk_lottery_scan_logs_scanned_by
        FOREIGN KEY (scanned_by) REFERENCES users(id) ON DELETE RESTRICT
);

CREATE INDEX IF NOT EXISTS idx_lottery_scan_logs_event_type ON lottery_scan_logs(event_type);
CREATE INDEX IF NOT EXISTS idx_lottery_scan_logs_ticket_serial ON lottery_scan_logs(lottery_ticket_serial_id);
CREATE INDEX IF NOT EXISTS idx_lottery_scan_logs_scanned_by ON lottery_scan_logs(scanned_by);
CREATE INDEX IF NOT EXISTS idx_lottery_scan_logs_scanned_at ON lottery_scan_logs(scanned_at);
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
-- Per-field bounding boxes from ticket-vision (station, serial, numbers, …).

ALTER TABLE ocr_scan_results
    ADD COLUMN IF NOT EXISTS field_boxes JSONB;
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
-- Phase 3/4: AI model registry, metrics, training export; link ocr_scan_results.

CREATE TABLE IF NOT EXISTS ai_model_registry (
    id                  BIGSERIAL PRIMARY KEY,
    provider            VARCHAR(50) NOT NULL,
    model_name          VARCHAR(150) NOT NULL,
    display_name        VARCHAR(200) NOT NULL,
    is_active           BOOLEAN NOT NULL DEFAULT TRUE,
    is_default          BOOLEAN NOT NULL DEFAULT FALSE,
    notes               VARCHAR(500),

    created_at          TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at          TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by          VARCHAR(100) DEFAULT 'SYSTEM',
    last_modified_by    VARCHAR(100) DEFAULT 'SYSTEM',
    deleted_at          TIMESTAMP,

    CONSTRAINT uk_ai_model_registry_provider_model
        UNIQUE (provider, model_name)
);

CREATE UNIQUE INDEX IF NOT EXISTS uk_ai_model_registry_default
    ON ai_model_registry (provider)
    WHERE is_default = TRUE AND deleted_at IS NULL;

CREATE TABLE IF NOT EXISTS ai_model_metric (
    id                  BIGSERIAL PRIMARY KEY,
    model_id            BIGINT NOT NULL,
    metric_date         DATE NOT NULL,
    field_name          VARCHAR(50) NOT NULL,
    total_fields        BIGINT NOT NULL DEFAULT 0,
    corrected_fields    BIGINT NOT NULL DEFAULT 0,
    avg_ai_confidence   DOUBLE PRECISION,

    created_at          TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at          TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by          VARCHAR(100) DEFAULT 'SYSTEM',
    last_modified_by    VARCHAR(100) DEFAULT 'SYSTEM',
    deleted_at          TIMESTAMP,

    CONSTRAINT fk_ai_model_metric_model
        FOREIGN KEY (model_id) REFERENCES ai_model_registry(id) ON DELETE CASCADE,
    CONSTRAINT uk_ai_model_metric_day_field
        UNIQUE (model_id, metric_date, field_name)
);

CREATE INDEX IF NOT EXISTS idx_ai_model_metric_date
    ON ai_model_metric (metric_date);

CREATE TABLE IF NOT EXISTS training_dataset_export (
    id                  BIGSERIAL PRIMARY KEY,
    filter_json         JSONB NOT NULL DEFAULT '{}'::jsonb,
    file_path           VARCHAR(1000),
    row_count           BIGINT NOT NULL DEFAULT 0,
    status              VARCHAR(30) NOT NULL DEFAULT 'PENDING',
    used_for_model_id   BIGINT,
    error_message       VARCHAR(1000),
    exported_at         TIMESTAMP,

    created_at          TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at          TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by          VARCHAR(100) DEFAULT 'SYSTEM',
    last_modified_by    VARCHAR(100) DEFAULT 'SYSTEM',
    deleted_at          TIMESTAMP,

    CONSTRAINT fk_training_dataset_export_model
        FOREIGN KEY (used_for_model_id) REFERENCES ai_model_registry(id) ON DELETE SET NULL
);

ALTER TABLE ocr_scan_results
    ADD COLUMN IF NOT EXISTS ai_model_id BIGINT;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'fk_ocr_scan_results_ai_model'
    ) THEN
        ALTER TABLE ocr_scan_results
            ADD CONSTRAINT fk_ocr_scan_results_ai_model
            FOREIGN KEY (ai_model_id) REFERENCES ai_model_registry(id) ON DELETE SET NULL;
    END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_ocr_scan_results_ai_model
    ON ocr_scan_results (ai_model_id);

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
