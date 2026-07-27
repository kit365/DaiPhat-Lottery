/* Redundant and broken DDL for import_batches removed */

INSERT INTO system_config (config_key, config_value, config_type, data_type, description)
VALUES
    ('IMPORT_LATE_WINDOW_START', '14:30', 'ORDER_SETTING', 'TIME', 'Giờ bắt đầu khung nhập muộn lô vé')
ON CONFLICT (config_key) DO UPDATE SET
    config_value = EXCLUDED.config_value,
    config_type = EXCLUDED.config_type,
    data_type = EXCLUDED.data_type,
    description = EXCLUDED.description,
    updated_at = CURRENT_TIMESTAMP;
