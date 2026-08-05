-- Switch fortune cooldown from "hours since last cast" to wall-clock slot length in minutes.
UPDATE system_config
SET
    config_value = CASE
        WHEN unit = 'phút' AND config_value ~ '^[0-9]+$' THEN config_value
        WHEN config_value ~ '^[0-9]+$' THEN (LEAST(168, GREATEST(1, config_value::INTEGER)) * 60)::TEXT
        ELSE '1440'
    END,
    config_name = 'Khung giờ mở gieo quẻ',
    description = 'Độ dài mỗi khung giờ mở gieo quẻ theo giờ đồng hồ Việt Nam (căn từ 0h). Ví dụ 60 = mỗi giờ, 360 = mỗi 6 giờ, 1440 = mỗi ngày. Không tính từ lúc khách gieo.',
    unit = 'phút',
    validation_rules = '{"min":1,"max":1440}',
    updated_at = NOW()
WHERE config_key = 'FORTUNE_CAST_COOLDOWN_HOURS';
