-- Allow re-adding a lottery station after its import batch line was soft-deleted.
ALTER TABLE import_batch_lines
    DROP CONSTRAINT IF EXISTS uq_import_batch_lines_batch_station;

DROP INDEX IF EXISTS uq_import_batch_lines_batch_station_active;

CREATE UNIQUE INDEX uq_import_batch_lines_batch_station_active
    ON import_batch_lines (import_batch_id, lottery_station_id)
    WHERE deleted_at IS NULL;
