INSERT INTO system_config (
    config_key,
    config_value,
    description,
    config_type,
    data_type,
    is_active
)
SELECT
    'TICKET_AUTO_IMPORT_THRESHOLD',
    '50',
    'Số lượng vé lưu nháp tối đa trước khi hệ thống tự động lưu vào cơ sở dữ liệu.',
    'TICKET_IMPORT',
    'INTEGER',
    true
WHERE NOT EXISTS (
    SELECT 1 FROM system_config WHERE config_key = 'TICKET_AUTO_IMPORT_THRESHOLD'
);
