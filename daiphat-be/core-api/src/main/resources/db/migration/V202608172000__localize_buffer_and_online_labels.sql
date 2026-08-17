-- Localize settings labels: no English "Buffer" / "online" in admin UI copy.
UPDATE system_config
SET config_name = 'Số ngày đệm hạn đổi thưởng',
    description = 'Số ngày đệm nội bộ trước hạn nhà đài. Hạn đổi thưởng hiển thị cho khách = hạn nhà đài − số ngày đệm. Phải nhỏ hơn hạn nhà đài.',
    updated_at = CURRENT_TIMESTAMP
WHERE config_key = 'PRIZE_REDEMPTION_BUFFER_DAYS';

UPDATE system_config
SET config_name = 'Hạn mức trả thưởng trực tuyến',
    description = 'Giá trị giải tối đa khách được gửi yêu cầu trả thưởng trực tuyến (VND)',
    updated_at = CURRENT_TIMESTAMP
WHERE config_key = 'PRIZE_PAYOUT_ONLINE_MAX_AMOUNT';

UPDATE system_config
SET config_name = 'Số lần từ chối trả thưởng trực tuyến tối đa',
    description = 'Số lần tối đa yêu cầu trả thưởng trực tuyến bị từ chối trước khi bắt buộc đổi thưởng tại đại lý',
    updated_at = CURRENT_TIMESTAMP
WHERE config_key = 'MAX_PRIZE_PAYOUT_ONLINE_REJECT';
