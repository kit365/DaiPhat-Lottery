-- ============================================================================
-- LOTTERY MODULE SCHEMA
-- Contains: lottery_products, prize_structures, lottery_tickets
-- ============================================================================

-- lottery_products
CREATE TABLE IF NOT EXISTS lottery_products (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name                VARCHAR(100) NOT NULL,
    province            VARCHAR(100),
    region              VARCHAR(20),
    type                VARCHAR(20) NOT NULL,

    -- Quy tắc số
    number_length       INTEGER,
    min_number          INTEGER,
    max_number          INTEGER,
    digit_count         INTEGER,

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
    thumbnail_url       VARCHAR(500),
    thumbnail_public_id VARCHAR(255),
    description         TEXT,
    display_order       INTEGER NOT NULL DEFAULT 0,

    -- Audit
    created_at          TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at          TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by          VARCHAR(100) DEFAULT 'SYSTEM',
    last_modified_by    VARCHAR(100) DEFAULT 'SYSTEM',

    CONSTRAINT fk_lottery_products_approved_by
        FOREIGN KEY (approved_by) REFERENCES users(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_lottery_products_status ON lottery_products(status);
CREATE INDEX IF NOT EXISTS idx_lottery_products_type   ON lottery_products(type);

-- prize_structures
CREATE TABLE IF NOT EXISTS prize_structures (
    id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id              UUID NOT NULL,
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

    CONSTRAINT fk_prize_structures_product_id
        FOREIGN KEY (product_id) REFERENCES lottery_products(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_prize_structures_product_id ON prize_structures(product_id);
CREATE INDEX IF NOT EXISTS idx_prize_structures_region      ON prize_structures(region);

-- lottery_tickets
CREATE TABLE IF NOT EXISTS lottery_tickets (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id          UUID NOT NULL,
    ticket_img          VARCHAR(500),
    serial_number       VARCHAR(100) NOT NULL,
    numbers             VARCHAR(100) NOT NULL,
    draw_date           DATE NOT NULL,
    batch_code          VARCHAR(100) NOT NULL,
    status              VARCHAR(50) NOT NULL DEFAULT 'IN_STOCK',
    imported_by         UUID NOT NULL,
    imported_at         TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    is_verified         BOOLEAN NOT NULL DEFAULT FALSE,
    verified_by         UUID,
    verified_at         TIMESTAMP,
    returned_at         TIMESTAMP,

    -- Audit
    created_at          TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at          TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by          VARCHAR(100) DEFAULT 'SYSTEM',
    last_modified_by    VARCHAR(100) DEFAULT 'SYSTEM',

    CONSTRAINT fk_lottery_tickets_product_id
        FOREIGN KEY (product_id) REFERENCES lottery_products(id) ON DELETE CASCADE,
    CONSTRAINT fk_lottery_tickets_imported_by
        FOREIGN KEY (imported_by) REFERENCES users(id) ON DELETE SET NULL,
    CONSTRAINT fk_lottery_tickets_verified_by
        FOREIGN KEY (verified_by) REFERENCES users(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_lottery_tickets_product_id ON lottery_tickets(product_id);
CREATE INDEX IF NOT EXISTS idx_lottery_tickets_status     ON lottery_tickets(status);
CREATE INDEX IF NOT EXISTS idx_lottery_tickets_numbers    ON lottery_tickets(numbers);
CREATE INDEX IF NOT EXISTS idx_lottery_tickets_draw_date   ON lottery_tickets(draw_date);
CREATE INDEX IF NOT EXISTS idx_lottery_tickets_batch_code  ON lottery_tickets(batch_code);

-- ============================================================================
-- LOTTERY MODULE SCHEMA UPDATES
-- ============================================================================

-- 1. UPDATE UNIQUE CONSTRAINT FOR LOTTERY TICKETS
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'uq_lottery_tickets_serial_number'
    ) THEN
        ALTER TABLE lottery_tickets DROP CONSTRAINT uq_lottery_tickets_serial_number;
    END IF;

    IF EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'uk_lottery_tickets_serial_number'
    ) THEN
        ALTER TABLE lottery_tickets DROP CONSTRAINT uk_lottery_tickets_serial_number;
    END IF;
END
$$;

DROP INDEX IF EXISTS uq_lottery_tickets_serial_number;
DROP INDEX IF EXISTS uk_lottery_tickets_serial_number;
DROP INDEX IF EXISTS lottery_tickets_serial_number_key;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'uk_lottery_ticket_product_serial_numbers_draw_date'
    ) THEN
        ALTER TABLE lottery_tickets
            ADD CONSTRAINT uk_lottery_ticket_product_serial_numbers_draw_date
                UNIQUE (product_id, serial_number, numbers, draw_date);
    END IF;
END
$$;

-- 2. ADD DELETED_AT COLUMN FOR SOFT DELETE
ALTER TABLE lottery_tickets ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP NULL;
ALTER TABLE lottery_products ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP NULL;
ALTER TABLE prize_structures ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP NULL;

CREATE INDEX IF NOT EXISTS idx_lottery_tickets_deleted_at ON lottery_tickets(deleted_at);
CREATE INDEX IF NOT EXISTS idx_lottery_products_deleted_at ON lottery_products(deleted_at);
CREATE INDEX IF NOT EXISTS idx_prize_structures_deleted_at ON prize_structures(deleted_at);
