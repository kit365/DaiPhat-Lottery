-- Dedicated import-batch time settings (replacing IMPORT_LATE_WINDOW_START reuse of VENDOR_RETURN_CUTOFF).

INSERT INTO system_config (config_key, config_value, config_type, data_type, description, is_active)
VALUES
    (
        'LATE_IMPORT_TIME',
        COALESCE(
            (SELECT config_value FROM system_config WHERE config_key = 'IMPORT_LATE_WINDOW_START' LIMIT 1),
            '14:30'
        ),
        'ORDER_SETTING',
        'TIME',
        'Giờ chốt sau đó lô nhập trong ngày được phân loại LATE_IMPORT',
        TRUE
    ),
    (
        'IMPORT_BATCH_CUTOFF_TIME',
        '15:00',
        'ORDER_SETTING',
        'TIME',
        'Giờ chốt sau đó không cho phép tạo lô nhập trong ngày (trừ lô nhập bổ sung)',
        TRUE
    )
ON CONFLICT (config_key) DO UPDATE SET
    config_value = EXCLUDED.config_value,
    config_type = EXCLUDED.config_type,
    data_type = EXCLUDED.data_type,
    description = EXCLUDED.description,
    is_active = TRUE,
    updated_at = CURRENT_TIMESTAMP;

UPDATE system_config
SET is_active = FALSE,
    updated_at = CURRENT_TIMESTAMP
WHERE config_key = 'IMPORT_LATE_WINDOW_START';
