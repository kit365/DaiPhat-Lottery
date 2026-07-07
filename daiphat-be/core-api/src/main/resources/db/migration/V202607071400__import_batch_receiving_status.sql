-- Backfill partial import batches to RECEIVING status.
UPDATE import_batches
SET status = 'RECEIVING',
    updated_at = CURRENT_TIMESTAMP
WHERE status = 'DRAFT'
  AND total_imported_quantity > 0
  AND total_imported_quantity < total_declare_quantity;
