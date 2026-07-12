-- Remap legacy REJECTED refunds, then drop reject_reason (REJECTED status removed from domain).
UPDATE refund_requests
SET status = 'CANCELLED',
    updated_at = NOW()
WHERE status = 'REJECTED';

ALTER TABLE refund_requests
    DROP COLUMN IF EXISTS reject_reason;

-- Remove obsolete refund:reject permission assignments and permission row.
DELETE FROM role_permissions
WHERE permission_id IN (SELECT id FROM permissions WHERE code = 'refund:reject');

DELETE FROM permissions
WHERE code = 'refund:reject';
