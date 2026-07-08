UPDATE transactions
SET paid_at = COALESCE(updated_at, created_at)
WHERE status = 'COMPLETED'
  AND paid_at IS NULL;
