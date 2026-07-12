-- Temporary local Cart test data. This file is intentionally outside Flyway.
-- Run manually against the local database, then delete this file and its data when finished.

INSERT INTO lottery_stations (
    name, province, region_id, price, inventory_count, draw_days, draw_time,
    next_draw_date, status, is_active, description, created_by, last_modified_by
)
SELECT
    seed.name, seed.province, region.id, 10000, 30, seed.draw_days::jsonb, seed.draw_time::time,
    CURRENT_DATE, 'ACTIVE', TRUE, 'Nhà đài test Cart', 'CART_TEST', 'CART_TEST'
FROM (
    VALUES
        ('TEST Cart Hồ Chí Minh', 'Hồ Chí Minh', 'MIEN_NAM', '["MONDAY","TUESDAY","WEDNESDAY","THURSDAY","FRIDAY","SATURDAY","SUNDAY"]', '16:15:00'),
        ('TEST Cart Đà Nẵng', 'Đà Nẵng', 'MIEN_TRUNG', '["MONDAY","TUESDAY","WEDNESDAY","THURSDAY","FRIDAY","SATURDAY","SUNDAY"]', '17:15:00'),
        ('TEST Cart Hà Nội', 'Hà Nội', 'MIEN_BAC', '["MONDAY","TUESDAY","WEDNESDAY","THURSDAY","FRIDAY","SATURDAY","SUNDAY"]', '18:15:00')
) AS seed(name, province, region_code, draw_days, draw_time)
JOIN lottery_regions region ON region.code = seed.region_code
WHERE NOT EXISTS (
    SELECT 1 FROM lottery_stations station
    WHERE station.name = seed.name AND station.deleted_at IS NULL
);

WITH actor AS (
    SELECT id FROM users ORDER BY created_at LIMIT 1
), stations AS (
    SELECT id, row_number() OVER (ORDER BY id) AS station_order
    FROM lottery_stations
    WHERE name LIKE 'TEST Cart %' AND deleted_at IS NULL AND is_active = TRUE
), tickets AS (
    INSERT INTO lottery_tickets (
        station_id, numbers, draw_date, quantity, price_snapshot, status, is_active, created_by, last_modified_by
    )
    SELECT
        station.id,
        lpad((station.station_order * 100 + ticket_number)::text, 6, '0'),
        CURRENT_DATE,
        10, 10000, 'IN_STOCK', TRUE, 'CART_TEST', 'CART_TEST'
    FROM stations station
    CROSS JOIN generate_series(1, 3) AS ticket_number
    WHERE NOT EXISTS (
        SELECT 1 FROM lottery_tickets ticket
        WHERE ticket.station_id = station.id
          AND ticket.numbers = lpad((station.station_order * 100 + ticket_number)::text, 6, '0')
          AND ticket.draw_date = CURRENT_DATE
    )
    RETURNING id
)
INSERT INTO lottery_ticket_serials (
    ticket_id, serial_number, status, input_source, imported_by, imported_at, is_verified, created_by, last_modified_by
)
SELECT
    ticket.id,
    'CART-TEST-' || ticket.id || '-' || lpad(serial_number::text, 2, '0'),
    'IN_STOCK', 'MANUAL', actor.id, CURRENT_TIMESTAMP, TRUE, 'CART_TEST', 'CART_TEST'
FROM tickets ticket
CROSS JOIN actor
CROSS JOIN generate_series(1, 10) AS serial_number;
