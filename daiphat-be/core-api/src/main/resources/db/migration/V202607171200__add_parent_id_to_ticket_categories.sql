-- Seed parent categories
INSERT INTO ticket_categories (name, code, description, priority, required_ref_type, created_at, updated_at, created_by, last_modified_by)
VALUES
    ('Đơn hàng', 'GROUP_ORDER', 'Nhóm khiếu nại liên quan đến đơn hàng', 1, NULL, NOW(), NOW(), 'SYSTEM', 'SYSTEM'),
    ('Thanh toán & Hoàn tiền', 'GROUP_PAYMENT', 'Nhóm khiếu nại thanh toán và hoàn tiền', 1, NULL, NOW(), NOW(), 'SYSTEM', 'SYSTEM'),
    ('Hỗ trợ chung', 'GROUP_GENERAL', 'Nhóm các yêu cầu hỗ trợ khác', 2, NULL, NOW(), NOW(), 'SYSTEM', 'SYSTEM')
ON CONFLICT (code) DO NOTHING;

-- Update existing categories to use parent_id
UPDATE ticket_categories SET parent_id = (SELECT id FROM ticket_categories WHERE code = 'GROUP_ORDER') WHERE code IN ('ORDER_ISSUE');
UPDATE ticket_categories SET parent_id = (SELECT id FROM ticket_categories WHERE code = 'GROUP_PAYMENT') WHERE code IN ('PAYMENT_ISSUE', 'REFUND_SLOW_PROCESSING', 'REFUND_PAID_ISSUE');
UPDATE ticket_categories SET parent_id = (SELECT id FROM ticket_categories WHERE code = 'GROUP_GENERAL') WHERE code IN ('GENERAL');
