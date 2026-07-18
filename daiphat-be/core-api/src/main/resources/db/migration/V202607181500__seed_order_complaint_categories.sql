INSERT INTO ticket_categories (name, code, description, priority, required_ref_type, created_at, updated_at, created_by, last_modified_by)
VALUES
    (
        'Lỗi đồng bộ thanh toán',
        'PAYMENT_SYNC_ERROR',
        'Khiếu nại khi đơn bị hủy do quá thời gian thanh toán nhưng khách đã chuyển khoản thành công',
        1,
        'ORDER',
        NOW(),
        NOW(),
        'SYSTEM',
        'SYSTEM'
    ),
    (
        'Chuẩn bị đơn chậm',
        'ORDER_PREPARATION_DELAY',
        'Khiếu nại khi cửa hàng chuẩn bị đơn chậm hoặc quá giờ mở thưởng',
        1,
        'ORDER',
        NOW(),
        NOW(),
        'SYSTEM',
        'SYSTEM'
    ),
    (
        'Không nhận được vé',
        'ORDER_PICKUP_ISSUE',
        'Khiếu nại khi khách không thể nhận vé khi đơn đang chờ nhận',
        1,
        'ORDER',
        NOW(),
        NOW(),
        'SYSTEM',
        'SYSTEM'
    ),
    (
        'Chất lượng dịch vụ',
        'ORDER_SERVICE_QUALITY',
        'Khiếu nại về thái độ nhân viên hoặc chất lượng phục vụ sau khi đơn hoàn thành',
        2,
        'ORDER',
        NOW(),
        NOW(),
        'SYSTEM',
        'SYSTEM'
    )
ON CONFLICT (code) DO UPDATE SET
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    priority = EXCLUDED.priority,
    required_ref_type = EXCLUDED.required_ref_type,
    updated_at = NOW(),
    last_modified_by = 'SYSTEM';
