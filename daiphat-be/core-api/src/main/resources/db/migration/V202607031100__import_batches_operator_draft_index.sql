CREATE INDEX IF NOT EXISTS idx_import_batches_imported_by_status
    ON import_batches(imported_by, status)
    WHERE status = 'DRAFT';
