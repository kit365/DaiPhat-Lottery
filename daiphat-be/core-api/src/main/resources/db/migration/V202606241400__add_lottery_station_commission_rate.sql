ALTER TABLE lottery_stations
    ADD COLUMN IF NOT EXISTS commission_rate NUMERIC(5, 4);
