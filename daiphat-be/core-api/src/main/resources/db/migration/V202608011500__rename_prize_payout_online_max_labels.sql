-- Vietnamize display labels for online payout max amount config.
UPDATE system_config
SET config_name = 'Hạn mức trả thưởng online',
    description = 'Giá trị giải tối đa khách được gửi yêu cầu trả thưởng online (VND)',
    updated_at = NOW()
WHERE config_key = 'PRIZE_PAYOUT_ONLINE_MAX_AMOUNT';
