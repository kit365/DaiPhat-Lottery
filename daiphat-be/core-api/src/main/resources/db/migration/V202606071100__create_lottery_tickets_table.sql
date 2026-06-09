CREATE TABLE IF NOT EXISTS lottery_tickets (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id          UUID NOT NULL,
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

CREATE INDEX idx_lottery_tickets_product_id ON lottery_tickets(product_id);
CREATE INDEX idx_lottery_tickets_status     ON lottery_tickets(status);
CREATE INDEX idx_lottery_tickets_numbers    ON lottery_tickets(numbers);
