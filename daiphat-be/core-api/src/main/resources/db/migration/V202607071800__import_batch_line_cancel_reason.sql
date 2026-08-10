-- Backfill incomplete lines on already-cancelled batches with station-specific reasons.
UPDATE import_batch_lines l
SET
    status = 'CANCELLED',
    cancel_reason = CASE
        WHEN b.cancel_reason LIKE '%Draw Date%'
            THEN COALESCE(s.name, 'Lottery Station')
                || ' import has been cancelled because the Draw Date has expired before ticket import was completed.'
        ELSE COALESCE(s.name, 'Lottery Station')
            || ' import has been cancelled because the same-day import deadline has passed.'
    END,
    updated_at = CURRENT_TIMESTAMP
FROM import_batches b,
     lottery_stations s
WHERE l.import_batch_id = b.id
  AND s.id = l.lottery_station_id
  AND b.status = 'CANCELLED'
  AND b.deleted_at IS NULL
  AND l.deleted_at IS NULL
  AND l.status IN ('OPEN', 'IMPORTING')
  AND l.cancel_reason IS NULL;
