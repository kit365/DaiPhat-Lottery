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

CREATE INDEX idx_lottery_products_status ON lottery_products(status);
CREATE INDEX idx_lottery_products_type   ON lottery_products(type);