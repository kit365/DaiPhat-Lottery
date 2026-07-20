-- Ensure we have a parent category for refund requests if it doesn't exist yet
INSERT INTO ticket_categories (name, code, description, priority, required_ref_type, created_at, updated_at, created_by, last_modified_by)
VALUES
    ('Khiếu nại hoàn tiền', 'GROUP_PAYMENT', 'Nhóm khiếu nại thanh toán và hoàn tiền', 3, NULL, NOW(), NOW(), 'SYSTEM', 'SYSTEM')
ON CONFLICT (code) DO NOTHING;

-- Update parent for order complaint categories
UPDATE ticket_categories 
SET parent_id = (SELECT id FROM ticket_categories WHERE code = 'GROUP_ORDER')
WHERE code IN (
    'ORDER_PREPARATION_DELAY', 
    'ORDER_PICKUP_ISSUE', 
    'ORDER_SERVICE_QUALITY', 
    'ORDER_CANCELLED_OUT_OF_STOCK', 
    'PAYMENT_SYNC_ERROR'
);

-- Update parent for refund complaint categories
UPDATE ticket_categories 
SET parent_id = (SELECT id FROM ticket_categories WHERE code = 'GROUP_PAYMENT')
WHERE code IN (
    'REFUND_PAID_ISSUE', 
    'REFUND_SLOW_PROCESSING'
);
