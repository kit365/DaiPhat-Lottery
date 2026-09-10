-- Legacy supplier_settlements.status used CLOSED before enum rename to COMPLETED.
UPDATE supplier_settlements
SET status = 'COMPLETED',
    updated_at = CURRENT_TIMESTAMP
WHERE status = 'CLOSED';
