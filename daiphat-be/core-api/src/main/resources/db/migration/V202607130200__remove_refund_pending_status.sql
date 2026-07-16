-- Remove PENDING (and obsolete APPROVED) from refund workflow: both become READY_TO_PAY.
UPDATE refund_requests
SET status = 'READY_TO_PAY',
    updated_at = NOW()
WHERE status IN ('PENDING', 'APPROVED');

-- Remove obsolete refund:approve permission.
DELETE FROM role_permissions
WHERE permission_id IN (SELECT id FROM permissions WHERE code = 'refund:approve');

DELETE FROM permissions
WHERE code = 'refund:approve';
