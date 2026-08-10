-- Fortune cast schema already permits multiple casts and has the lookup index.

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
    'FORTUNE_CAST_COOLDOWN_HOURS',
    '24',
    'FORTUNE_SETTING',
    'INT',
    'Số giờ tối thiểu giữa hai lần gieo quẻ của cùng một người dùng, tính từ thời điểm gieo gần nhất',
    'Khoảng cách giữa các lần gieo quẻ',
    'giờ',
    '{"min":1,"max":168}',
    TRUE,
    TRUE,
    NOW(),
    NOW()
WHERE NOT EXISTS (
    SELECT 1 FROM system_config WHERE config_key = 'FORTUNE_CAST_COOLDOWN_HOURS'
);
