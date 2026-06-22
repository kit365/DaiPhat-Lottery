INSERT INTO system_config (config_key, config_value, config_type, data_type, description)
VALUES
    ('ORDER_CANCEL_GRACE_MIN', '30', 'ORDER_SETTING', 'INT', 'Thời gian ân hạn hủy đơn (phút)'),
    ('CUSTOMER_CANCEL_CUTOFF', '14:30', 'ORDER_SETTING', 'TIME', 'Giờ chốt hủy đơn của khách hàng'),
    ('ORDER_PREPARE_SLA_MIN', '30', 'ORDER_SETTING', 'INT', 'SLA chuẩn bị đơn (phút)'),
    ('VENDOR_RETURN_CUTOFF', '15:00', 'ORDER_SETTING', 'TIME', 'Giờ chốt trả vé cho đại lý'),
    ('STAFF_INCIDENT_CUTOFF', '16:00', 'REFUND_SETTING', 'TIME', 'Giờ chốt xử lý sự cố của nhân viên'),
    ('INVALID_INFO_EXPIRED_DAYS', '7', 'REFUND_SETTING', 'INT', 'Số ngày hết hạn thông tin không hợp lệ')
ON CONFLICT (config_key) DO UPDATE SET
    config_value = EXCLUDED.config_value,
    config_type = EXCLUDED.config_type,
    data_type = EXCLUDED.data_type,
    description = EXCLUDED.description,
    updated_at = CURRENT_TIMESTAMP;
