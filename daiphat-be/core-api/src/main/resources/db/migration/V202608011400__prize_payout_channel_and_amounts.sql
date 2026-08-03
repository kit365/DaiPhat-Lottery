-- Prize payout: channel, tax/commission/net, payment method; bank nullable for cash IN_PERSON.
ALTER TABLE prize_payout_requests
    ADD COLUMN IF NOT EXISTS channel VARCHAR(30),
    ADD COLUMN IF NOT EXISTS tax_amount NUMERIC(15, 2),
    ADD COLUMN IF NOT EXISTS commission_amount NUMERIC(15, 2),
    ADD COLUMN IF NOT EXISTS net_amount NUMERIC(15, 2),
    ADD COLUMN IF NOT EXISTS payment_method VARCHAR(30);

UPDATE prize_payout_requests
SET channel = COALESCE(channel, 'ONLINE'),
    tax_amount = COALESCE(tax_amount, 0),
    commission_amount = COALESCE(commission_amount, 0),
    net_amount = COALESCE(net_amount, gross_amount),
    payment_method = COALESCE(payment_method, 'TRANSFER')
WHERE channel IS NULL
   OR tax_amount IS NULL
   OR commission_amount IS NULL
   OR net_amount IS NULL;

ALTER TABLE prize_payout_requests
    ALTER COLUMN channel SET NOT NULL,
    ALTER COLUMN tax_amount SET NOT NULL,
    ALTER COLUMN commission_amount SET NOT NULL,
    ALTER COLUMN net_amount SET NOT NULL;

ALTER TABLE prize_payout_requests
    ALTER COLUMN bank_account_id DROP NOT NULL;

CREATE INDEX IF NOT EXISTS idx_prize_payout_requests_channel
    ON prize_payout_requests (channel);

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
