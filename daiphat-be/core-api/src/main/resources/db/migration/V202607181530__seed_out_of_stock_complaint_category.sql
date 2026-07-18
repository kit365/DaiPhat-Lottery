INSERT INTO ticket_categories (name, code, description, priority, required_ref_type, created_at, updated_at, created_by, last_modified_by)
VALUES
    (
        'Đơn bị hủy do hết vé',
        'ORDER_CANCELLED_OUT_OF_STOCK',
        'Khiếu nại khi đơn hàng bị hủy do sự cố kho hết vé và không còn vé thay thế',
        1,
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
