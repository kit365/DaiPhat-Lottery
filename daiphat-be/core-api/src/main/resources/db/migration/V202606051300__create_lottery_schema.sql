-- lottery_stations
CREATE TABLE IF NOT EXISTS lottery_stations (
    id                  BIGSERIAL PRIMARY KEY,
    name                VARCHAR(100) NOT NULL,
    province            VARCHAR(100),
    region              VARCHAR(20),
    type                VARCHAR(20) NOT NULL,

    -- Quy tắc số
    number_length       INTEGER,
    min_number          INTEGER,
    max_number          INTEGER,

    -- Giá & Tồn kho
    price               NUMERIC(15, 0) NOT NULL,
    inventory_count     INTEGER NOT NULL DEFAULT 0,

    -- Lịch quay
    draw_schedule       VARCHAR(100),
    draw_time           VARCHAR(10),
    next_draw_date      DATE,

    -- Trạng thái & Duyệt
    status              VARCHAR(20) NOT NULL DEFAULT 'DRAFT',
    approved_by         UUID,
    approved_at         TIMESTAMP,

    -- Hiển thị
    image               VARCHAR(500),
    thumbnail_url       VARCHAR(500),
    thumbnail_public_id VARCHAR(255),
    description         TEXT,
    display_order       INTEGER NOT NULL DEFAULT 0,

    -- Audit
    created_at          TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at          TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by          VARCHAR(100) DEFAULT 'SYSTEM',
    last_modified_by    VARCHAR(100) DEFAULT 'SYSTEM',
    deleted_at          TIMESTAMP,

    CONSTRAINT fk_lottery_stations_approved_by
        FOREIGN KEY (approved_by) REFERENCES users(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_lottery_stations_status ON lottery_stations(status);
CREATE INDEX IF NOT EXISTS idx_lottery_stations_type   ON lottery_stations(type);

-- prize_structures
CREATE TABLE IF NOT EXISTS prize_structures (
    id                      BIGSERIAL PRIMARY KEY,
    station_id              BIGINT NOT NULL,
    region                  VARCHAR(20),
    is_only                 BOOLEAN NOT NULL DEFAULT FALSE,
    prize_level             VARCHAR(50) NOT NULL,
    prize_display_name      VARCHAR(100),
    prize_code              VARCHAR(20) NOT NULL,
    prize_value             NUMERIC(15, 0) NOT NULL,
    quantity                INTEGER NOT NULL,
    match_digits            INTEGER,
    match_from              VARCHAR(20) NOT NULL,
    match_from_display_name VARCHAR(100),
    display_order           INTEGER NOT NULL DEFAULT 0,

    -- Audit
    created_at              TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at              TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by              VARCHAR(100) DEFAULT 'SYSTEM',
    last_modified_by        VARCHAR(100) DEFAULT 'SYSTEM',
    deleted_at              TIMESTAMP,

    CONSTRAINT fk_prize_structures_station_id
        FOREIGN KEY (station_id) REFERENCES lottery_stations(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_prize_structures_station_id ON prize_structures(station_id);
CREATE INDEX IF NOT EXISTS idx_prize_structures_region      ON prize_structures(region);

-- prize_structure_templates: mẫu cấu trúc giải theo miền (seed source khi tạo đài)
CREATE TABLE IF NOT EXISTS prize_structure_templates (
    id                      BIGSERIAL PRIMARY KEY,
    region                  VARCHAR(20) NOT NULL,
    is_only                 BOOLEAN NOT NULL DEFAULT FALSE,
    prize_level             VARCHAR(50) NOT NULL,
    prize_display_name      VARCHAR(100),
    prize_code              VARCHAR(20) NOT NULL,
    prize_value             NUMERIC(15, 0) NOT NULL DEFAULT 0,
    quantity                INTEGER NOT NULL,
    match_digits            INTEGER,
    match_from              VARCHAR(20) NOT NULL,
    match_from_display_name VARCHAR(100),
    display_order           INTEGER NOT NULL DEFAULT 0,

    created_at              TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at              TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by              VARCHAR(100) DEFAULT 'SYSTEM',
    last_modified_by        VARCHAR(100) DEFAULT 'SYSTEM',
    deleted_at              TIMESTAMP,
    is_active               BOOLEAN NOT NULL DEFAULT TRUE,

    CONSTRAINT uk_prize_structure_templates_region_code UNIQUE (region, prize_code)
);

CREATE INDEX IF NOT EXISTS idx_prize_structure_templates_region
    ON prize_structure_templates(region);

INSERT INTO prize_structure_templates
    (region, prize_level, prize_code, prize_value, quantity, match_digits, match_from, display_order)
VALUES
    ('MIEN_NAM', 'SPECIAL',     'DB',     0, 1, 6,    'LAST',  0),
    ('MIEN_NAM', 'FIRST',       'G1',     0, 1, 5,    'LAST',  1),
    ('MIEN_NAM', 'SECOND',      'G2',     0, 1, 5,    'LAST',  2),
    ('MIEN_NAM', 'THIRD',       'G3',     0, 2, 5,    'LAST',  3),
    ('MIEN_NAM', 'FOURTH',      'G4',     0, 7, 5,    'LAST',  4),
    ('MIEN_NAM', 'FIFTH',       'G5',     0, 1, 4,    'LAST',  5),
    ('MIEN_NAM', 'SIXTH',       'G6',     0, 3, 4,    'LAST',  6),
    ('MIEN_NAM', 'SEVENTH',     'G7',     0, 1, 3,    'LAST',  7),
    ('MIEN_NAM', 'EIGHTH',      'G8',     0, 1, 2,    'LAST',  8),
    ('MIEN_NAM', 'SUB_SPECIAL', 'DB_PHU', 0, 1, NULL, 'EXACT', 9),
    ('MIEN_NAM', 'CONSOLATION', 'KK',     0, 3, 5,    'LAST',  10)
ON CONFLICT (region, prize_code) DO NOTHING;

INSERT INTO prize_structure_templates
    (region, prize_level, prize_code, prize_value, quantity, match_digits, match_from, display_order)
VALUES
    ('MIEN_BAC', 'SPECIAL',     'DB',     0, 1, 5,    'LAST',  0),
    ('MIEN_BAC', 'FIRST',       'G1',     0, 1, 5,    'LAST',  1),
    ('MIEN_BAC', 'SECOND',      'G2',     0, 2, 5,    'LAST',  2),
    ('MIEN_BAC', 'THIRD',       'G3',     0, 6, 5,    'LAST',  3),
    ('MIEN_BAC', 'FOURTH',      'G4',     0, 4, 4,    'LAST',  4),
    ('MIEN_BAC', 'FIFTH',       'G5',     0, 6, 4,    'LAST',  5),
    ('MIEN_BAC', 'SIXTH',       'G6',     0, 3, 3,    'LAST',  6),
    ('MIEN_BAC', 'SEVENTH',     'G7',     0, 4, 2,    'LAST',  7)
ON CONFLICT (region, prize_code) DO NOTHING;

INSERT INTO prize_structure_templates
    (region, prize_level, prize_code, prize_value, quantity, match_digits, match_from, display_order)
VALUES
    ('MIEN_TRUNG', 'SPECIAL',     'DB',     0, 1, 6,    'LAST',  0),
    ('MIEN_TRUNG', 'FIRST',       'G1',     0, 1, 5,    'LAST',  1),
    ('MIEN_TRUNG', 'SECOND',      'G2',     0, 1, 5,    'LAST',  2),
    ('MIEN_TRUNG', 'THIRD',       'G3',     0, 2, 5,    'LAST',  3),
    ('MIEN_TRUNG', 'FOURTH',      'G4',     0, 7, 5,    'LAST',  4),
    ('MIEN_TRUNG', 'FIFTH',       'G5',     0, 1, 4,    'LAST',  5),
    ('MIEN_TRUNG', 'SIXTH',       'G6',     0, 3, 4,    'LAST',  6),
    ('MIEN_TRUNG', 'SEVENTH',     'G7',     0, 1, 3,    'LAST',  7),
    ('MIEN_TRUNG', 'EIGHTH',      'G8',     0, 1, 2,    'LAST',  8),
    ('MIEN_TRUNG', 'SUB_SPECIAL', 'DB_PHU', 0, 1, NULL, 'EXACT', 9),
    ('MIEN_TRUNG', 'CONSOLATION', 'KK',     0, 3, 5,    'LAST',  10)
ON CONFLICT (region, prize_code) DO NOTHING;

-- lottery_tickets
CREATE TABLE IF NOT EXISTS lottery_tickets (
    id                  BIGSERIAL PRIMARY KEY,
    station_id          BIGINT NOT NULL,
    ticket_img          VARCHAR(500),
    numbers             VARCHAR(100) NOT NULL,
    draw_date           DATE NOT NULL,
    batch_code          VARCHAR(100) NOT NULL,
    quantity            INTEGER NOT NULL DEFAULT 1,
    price_snapshot      NUMERIC(15, 0) NOT NULL,
    status              VARCHAR(50) NOT NULL DEFAULT 'IN_STOCK',

    -- Audit
    created_at          TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at          TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by          VARCHAR(100) DEFAULT 'SYSTEM',
    last_modified_by    VARCHAR(100) DEFAULT 'SYSTEM',
    deleted_at          TIMESTAMP,

    CONSTRAINT fk_lottery_tickets_station_id
        FOREIGN KEY (station_id) REFERENCES lottery_stations(id) ON DELETE CASCADE,
    CONSTRAINT uk_lottery_ticket_station_numbers_draw_date
        UNIQUE (station_id, numbers, draw_date)
);

CREATE INDEX IF NOT EXISTS idx_lottery_tickets_station_id ON lottery_tickets(station_id);
CREATE INDEX IF NOT EXISTS idx_lottery_tickets_status     ON lottery_tickets(status);
CREATE INDEX IF NOT EXISTS idx_lottery_tickets_numbers    ON lottery_tickets(numbers);
CREATE INDEX IF NOT EXISTS idx_lottery_tickets_draw_date  ON lottery_tickets(draw_date);
CREATE INDEX IF NOT EXISTS idx_lottery_tickets_batch_code ON lottery_tickets(batch_code);

-- lottery_ticket_serials
CREATE TABLE IF NOT EXISTS lottery_ticket_serials (
    id                      BIGSERIAL PRIMARY KEY,
    ticket_id               BIGINT NOT NULL,
    ticket_img              VARCHAR(500),
    serial_number           VARCHAR(100) NOT NULL,
    status                  VARCHAR(50) NOT NULL DEFAULT 'IN_STOCK',
    reserved_at             TIMESTAMP,
    reservation_expires_at  TIMESTAMP,
    reserved_by_order_id    UUID,
    imported_by             UUID NOT NULL,
    imported_at             TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    is_verified             BOOLEAN NOT NULL DEFAULT FALSE,
    verified_by             UUID,
    verified_at             TIMESTAMP,
    returned_at             TIMESTAMP,
    damaged_evidence_url    VARCHAR(500),
    damaged_reason          VARCHAR(500),

    -- Audit
    created_at              TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at              TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by              VARCHAR(100) DEFAULT 'SYSTEM',
    last_modified_by        VARCHAR(100) DEFAULT 'SYSTEM',
    deleted_at              TIMESTAMP,

    CONSTRAINT fk_lottery_ticket_serials_ticket_id
        FOREIGN KEY (ticket_id) REFERENCES lottery_tickets(id) ON DELETE CASCADE,
    CONSTRAINT fk_lottery_ticket_serials_imported_by
        FOREIGN KEY (imported_by) REFERENCES users(id) ON DELETE RESTRICT,
    CONSTRAINT fk_lottery_ticket_serials_verified_by
        FOREIGN KEY (verified_by) REFERENCES users(id) ON DELETE SET NULL,
    CONSTRAINT uk_lottery_ticket_serials_ticket_serial
        UNIQUE (ticket_id, serial_number)
);

CREATE INDEX IF NOT EXISTS idx_lottery_ticket_serials_ticket_id ON lottery_ticket_serials(ticket_id);
CREATE INDEX IF NOT EXISTS idx_lottery_ticket_serials_status ON lottery_ticket_serials(status);
CREATE INDEX IF NOT EXISTS idx_lottery_ticket_serials_serial_number ON lottery_ticket_serials(serial_number);
CREATE INDEX IF NOT EXISTS idx_lottery_ticket_serials_reservation_expires_at ON lottery_ticket_serials(reservation_expires_at);
CREATE INDEX IF NOT EXISTS idx_lottery_ticket_serials_reserved_by_order_id ON lottery_ticket_serials(reserved_by_order_id);
