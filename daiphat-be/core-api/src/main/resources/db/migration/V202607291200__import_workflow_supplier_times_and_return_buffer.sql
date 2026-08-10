-- Migrate legacy LATE_IMPORT line types (type no longer exists).
UPDATE import_batch_lines
SET batch_type = 'NEW'
WHERE batch_type = 'LATE_IMPORT';

-- Deactivate obsolete import cutoff configs and add return buffer.
UPDATE system_config
SET is_active = FALSE,
    updated_at = NOW()
WHERE config_key IN ('LATE_IMPORT_TIME', 'IMPORT_BATCH_CUTOFF_TIME');

INSERT INTO system_config (
    config_key,
    config_value,
    config_type,
    data_type,
    description,
    is_active,
    created_at,
    updated_at
)
SELECT
    'RETURN_BUFFER_TIME',
    '45',
    'TICKET_IMPORT',
    'INT',
    'Thời gian đệm (phút) trước hạn trả vé của nhà cung cấp',
    TRUE,
    NOW(),
    NOW()
WHERE NOT EXISTS (
    SELECT 1 FROM system_config WHERE config_key = 'RETURN_BUFFER_TIME'
);

UPDATE system_config
SET config_name = COALESCE(NULLIF(TRIM(config_name), ''), 'Thời gian đệm trả vé'),
    unit = COALESCE(unit, 'phút'),
    validation_rules = COALESCE(validation_rules, '{"min":0,"max":1440}'),
    is_editable = TRUE,
    description = 'Thời gian đệm (phút) trước hạn trả vé của nhà cung cấp',
    config_value = COALESCE(NULLIF(TRIM(config_value), ''), '45'),
    is_active = TRUE,
    updated_at = NOW()
WHERE config_key = 'RETURN_BUFFER_TIME';
