-- Return batch cancel fields are part of the return_batches CREATE TABLE.
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
    'RETURN_REMINDER_TIME',
    '15',
    'TICKET_RETURN',
    'INT',
    'Thời gian (phút) trước hạn trả vé NCC để nhắc khẩn kiểm tra phiếu trả',
    TRUE,
    NOW(),
    NOW()
WHERE NOT EXISTS (
    SELECT 1 FROM system_config WHERE config_key = 'RETURN_REMINDER_TIME'
);

UPDATE system_config
SET config_name = COALESCE(NULLIF(TRIM(config_name), ''), 'Nhắc kiểm tra trả vé'),
    unit = COALESCE(unit, 'phút'),
    validation_rules = COALESCE(validation_rules, '{"min":1,"max":1440}'),
    is_editable = TRUE,
    config_type = 'TICKET_RETURN',
    description = 'Thời gian (phút) trước hạn trả vé NCC để nhắc khẩn kiểm tra phiếu trả',
    config_value = COALESCE(NULLIF(TRIM(config_value), ''), '15'),
    is_active = TRUE,
    updated_at = NOW()
WHERE config_key = 'RETURN_REMINDER_TIME';
