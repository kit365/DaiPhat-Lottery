-- prize_structures: cấu trúc giải thưởng cho từng sản phẩm xổ số theo vùng miền
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
