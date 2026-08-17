-- Stable business code for a lottery station, e.g. "TG" for Tiền Giang.
--
-- Files exported by the system carry this code, and files imported are matched on
-- it, so a supplier spelling a station name differently no longer has to be
-- resolved by fuzzy name matching.
--
-- Left nullable here: existing rows are backfilled by LotteryStationCodeBackfillInitializer,
-- which reuses the same generator as the API so a code created now and a code
-- backfilled today follow identical rules.
ALTER TABLE lottery_stations
    ADD COLUMN IF NOT EXISTS code VARCHAR(20);

-- Partial index: soft-deleted stations must not hold a code hostage.
CREATE UNIQUE INDEX IF NOT EXISTS uk_lottery_stations_code
    ON lottery_stations (code)
    WHERE deleted_at IS NULL AND code IS NOT NULL;
