ALTER TABLE lottery_stations
    ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT FALSE;

UPDATE lottery_stations
SET is_active = TRUE
WHERE status = 'ACTIVE'
  AND name IS NOT NULL
  AND TRIM(name) <> ''
  AND price > 0
  AND commission_rate IS NOT NULL
  AND commission_rate >= 0
  AND commission_rate <= 1
  AND region_id IS NOT NULL
  AND province IS NOT NULL
  AND TRIM(province) <> ''
  AND draw_days IS NOT NULL
  AND draw_days::text <> '[]'
  AND draw_days::text <> 'null'
  AND draw_time IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_lottery_stations_is_active ON lottery_stations(is_active);
