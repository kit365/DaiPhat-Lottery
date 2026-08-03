-- Prize payout complaint categories (mirror refund complaint pattern)
INSERT INTO ticket_categories (name, code, description, priority, required_ref_type, created_at, updated_at, created_by, last_modified_by)
VALUES
    (
        'Khiếu nại trả thưởng',
        'GROUP_PRIZE_PAYOUT',
        'Nhóm khiếu nại liên quan đến trả thưởng / nhận thưởng',
        3,
        NULL,
        NOW(),
        NOW(),
        'SYSTEM',
        'SYSTEM'
    )
ON CONFLICT (code) DO NOTHING;

INSERT INTO ticket_categories (name, code, description, priority, required_ref_type, created_at, updated_at, created_by, last_modified_by)
VALUES
    (
        'Nhân viên xử lý trả thưởng quá lâu',
        'PRIZE_PAYOUT_SLOW_PROCESSING',
        'Khiếu nại khi yêu cầu trả thưởng bị treo quá thời gian cam kết xử lý',
        1,
        'PRIZE_CLAIM',
        NOW(),
        NOW(),
        'SYSTEM',
        'SYSTEM'
    ),
    (
        'Khiếu nại trả thưởng đã chuyển',
        'PRIZE_PAYOUT_PAID_ISSUE',
        'Khiếu nại về số tiền sai, thiếu chuyển, lỗi chuyển khoản hoặc chưa nhận được tiền sau khi đã hoàn tất trả thưởng',
        1,
        'PRIZE_CLAIM',
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

UPDATE ticket_categories
SET parent_id = (SELECT id FROM ticket_categories WHERE code = 'GROUP_PRIZE_PAYOUT')
WHERE code IN (
    'PRIZE_PAYOUT_PAID_ISSUE',
    'PRIZE_PAYOUT_SLOW_PROCESSING'
);
