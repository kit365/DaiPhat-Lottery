ALTER TABLE system_config
    ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT TRUE;

UPDATE system_config
SET is_active = TRUE
WHERE is_active IS NULL;

CREATE INDEX IF NOT EXISTS idx_system_config_is_active ON system_config(is_active);
