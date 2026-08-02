-- Online prize-payout reject retry lock (mirrors refund bank-info retry).
ALTER TABLE prize_payout_requests
    ADD COLUMN IF NOT EXISTS reject_count INTEGER NOT NULL DEFAULT 0;

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
    'MAX_PRIZE_PAYOUT_ONLINE_REJECT',
    '3',
    'PAYOUT_SETTING',
    'INT',
    'Số lần tối đa yêu cầu trả thưởng online bị từ chối trước khi bắt buộc đổi thưởng tại đại lý',
    'Số lần từ chối trả thưởng online tối đa',
    'lần',
    '{"min":1,"max":20}',
    TRUE,
    TRUE,
    NOW(),
    NOW()
WHERE NOT EXISTS (
    SELECT 1 FROM system_config WHERE config_key = 'MAX_PRIZE_PAYOUT_ONLINE_REJECT'
);
