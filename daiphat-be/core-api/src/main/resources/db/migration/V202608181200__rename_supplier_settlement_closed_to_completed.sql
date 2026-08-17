-- Supplier settlement "CLOSED" (đã chốt) is replaced by COMPLETED (đã thanh toán).
UPDATE supplier_settlements
SET status = 'COMPLETED'
WHERE status = 'CLOSED';
