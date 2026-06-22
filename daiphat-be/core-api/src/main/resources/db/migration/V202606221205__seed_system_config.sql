INSERT INTO system_config (config_key, config_value, config_type, data_type, description)
VALUES
    ('ORDER_PAYMENT_TIMEOUT_MINUTES', '15', 'PAYMENT', 'INTEGER', 'Thời gian chờ thanh toán đơn hàng (phút)'),
    ('DELIVERY_RADIUS_KM', '10', 'BOOKING', 'INTEGER', 'Bán kính giao vé tối đa (km)'),
    ('MAINTENANCE_MODE', 'false', 'SYSTEM', 'BOOLEAN', 'Bật/tắt chế độ bảo trì hệ thống'),
    ('SUPPORT_CONTACT_JSON', '{"phone":"1900xxxx","email":"support@daiphat.vn"}', 'SYSTEM', 'JSON', 'Thông tin liên hệ hỗ trợ')
ON CONFLICT (config_key) DO UPDATE SET
    config_value = EXCLUDED.config_value,
    config_type = EXCLUDED.config_type,
    data_type = EXCLUDED.data_type,
    description = EXCLUDED.description,
    updated_at = CURRENT_TIMESTAMP;
