INSERT INTO ticket_categories (
    name, code, description, priority, required_ref_type, parent_id,
    created_at, updated_at, created_by, last_modified_by
)
SELECT seed.name,
       seed.code,
       seed.description,
       seed.priority,
       seed.required_ref_type,
       parent.id,
       NOW(),
       NOW(),
       'SYSTEM',
       'SYSTEM'
FROM (
    VALUES
        (
            'Lỗi đồng bộ thanh toán',
            'PAYMENT_SYNC_ERROR',
            'Khiếu nại khi đơn bị hủy do quá thời gian thanh toán nhưng khách đã chuyển khoản thành công',
            2,
            'ORDER'
        ),
        (
            'Chuẩn bị đơn chậm',
            'ORDER_PREPARATION_DELAY',
            'Khiếu nại khi cửa hàng chuẩn bị đơn chậm hoặc quá giờ mở thưởng',
            3,
            'ORDER'
        ),
        (
            'Không nhận được vé',
            'ORDER_PICKUP_ISSUE',
            'Khiếu nại khi khách không thể nhận vé khi đơn đang chờ nhận',
            4,
            'ORDER'
        ),
        (
            'Chất lượng dịch vụ',
            'ORDER_SERVICE_QUALITY',
            'Khiếu nại về thái độ nhân viên hoặc chất lượng phục vụ sau khi đơn hoàn thành',
            6,
            'ORDER'
        )
) AS seed(name, code, description, priority, required_ref_type)
JOIN ticket_categories parent ON parent.code = 'GROUP_ORDER'
ON CONFLICT (code) DO UPDATE SET
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    priority = EXCLUDED.priority,
    required_ref_type = EXCLUDED.required_ref_type,
    parent_id = EXCLUDED.parent_id,
    updated_at = NOW(),
    last_modified_by = 'SYSTEM';
