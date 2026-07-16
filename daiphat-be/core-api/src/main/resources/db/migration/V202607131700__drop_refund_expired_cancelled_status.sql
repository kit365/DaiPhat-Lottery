-- Remove obsolete refund request statuses EXPIRED / CANCELLED.
-- Remap existing rows so the app can load them after enum removal.

UPDATE refund_requests
SET status = 'MANUAL_RESOLUTION'
WHERE status IN ('EXPIRED', 'CANCELLED');
