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

-- Seed default Groq vision model used by ticket-vision.
INSERT INTO ai_model_registry (provider, model_name, display_name, is_active, is_default, notes)
VALUES (
    'groq',
    'qwen/qwen3.6-27b',
    'Groq Qwen 3.6 27B Vision',
    TRUE,
    TRUE,
    'Default ticket-vision engine (GROQ_VISION_MODEL).'
)
ON CONFLICT (provider, model_name) DO NOTHING;
