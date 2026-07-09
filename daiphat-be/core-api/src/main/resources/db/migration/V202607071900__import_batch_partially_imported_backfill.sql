UPDATE import_batches b
SET status = 'PARTIALLY_IMPORTED', updated_at = NOW()
WHERE b.status IN ('DRAFT', 'RECEIVING')
  AND b.deleted_at IS NULL
  AND EXISTS (
    SELECT 1 FROM import_batch_lines l
    WHERE l.import_batch_id = b.id AND l.deleted_at IS NULL AND l.status = 'IMPORTED'
  )
  AND EXISTS (
    SELECT 1 FROM import_batch_lines l
    WHERE l.import_batch_id = b.id AND l.deleted_at IS NULL
      AND l.status NOT IN ('IMPORTED', 'CANCELLED')
  );
