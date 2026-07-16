CREATE TABLE IF NOT EXISTS lottery_regions (
    id                  BIGSERIAL PRIMARY KEY,
    code                VARCHAR(20) NOT NULL UNIQUE,
    name                VARCHAR(100) NOT NULL,
    type                VARCHAR(20) NOT NULL,
    min_number          INTEGER NOT NULL DEFAULT 0,
    max_number          INTEGER NOT NULL,
    station_count       INTEGER NOT NULL DEFAULT 0,

    created_at          TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at          TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by          VARCHAR(100) DEFAULT 'SYSTEM',
    last_modified_by    VARCHAR(100) DEFAULT 'SYSTEM'
);

INSERT INTO lottery_regions (code, name, type, min_number, max_number, station_count)
VALUES
    ('MIEN_NAM', 'Miền Nam', 'TRADITIONAL', 0, 999999, 0),
    ('MIEN_TRUNG', 'Miền Trung', 'TRADITIONAL', 0, 999999, 0),
    ('MIEN_BAC', 'Miền Bắc', 'TRADITIONAL', 0, 99999, 0)
ON CONFLICT (code) DO NOTHING;

-- lottery_stations
CREATE TABLE IF NOT EXISTS lottery_stations (
    id                  BIGSERIAL PRIMARY KEY,
    name                VARCHAR(100) NOT NULL,
    province            VARCHAR(100),
    region_id           BIGINT NOT NULL,

    -- Giá & Tồn kho
    price               NUMERIC(15, 0) NOT NULL,
    inventory_count     INTEGER NOT NULL DEFAULT 0,
    commission_rate     NUMERIC(5, 4),
    is_active           BOOLEAN NOT NULL DEFAULT FALSE,

    -- Lịch quay
    draw_days           JSONB,
    draw_time           TIME,
    next_draw_date      DATE,

    -- Trạng thái & Duyệt
    status              VARCHAR(20) NOT NULL DEFAULT 'ACTIVE',
    approved_by         UUID,
    approved_at         TIMESTAMP,

    -- Hiển thị
    image               VARCHAR(500),
    thumbnail_url       VARCHAR(500),
    thumbnail_public_id VARCHAR(255),
    description         TEXT,

    -- Audit
    created_at          TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at          TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by          VARCHAR(100) DEFAULT 'SYSTEM',
    last_modified_by    VARCHAR(100) DEFAULT 'SYSTEM',
    deleted_at          TIMESTAMP,

    CONSTRAINT fk_lottery_stations_approved_by
        FOREIGN KEY (approved_by) REFERENCES users(id) ON DELETE SET NULL,
    CONSTRAINT fk_lottery_stations_region_id
        FOREIGN KEY (region_id) REFERENCES lottery_regions(id)
);

CREATE INDEX IF NOT EXISTS idx_lottery_stations_status ON lottery_stations(status);
CREATE INDEX IF NOT EXISTS idx_lottery_stations_region_id ON lottery_stations(region_id);
CREATE INDEX IF NOT EXISTS idx_lottery_stations_is_active ON lottery_stations(is_active);

-- prize_structures
CREATE TABLE IF NOT EXISTS prize_structures (
    id                      BIGSERIAL PRIMARY KEY,
    region_id               BIGINT NOT NULL,
    prize_level             VARCHAR(50) NOT NULL,
    prize_display_name      VARCHAR(100),
    prize_code              VARCHAR(20) NOT NULL,
    description             TEXT,
    prize_value             NUMERIC(15, 0) NOT NULL,
    quantity                INTEGER NOT NULL,
    match_digits            INTEGER,
    match_from              VARCHAR(50) NOT NULL,
    match_from_display_name VARCHAR(100),
    display_order           INTEGER NOT NULL DEFAULT 0,
    is_active               BOOLEAN NOT NULL DEFAULT TRUE,

    -- Audit
    created_at              TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at              TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by              VARCHAR(100) DEFAULT 'SYSTEM',
    last_modified_by        VARCHAR(100) DEFAULT 'SYSTEM',
    deleted_at              TIMESTAMP,

    CONSTRAINT fk_prize_structures_region_id
        FOREIGN KEY (region_id) REFERENCES lottery_regions(id),
    CONSTRAINT uk_prize_structures_region_code UNIQUE (region_id, prize_code)
);

CREATE INDEX IF NOT EXISTS idx_prize_structures_region_id ON prize_structures(region_id);

-- lottery_suppliers
CREATE TABLE IF NOT EXISTS lottery_suppliers (
    id                    BIGSERIAL PRIMARY KEY,
    name                  VARCHAR(200) NOT NULL,
    code                  VARCHAR(50) NOT NULL,
    type                  VARCHAR(30) NOT NULL,
    contact_name          VARCHAR(150),
    contact_phone         VARCHAR(30) NOT NULL,
    contact_email         VARCHAR(150),
    address               VARCHAR(500),
    tax_code              VARCHAR(50),
    payment_term_days     INTEGER,
    default_import_cost   NUMERIC(15, 0),
    is_active             BOOLEAN NOT NULL DEFAULT FALSE,
    created_at            TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at            TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by            VARCHAR(100) DEFAULT 'SYSTEM',
    last_modified_by      VARCHAR(100) DEFAULT 'SYSTEM',
    deleted_at            TIMESTAMP,
    CONSTRAINT uq_lottery_suppliers_code UNIQUE (code)
);

CREATE INDEX IF NOT EXISTS idx_lottery_suppliers_name ON lottery_suppliers (LOWER(name));
CREATE INDEX IF NOT EXISTS idx_lottery_suppliers_contact_phone ON lottery_suppliers (contact_phone);
CREATE INDEX IF NOT EXISTS idx_lottery_suppliers_is_active
    ON lottery_suppliers (is_active) WHERE deleted_at IS NULL;

CREATE SEQUENCE IF NOT EXISTS import_batch_header_code_seq START WITH 1 INCREMENT BY 1;

-- import_batches
CREATE TABLE IF NOT EXISTS import_batches (
    id                          BIGSERIAL PRIMARY KEY,
    batch_code                  VARCHAR(50) NOT NULL,
    draw_date                   DATE NOT NULL,
    supplier_id                 BIGINT,
    supplier_settlement_id      BIGINT,
    import_mode                 VARCHAR(30),
    invoice_evidence_url        VARCHAR(500),
    imported_by                 UUID NOT NULL,
    imported_at                 TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    status                      VARCHAR(30) NOT NULL DEFAULT 'DRAFT',
    line_count                  INTEGER NOT NULL DEFAULT 0,
    total_declare_quantity      INTEGER NOT NULL DEFAULT 0,
    total_declared_cost_value   NUMERIC(15, 0) NOT NULL DEFAULT 0,
    total_imported_quantity     INTEGER NOT NULL DEFAULT 0,
    total_imported_cost_value   NUMERIC(15, 0) NOT NULL DEFAULT 0,
    submitted_at                TIMESTAMP,
    completed_at                TIMESTAMP,
    ledger_at                   TIMESTAMP,
    note                        TEXT,
    cancel_reason               TEXT,
    created_at                  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at                  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by                  VARCHAR(100) DEFAULT 'SYSTEM',
    last_modified_by            VARCHAR(100) DEFAULT 'SYSTEM',
    deleted_at                  TIMESTAMP,
    CONSTRAINT uq_import_batches_batch_code UNIQUE (batch_code),
    CONSTRAINT fk_import_batches_supplier_id
        FOREIGN KEY (supplier_id) REFERENCES lottery_suppliers(id),
    CONSTRAINT fk_import_batches_imported_by
        FOREIGN KEY (imported_by) REFERENCES users(id)
);

CREATE INDEX IF NOT EXISTS idx_import_batches_status ON import_batches(status);
CREATE INDEX IF NOT EXISTS idx_import_batches_imported_by_status
    ON import_batches(imported_by, status) WHERE status = 'DRAFT';
CREATE INDEX IF NOT EXISTS idx_import_batches_supplier_id ON import_batches(supplier_id);
CREATE INDEX IF NOT EXISTS idx_import_batches_supplier_settlement_id
    ON import_batches(supplier_settlement_id);
CREATE INDEX IF NOT EXISTS idx_import_batches_batch_code ON import_batches(batch_code);

CREATE SEQUENCE IF NOT EXISTS import_batch_code_seq START WITH 1 INCREMENT BY 1;

-- import_batch_lines
CREATE TABLE IF NOT EXISTS import_batch_lines (
    id                    BIGSERIAL PRIMARY KEY,
    import_batch_id       BIGINT NOT NULL,
    lottery_station_id    BIGINT NOT NULL,
    batch_type            VARCHAR(30) NOT NULL,
    batch_code            VARCHAR(100) NOT NULL,
    declare_quantity      INTEGER NOT NULL,
    declared_cost_value   NUMERIC(15, 0) NOT NULL DEFAULT 0,
    total_quantity        INTEGER NOT NULL DEFAULT 0,
    import_cost           NUMERIC(15, 0) NOT NULL,
    total_cost_value      NUMERIC(15, 0) NOT NULL DEFAULT 0,
    status                VARCHAR(30) NOT NULL DEFAULT 'OPEN',
    imported_at           TIMESTAMP,
    cancel_reason         TEXT,
    created_at            TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at            TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by            VARCHAR(100) DEFAULT 'SYSTEM',
    last_modified_by      VARCHAR(100) DEFAULT 'SYSTEM',
    deleted_at            TIMESTAMP,
    CONSTRAINT uq_import_batch_lines_batch_code UNIQUE (batch_code),
    CONSTRAINT fk_import_batch_lines_import_batch_id
        FOREIGN KEY (import_batch_id) REFERENCES import_batches(id),
    CONSTRAINT fk_import_batch_lines_lottery_station_id
        FOREIGN KEY (lottery_station_id) REFERENCES lottery_stations(id)
);

CREATE INDEX IF NOT EXISTS idx_import_batch_lines_import_batch_id
    ON import_batch_lines(import_batch_id);
CREATE INDEX IF NOT EXISTS idx_import_batch_lines_station_batch_type
    ON import_batch_lines(lottery_station_id, batch_type);
CREATE INDEX IF NOT EXISTS idx_import_batch_lines_batch_code ON import_batch_lines(batch_code);
CREATE UNIQUE INDEX IF NOT EXISTS uq_import_batch_lines_batch_station_active
    ON import_batch_lines(import_batch_id, lottery_station_id) WHERE deleted_at IS NULL;

-- lottery_tickets
CREATE TABLE IF NOT EXISTS lottery_tickets (
    id                  BIGSERIAL PRIMARY KEY,
    station_id          BIGINT NOT NULL,
    ticket_img          VARCHAR(500),
    numbers             VARCHAR(100) NOT NULL,
    draw_date           DATE NOT NULL,
    quantity            INTEGER NOT NULL DEFAULT 1,
    price_snapshot      NUMERIC(15, 0) NOT NULL,
    status              VARCHAR(50) NOT NULL DEFAULT 'IN_STOCK',
    is_active           BOOLEAN NOT NULL DEFAULT TRUE,

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
CREATE INDEX IF NOT EXISTS idx_lottery_tickets_is_active  ON lottery_tickets(is_active);

-- lottery_ticket_serials
CREATE TABLE IF NOT EXISTS lottery_ticket_serials (
    id                      BIGSERIAL PRIMARY KEY,
    ticket_id               BIGINT NOT NULL,
    import_batch_id         BIGINT,
    import_batch_line_id    BIGINT,
    ticket_img              VARCHAR(500),
    serial_number           VARCHAR(100) NOT NULL,
    status                  VARCHAR(50) NOT NULL DEFAULT 'IN_STOCK',
    input_source            VARCHAR(20) NOT NULL DEFAULT 'MANUAL',
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
    CONSTRAINT fk_lottery_ticket_serials_import_batch_id
        FOREIGN KEY (import_batch_id) REFERENCES import_batches(id),
    CONSTRAINT fk_lottery_ticket_serials_import_batch_line_id
        FOREIGN KEY (import_batch_line_id) REFERENCES import_batch_lines(id),
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
CREATE INDEX IF NOT EXISTS idx_lottery_ticket_serials_input_source ON lottery_ticket_serials(input_source);
CREATE INDEX IF NOT EXISTS idx_lottery_ticket_serials_import_batch_id ON lottery_ticket_serials(import_batch_id);
CREATE INDEX IF NOT EXISTS idx_lottery_ticket_serials_import_batch_line_id ON lottery_ticket_serials(import_batch_line_id);
