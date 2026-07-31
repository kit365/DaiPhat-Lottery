-- Allow decimal unit costs (scale 3) on import batch money columns.
ALTER TABLE import_batch_lines
    ALTER COLUMN import_cost TYPE NUMERIC(18, 3),
    ALTER COLUMN declared_cost_value TYPE NUMERIC(18, 3),
    ALTER COLUMN total_cost_value TYPE NUMERIC(18, 3);

ALTER TABLE import_batches
    ALTER COLUMN total_declared_cost_value TYPE NUMERIC(18, 3),
    ALTER COLUMN total_imported_cost_value TYPE NUMERIC(18, 3);

-- Supplier settlement aggregate (auto-created per supplier + draw date).
CREATE TABLE IF NOT EXISTS supplier_settlements (
    id                   BIGSERIAL PRIMARY KEY,
    lottery_supplier_id  BIGINT NOT NULL,
    period_from          DATE NOT NULL,
    period_to            DATE NOT NULL,
    total_import_value   NUMERIC(18, 3) NOT NULL DEFAULT 0,
    total_return_value   NUMERIC(18, 3) NOT NULL DEFAULT 0,
    total_paid_amount    NUMERIC(18, 3) NOT NULL DEFAULT 0,
    remaining_amount     NUMERIC(18, 3) NOT NULL DEFAULT 0,
    status               VARCHAR(30) NOT NULL DEFAULT 'OPEN',
    transaction_id       BIGINT,
    created_at           TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at           TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by           VARCHAR(100) DEFAULT 'SYSTEM',
    last_modified_by     VARCHAR(100) DEFAULT 'SYSTEM',
    deleted_at           TIMESTAMP,
    CONSTRAINT fk_supplier_settlements_supplier
        FOREIGN KEY (lottery_supplier_id) REFERENCES lottery_suppliers (id),
    CONSTRAINT uq_supplier_settlements_supplier_period_from
        UNIQUE (lottery_supplier_id, period_from)
);

CREATE INDEX IF NOT EXISTS idx_supplier_settlements_supplier_id
    ON supplier_settlements (lottery_supplier_id);
CREATE INDEX IF NOT EXISTS idx_supplier_settlements_period_from
    ON supplier_settlements (period_from);
CREATE INDEX IF NOT EXISTS idx_supplier_settlements_status
    ON supplier_settlements (status);

ALTER TABLE import_batches
    DROP CONSTRAINT IF EXISTS fk_import_batches_supplier_settlement_id;

ALTER TABLE import_batches
    ADD CONSTRAINT fk_import_batches_supplier_settlement_id
        FOREIGN KEY (supplier_settlement_id) REFERENCES supplier_settlements (id);
