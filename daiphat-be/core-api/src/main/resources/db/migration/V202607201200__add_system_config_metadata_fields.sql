-- Metadata columns are part of the system_config CREATE TABLE.
UPDATE system_config SET
    config_name = 'Thời gian ân hạn hủy đơn',
    unit = 'phút',
    validation_rules = '{"min":1,"max":1440}',
    is_editable = TRUE
WHERE config_key = 'ORDER_CANCEL_GRACE_MIN';

UPDATE system_config SET
    config_name = 'Giờ chốt hủy đơn khách hàng',
    unit = 'HH:mm',
    validation_rules = '{"min":"00:00","max":"23:59"}',
    is_editable = TRUE
WHERE config_key = 'CUSTOMER_CANCEL_CUTOFF';

UPDATE system_config SET
    config_name = 'SLA chuẩn bị đơn',
    unit = 'phút',
    validation_rules = '{"min":1,"max":1440}',
    is_editable = TRUE
WHERE config_key = 'ORDER_PREPARE_SLA_MIN';

UPDATE system_config SET
    config_name = 'Giờ chốt trả vé đại lý',
    unit = 'HH:mm',
    validation_rules = '{"min":"00:00","max":"23:59"}',
    is_editable = TRUE
WHERE config_key = 'VENDOR_RETURN_CUTOFF';

UPDATE system_config SET
    config_name = 'Giờ phân loại nhập muộn',
    unit = 'HH:mm',
    validation_rules = '{"min":"00:00","max":"23:59"}',
    is_editable = TRUE
WHERE config_key = 'LATE_IMPORT_TIME';

UPDATE system_config SET
    config_name = 'Giờ chốt tạo lô nhập',
    unit = 'HH:mm',
    validation_rules = '{"min":"00:00","max":"23:59"}',
    is_editable = TRUE
WHERE config_key = 'IMPORT_BATCH_CUTOFF_TIME';

UPDATE system_config SET
    config_name = 'Giờ chốt xử lý sự cố',
    unit = 'HH:mm',
    validation_rules = '{"min":"00:00","max":"23:59"}',
    is_editable = TRUE
WHERE config_key = 'STAFF_INCIDENT_CUTOFF';

UPDATE system_config SET
    config_name = 'Số ngày hết hạn thông tin không hợp lệ',
    unit = 'ngày',
    validation_rules = '{"min":1,"max":365}',
    is_editable = TRUE
WHERE config_key = 'INVALID_INFO_EXPIRED_DAYS';

UPDATE system_config SET
    config_name = 'Số yêu cầu hoàn tối đa mỗi ngày',
    unit = 'lần/ngày',
    validation_rules = '{"min":1,"max":100}',
    is_editable = TRUE
WHERE config_key = 'MAX_REFUND_REQUESTS_PER_DAY';

UPDATE system_config SET
    config_name = 'Số lần cập nhật TT ngân hàng tối đa',
    unit = 'lần',
    validation_rules = '{"min":1,"max":20}',
    is_editable = TRUE
WHERE config_key = 'MAX_REFUND_BANK_INFO_RETRY';
