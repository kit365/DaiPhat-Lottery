-- System config for prize payout rules (configurable, not hardcoded).
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
    'PRIZE_PAYOUT_ONLINE_MAX_AMOUNT',
    '10000000',
    'PAYOUT_SETTING',
    'INT',
    'Giá trị giải tối đa được claim online (VND)',
    'Trần claim online',
    'VND',
    '{"min":0}',
    TRUE,
    TRUE,
    NOW(),
    NOW()
WHERE NOT EXISTS (
    SELECT 1 FROM system_config WHERE config_key = 'PRIZE_PAYOUT_ONLINE_MAX_AMOUNT'
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
    'PRIZE_PAYOUT_TAX_THRESHOLD',
    '10000000',
    'PAYOUT_SETTING',
    'INT',
    'Ngưỡng miễn thuế TNCN trên giá trị giải (VND)',
    'Ngưỡng thuế TNCN',
    'VND',
    '{"min":0}',
    TRUE,
    TRUE,
    NOW(),
    NOW()
WHERE NOT EXISTS (
    SELECT 1 FROM system_config WHERE config_key = 'PRIZE_PAYOUT_TAX_THRESHOLD'
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
    'PRIZE_PAYOUT_TAX_RATE',
    '0.10',
    'PAYOUT_SETTING',
    'DECIMAL',
    'Thuế suất TNCN áp dụng phần vượt ngưỡng',
    'Thuế suất TNCN',
    '%',
    '{"min":0,"max":1}',
    TRUE,
    TRUE,
    NOW(),
    NOW()
WHERE NOT EXISTS (
    SELECT 1 FROM system_config WHERE config_key = 'PRIZE_PAYOUT_TAX_RATE'
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
    'PRIZE_PAYOUT_COMMISSION_TIERS',
    '[{"upTo":10000000,"rate":0.01},{"upTo":100000000,"rate":0.007},{"upTo":1000000000,"rate":0.004},{"upTo":null,"rate":0.002}]',
    'PAYOUT_SETTING',
    'JSON',
    'Bậc thang hoa hồng đại lý trên giá trị giải gốc (trước thuế)',
    'Hoa hồng trả thưởng',
    '%',
    '{}',
    TRUE,
    TRUE,
    NOW(),
    NOW()
WHERE NOT EXISTS (
    SELECT 1 FROM system_config WHERE config_key = 'PRIZE_PAYOUT_COMMISSION_TIERS'
);

INSERT INTO system_config (
    config_key, config_value, config_type, data_type, description,
    config_name, unit, validation_rules, is_editable, is_active, created_at, updated_at
)
SELECT
    'MAX_PRIZE_PAYOUT_ONLINE_REJECT', '3', 'PAYOUT_SETTING', 'INT',
    'Số lần tối đa yêu cầu trả thưởng online bị từ chối trước khi bắt buộc đổi thưởng tại đại lý',
    'Số lần từ chối trả thưởng online tối đa', 'lần', '{"min":1,"max":20}',
    TRUE, TRUE, NOW(), NOW()
WHERE NOT EXISTS (
    SELECT 1 FROM system_config WHERE config_key = 'MAX_PRIZE_PAYOUT_ONLINE_REJECT'
);
