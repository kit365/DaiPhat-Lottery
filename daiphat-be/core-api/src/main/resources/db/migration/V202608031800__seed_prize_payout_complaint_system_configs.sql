-- Seed public prize-payout complaint timing configs (used by client 1-click complaint UX).
INSERT INTO system_config (
    config_key,
    config_value,
    config_type,
    data_type,
    description,
    config_name,
    unit,
    validation_rules,
    is_editable,
    is_active,
    created_at,
    updated_at
)
SELECT
    'PRIZE_PAYOUT_COMPLAINT_PROCESSING_WAIT_HOURS',
    '48',
    'COMPLAINT_SETTING',
    'INT',
    'Số giờ tối thiểu yêu cầu trả thưởng phải ở PENDING/APPROVED trước khi khiếu nại xử lý chậm',
    'Thời gian chờ khiếu nại trả thưởng chậm',
    'giờ',
    '{"min":1,"max":168}',
    TRUE,
    TRUE,
    NOW(),
    NOW()
WHERE NOT EXISTS (
    SELECT 1 FROM system_config WHERE config_key = 'PRIZE_PAYOUT_COMPLAINT_PROCESSING_WAIT_HOURS'
);

INSERT INTO system_config (
    config_key,
    config_value,
    config_type,
    data_type,
    description,
    config_name,
    unit,
    validation_rules,
    is_editable,
    is_active,
    created_at,
    updated_at
)
SELECT
    'PRIZE_PAYOUT_COMPLAINT_GRACE_DAYS',
    '15',
    'COMPLAINT_SETTING',
    'INT',
    'Số ngày khiếu nại 1-click còn hiệu lực sau COMPLETED (tính từ completed_at). Hết hạn thì ẩn nút gắn claim; khách vẫn phản ánh qua hỗ trợ chung.',
    'Thời hạn khiếu nại trả thưởng',
    'ngày',
    '{"min":1,"max":30}',
    TRUE,
    TRUE,
    NOW(),
    NOW()
WHERE NOT EXISTS (
    SELECT 1 FROM system_config WHERE config_key = 'PRIZE_PAYOUT_COMPLAINT_GRACE_DAYS'
);
