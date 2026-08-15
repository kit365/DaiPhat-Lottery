-- Align return_batch_lines.status with inspection lifecycle:
-- PENDING / INSPECTING / INSPECTED (drop legacy SUCCESS / REJECTED_BY_SUPPLIER / PULLED_FOR_SALE).

UPDATE return_batch_lines
SET status = 'INSPECTED'
WHERE status = 'SUCCESS';

UPDATE return_batch_lines
SET status = 'PENDING'
WHERE status IN ('REJECTED_BY_SUPPLIER', 'PULLED_FOR_SALE');
