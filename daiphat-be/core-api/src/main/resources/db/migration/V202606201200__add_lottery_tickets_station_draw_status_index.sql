CREATE INDEX IF NOT EXISTS idx_lottery_tickets_station_draw_status
    ON lottery_tickets(station_id, draw_date, status);
