-- Dual-deadline prize redemption: station override for official issuer days.
ALTER TABLE lottery_stations
    ADD COLUMN IF NOT EXISTS prize_redemption_official_deadline_days INTEGER;

COMMENT ON COLUMN lottery_stations.prize_redemption_official_deadline_days IS
    'Nullable override of PRIZE_REDEMPTION_OFFICIAL_DEADLINE_DAYS; null = use global SystemConfig.';

INSERT INTO system_config (
    config_key, config_value, config_type, data_type, description, config_name, unit, validation_rules, is_editable, is_active
) VALUES
    ('PRIZE_REDEMPTION_OFFICIAL_DEADLINE_DAYS', '30', 'PAYOUT_SETTING', 'INT',
     'Số ngày hạn lĩnh thưởng với nhà đài kể từ ngày quay (hạn thật). Hạn khách = hạn này trừ số ngày đệm.',
     'Hạn lĩnh nhà đài (ngày)', 'ngày', '{"min":1,"max":365}', TRUE, TRUE),
    ('PRIZE_REDEMPTION_BUFFER_DAYS', '5', 'PAYOUT_SETTING', 'INT',
     'Số ngày đệm nội bộ trước hạn nhà đài. Hạn đổi thưởng hiển thị cho khách = hạn nhà đài − số ngày đệm. Phải nhỏ hơn hạn nhà đài.',
     'Số ngày đệm hạn đổi thưởng', 'ngày', '{"min":0,"max":364}', TRUE, TRUE)
ON CONFLICT (config_key) DO UPDATE SET
    config_type = EXCLUDED.config_type,
    data_type = EXCLUDED.data_type,
    description = EXCLUDED.description,
    config_name = EXCLUDED.config_name,
    unit = EXCLUDED.unit,
    validation_rules = EXCLUDED.validation_rules,
    is_editable = EXCLUDED.is_editable,
    is_active = EXCLUDED.is_active,
    updated_at = CURRENT_TIMESTAMP;
