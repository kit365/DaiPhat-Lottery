-- Keep at most one open claim (PENDING or APPROVED) per serial
DROP INDEX IF EXISTS uk_prize_payout_serial_pending;

CREATE UNIQUE INDEX uk_prize_payout_serial_open
    ON prize_payout_requests (serial_id)
    WHERE status IN ('PENDING', 'APPROVED');
