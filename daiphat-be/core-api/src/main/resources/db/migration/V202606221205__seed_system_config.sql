INSERT INTO system_config (
    config_key,
    config_value,
    config_type,
    data_type,
    description,
    is_active
)
VALUES
    ('ORDER_CANCEL_GRACE_MIN', '30', 'ORDER_SETTING', 'INT', 'Thời gian ân hạn hủy đơn (phút)', TRUE),
    ('CUSTOMER_CANCEL_CUTOFF', '14:30', 'ORDER_SETTING', 'TIME', 'Giờ chốt hủy đơn của khách hàng', TRUE),
    ('ORDER_PREPARE_SLA_MIN', '30', 'ORDER_SETTING', 'INT', 'SLA chuẩn bị đơn (phút)', TRUE),
    ('VENDOR_RETURN_CUTOFF', '15:00', 'ORDER_SETTING', 'TIME', 'Giờ chốt trả vé cho đại lý', TRUE),
    ('STAFF_INCIDENT_CUTOFF', '16:00', 'REFUND_SETTING', 'TIME', 'Giờ chốt xử lý sự cố của nhân viên', TRUE),
    ('INVALID_INFO_EXPIRED_DAYS', '7', 'REFUND_SETTING', 'INT', 'Số ngày hết hạn thông tin không hợp lệ', TRUE),
    ('LATE_IMPORT_TIME', '14:30', 'TICKET_IMPORT', 'TIME', 'Giờ chốt sau đó lô nhập trong ngày được phân loại LATE_IMPORT', TRUE),
    ('IMPORT_BATCH_CUTOFF_TIME', '15:00', 'TICKET_IMPORT', 'TIME', 'Giờ chốt sau đó không cho phép tạo lô nhập trong ngày (trừ lô nhập bổ sung)', TRUE)
ON CONFLICT (config_key) DO UPDATE SET
    config_value = EXCLUDED.config_value,
    config_type = EXCLUDED.config_type,
    data_type = EXCLUDED.data_type,
    description = EXCLUDED.description,
    is_active = EXCLUDED.is_active,
    updated_at = CURRENT_TIMESTAMP;
