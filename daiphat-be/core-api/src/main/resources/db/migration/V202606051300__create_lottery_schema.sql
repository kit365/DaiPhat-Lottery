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
