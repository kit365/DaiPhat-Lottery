INSERT INTO ticket_categories (name, code, description, priority, required_ref_type, created_at, updated_at, created_by, last_modified_by)
VALUES
    (
        'Nhân viên xử lý hoàn tiền quá lâu',
        'REFUND_SLOW_PROCESSING',
        'Khiếu nại khi yêu cầu hoàn tiền bị treo quá thời gian cam kết xử lý',
        1,
        'REFUND_REQUEST',
        NOW(),
        NOW(),
        'SYSTEM',
        'SYSTEM'
    ),
    (
        'Khiếu nại hoàn tiền đã chuyển',
        'REFUND_PAID_ISSUE',
        'Khiếu nại về số tiền sai, thiếu hoàn, lỗi chuyển khoản hoặc vấn đề khác sau khi đã chuyển tiền',
        1,
        'REFUND_REQUEST',
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
