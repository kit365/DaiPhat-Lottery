CREATE TABLE IF NOT EXISTS system_config (
    id               BIGSERIAL PRIMARY KEY,
    config_key       VARCHAR(50)  NOT NULL,
    config_value     TEXT         NOT NULL,
    config_type      VARCHAR(20)  NOT NULL,
    data_type        VARCHAR(20)  NOT NULL,
    description      VARCHAR(255) NOT NULL,
    config_name      VARCHAR(100) NOT NULL DEFAULT '',
    unit             VARCHAR(30),
    validation_rules TEXT,
    is_editable      BOOLEAN NOT NULL DEFAULT TRUE,
    is_active       BOOLEAN NOT NULL DEFAULT TRUE,

    created_at       TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at       TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by       VARCHAR(100) DEFAULT 'SYSTEM',
    last_modified_by VARCHAR(100) DEFAULT 'SYSTEM',

    CONSTRAINT uk_system_config_config_key UNIQUE (config_key)
);

CREATE INDEX IF NOT EXISTS idx_system_config_config_type ON system_config(config_type);
CREATE INDEX IF NOT EXISTS idx_system_config_is_active ON system_config(is_active);
