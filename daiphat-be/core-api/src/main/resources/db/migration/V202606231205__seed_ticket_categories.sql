INSERT INTO ticket_categories (name, code, description, priority, required_ref_type, created_at, updated_at, created_by, last_modified_by)
VALUES
    ('Khiếu nại đơn hàng', 'ORDER_ISSUE', 'Khiếu nại liên quan đến đơn hàng đã đặt', 1, 'ORDER', NOW(), NOW(), 'SYSTEM', 'SYSTEM'),
    ('Lỗi thanh toán', 'PAYMENT_ISSUE', 'Khiếu nại về giao dịch thanh toán', 2, 'PAYMENT_TRANSACTION', NOW(), NOW(), 'SYSTEM', 'SYSTEM'),
    ('Hỗ trợ chung', 'GENERAL', 'Yêu cầu hỗ trợ không gắn đối tượng cụ thể', 2, NULL, NOW(), NOW(), 'SYSTEM', 'SYSTEM')
ON CONFLICT (code) DO UPDATE SET
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    priority = EXCLUDED.priority,
    required_ref_type = EXCLUDED.required_ref_type,
    updated_at = NOW(),
    last_modified_by = 'SYSTEM';
