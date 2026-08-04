-- Denormalize station + draw_date onto serials for physical ticket uniqueness (issuer + draw + serial)
ALTER TABLE lottery_ticket_serials
    ADD COLUMN IF NOT EXISTS station_id BIGINT,
    ADD COLUMN IF NOT EXISTS draw_date DATE;

UPDATE lottery_ticket_serials s
SET station_id = t.station_id,
    draw_date = t.draw_date
FROM lottery_tickets t
WHERE s.ticket_id = t.id
  AND (s.station_id IS NULL OR s.draw_date IS NULL);

-- Fail loudly if live rows still missing denormalized keys
DO $$
BEGIN
    IF EXISTS (
        SELECT 1
        FROM lottery_ticket_serials
        WHERE deleted_at IS NULL
          AND (station_id IS NULL OR draw_date IS NULL OR serial_number IS NULL OR btrim(serial_number) = '')
    ) THEN
        RAISE EXCEPTION 'Cannot create uk_lts_station_draw_serial: live serials missing station_id/draw_date/serial_number';
    END IF;
END $$;

-- Drop soft-deleted duplicates keeping the lowest id, then live duplicates if any
DELETE FROM lottery_ticket_serials a
USING lottery_ticket_serials b
WHERE a.deleted_at IS NOT NULL
  AND b.deleted_at IS NOT NULL
  AND a.station_id = b.station_id
  AND a.draw_date = b.draw_date
  AND lower(a.serial_number) = lower(b.serial_number)
  AND a.id > b.id;

DO $$
BEGIN
    IF EXISTS (
        SELECT station_id, draw_date, lower(serial_number)
        FROM lottery_ticket_serials
        WHERE deleted_at IS NULL
        GROUP BY station_id, draw_date, lower(serial_number)
        HAVING COUNT(*) > 1
    ) THEN
        RAISE EXCEPTION 'Cannot create uk_lts_station_draw_serial: duplicate live (station_id, draw_date, serial_number) rows exist';
    END IF;
END $$;

ALTER TABLE lottery_ticket_serials
    ALTER COLUMN station_id SET NOT NULL,
    ALTER COLUMN draw_date SET NOT NULL;

ALTER TABLE lottery_ticket_serials
    DROP CONSTRAINT IF EXISTS fk_lts_station_denorm;

ALTER TABLE lottery_ticket_serials
    ADD CONSTRAINT fk_lts_station_denorm
        FOREIGN KEY (station_id) REFERENCES lottery_stations (id);

CREATE UNIQUE INDEX IF NOT EXISTS uk_lts_station_draw_serial
    ON lottery_ticket_serials (station_id, draw_date, serial_number)
    WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_lts_station_draw
    ON lottery_ticket_serials (station_id, draw_date)
    WHERE deleted_at IS NULL;
