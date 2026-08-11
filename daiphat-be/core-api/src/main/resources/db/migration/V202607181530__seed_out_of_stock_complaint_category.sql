INSERT INTO ticket_categories (
    name, code, description, priority, required_ref_type, parent_id,
    created_at, updated_at, created_by, last_modified_by
)
SELECT
    'Đơn bị hủy do hết vé',
    'ORDER_CANCELLED_OUT_OF_STOCK',
    'Khiếu nại khi đơn hàng bị hủy do sự cố kho hết vé và không còn vé thay thế',
    5,
    'ORDER',
    parent.id,
    NOW(),
    NOW(),
    'SYSTEM',
    'SYSTEM'
FROM ticket_categories parent
WHERE parent.code = 'GROUP_ORDER'
ON CONFLICT (code) DO UPDATE SET
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    priority = EXCLUDED.priority,
    required_ref_type = EXCLUDED.required_ref_type,
    parent_id = EXCLUDED.parent_id,
    updated_at = NOW(),
    last_modified_by = 'SYSTEM';
