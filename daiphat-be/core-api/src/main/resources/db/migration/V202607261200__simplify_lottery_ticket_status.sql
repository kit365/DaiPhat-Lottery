-- lottery_tickets.status becomes a pure aggregate over the ticket's serials:
-- IMPORTING / IN_STOCK / SOLD_OUT / EXPIRED.
-- The per-unit lifecycle (reserved, sold, proxy held, returned, damaged, lost) already lives on
-- lottery_ticket_serials.status, and a ticket cancelled because of a data-entry mistake is now
-- soft deleted and linked to its replacement through replace_ticket_id instead of a VOIDED status.

-- VOIDED is no longer a status. Cancel those rows by soft delete and park the column on IN_STOCK;
-- every read path already filters on deleted_at IS NULL.
UPDATE lottery_tickets
SET deleted_at = COALESCE(deleted_at, NOW()),
    status     = 'IN_STOCK',
    updated_at = NOW()
WHERE status = 'VOIDED';

-- SOLD at ticket level meant "no unit of this lottery number is available any more".
UPDATE lottery_tickets
SET status     = 'SOLD_OUT',
    updated_at = NOW()
WHERE status = 'SOLD';

-- The remaining legacy values described the state of individual units, which the serials already
-- record. Fold each ticket back onto the aggregate its serials imply.
UPDATE lottery_tickets t
SET status     = CASE
                     WHEN EXISTS (SELECT 1
                                  FROM lottery_ticket_serials s
                                  WHERE s.ticket_id = t.id
                                    AND s.deleted_at IS NULL
                                    AND s.status = 'IN_STOCK') THEN 'IN_STOCK'
                     WHEN EXISTS (SELECT 1
                                  FROM lottery_ticket_serials s
                                  WHERE s.ticket_id = t.id
                                    AND s.deleted_at IS NULL
                                    AND s.status = 'SOLD') THEN 'SOLD_OUT'
                     ELSE 'IN_STOCK'
                 END,
    updated_at = NOW()
WHERE t.status IN ('RESERVED', 'PROXY_HOLDING', 'PENDING_RETURN', 'RETURNED', 'INTERNAL_FAULT', 'ISSUER_FAULT');

-- Digit replacement soft deletes the mistyped lottery number but keeps the row, so the uniqueness
-- rule has to ignore cancelled tickets or re-importing the same number would collide with it.
-- Recreated under the same name so the friendly duplicate message keeps matching.
ALTER TABLE lottery_tickets
    DROP CONSTRAINT IF EXISTS uk_lottery_ticket_station_numbers_draw_date;

-- Dropping the constraint also drops its backing index, but some environments only ever had the
-- bare index, and CREATE ... IF NOT EXISTS below would silently keep the non-partial version.
DROP INDEX IF EXISTS uk_lottery_ticket_station_numbers_draw_date;

CREATE UNIQUE INDEX IF NOT EXISTS uk_lottery_ticket_station_numbers_draw_date
    ON lottery_tickets (station_id, numbers, draw_date)
    WHERE deleted_at IS NULL;

ALTER TABLE lottery_tickets
    DROP CONSTRAINT IF EXISTS chk_lottery_tickets_status;

ALTER TABLE lottery_tickets
    ADD CONSTRAINT chk_lottery_tickets_status
        CHECK (status IN ('IMPORTING', 'IN_STOCK', 'SOLD_OUT', 'EXPIRED'));
