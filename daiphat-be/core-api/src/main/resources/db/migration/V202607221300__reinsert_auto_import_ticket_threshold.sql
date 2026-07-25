INSERT INTO system_config (
    config_name,
    config_key,
    config_value,
    description,
    config_type,
    data_type,
    is_active,
    unit,
    is_editable
)
VALUES (
    'Ngưỡng số lượng vé tự động nhập',
    'TICKET_AUTO_IMPORT_THRESHOLD',
    '50',
    'Số lượng vé lưu nháp tối đa trước khi hệ thống tự động lưu vào cơ sở dữ liệu.',
    'TICKET_IMPORT',
    'INT',
    true,
    'vé',
    true
)
ON CONFLICT (config_key) DO UPDATE SET
    config_name = EXCLUDED.config_name,
    config_value = EXCLUDED.config_value,
    description = EXCLUDED.description,
    config_type = EXCLUDED.config_type,
    data_type = EXCLUDED.data_type,
    is_active = EXCLUDED.is_active,
    unit = EXCLUDED.unit,
    is_editable = EXCLUDED.is_editable,
    updated_at = CURRENT_TIMESTAMP;
