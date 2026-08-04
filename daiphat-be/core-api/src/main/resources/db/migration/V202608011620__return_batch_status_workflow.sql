-- Migrate ReturnBatch header statuses to the new inspection / handover workflow.
UPDATE return_batches
SET status = 'PENDING_INSPECTION'
WHERE status = 'PENDING';

UPDATE return_batches
SET status = 'PENDING_HANDOVER'
WHERE status = 'RETURNED';

UPDATE return_batches
SET status = 'HANDED_OVER'
WHERE status = 'CONFIRMED';

ALTER TABLE return_batches
    ALTER COLUMN status SET DEFAULT 'PENDING_INSPECTION';
