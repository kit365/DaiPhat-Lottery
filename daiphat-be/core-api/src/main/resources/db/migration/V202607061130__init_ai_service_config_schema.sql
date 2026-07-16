CREATE TABLE IF NOT EXISTS ai_service_configs (
    id BIGSERIAL PRIMARY KEY,
    service_name VARCHAR(50) NOT NULL,
    description VARCHAR(500),
    enabled BOOLEAN NOT NULL DEFAULT FALSE,
    switch_intent_threshold DOUBLE PRECISION NOT NULL DEFAULT 0.85,
    active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP,
    updated_at TIMESTAMP,
    created_by VARCHAR(255),
    last_modified_by VARCHAR(255),
    deleted_at TIMESTAMP,
    CONSTRAINT uk_ai_service_configs_service_name UNIQUE (service_name),
    CONSTRAINT chk_ai_service_configs_switch_threshold
        CHECK (switch_intent_threshold >= 0 AND switch_intent_threshold <= 1)
);

CREATE INDEX IF NOT EXISTS idx_ai_service_configs_active
    ON ai_service_configs (service_name, active)
    WHERE deleted_at IS NULL;

CREATE TABLE IF NOT EXISTS ai_intent_configs (
    id BIGSERIAL PRIMARY KEY,
    ai_service_config_id BIGINT NOT NULL,
    intent VARCHAR(50) NOT NULL,
    description VARCHAR(500),
    enabled BOOLEAN NOT NULL DEFAULT TRUE,
    priority INT NOT NULL DEFAULT 100,
    fallback_to_human BOOLEAN NOT NULL DEFAULT FALSE,
    config_json JSONB NOT NULL DEFAULT '{}'::jsonb,
    active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP,
    updated_at TIMESTAMP,
    created_by VARCHAR(255),
    last_modified_by VARCHAR(255),
    deleted_at TIMESTAMP,
    CONSTRAINT fk_ai_intent_configs_service
        FOREIGN KEY (ai_service_config_id) REFERENCES ai_service_configs (id),
    CONSTRAINT uk_ai_intent_configs_service_intent
        UNIQUE (ai_service_config_id, intent)
);

CREATE INDEX IF NOT EXISTS idx_ai_intent_configs_service_active
    ON ai_intent_configs (ai_service_config_id, active)
    WHERE deleted_at IS NULL;
