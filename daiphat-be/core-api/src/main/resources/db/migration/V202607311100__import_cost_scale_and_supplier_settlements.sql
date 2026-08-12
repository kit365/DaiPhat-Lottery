-- Supplier settlement aggregate (auto-created per supplier + draw date).
--
-- This is the canonical schema for supplier reconciliation. Keep the complete
-- shape here so a clean local database does not depend on a chain of ALTER
-- migrations to become compatible with SupplierSettlementEntity.
CREATE SEQUENCE IF NOT EXISTS supplier_settlement_code_seq START WITH 1 INCREMENT BY 1;

CREATE TABLE IF NOT EXISTS supplier_settlements (
    id                              BIGSERIAL PRIMARY KEY,
    lottery_supplier_id             BIGINT NOT NULL,
    period_from                     DATE NOT NULL,
    period_to                       DATE NOT NULL,
    supplier_settlement_code        VARCHAR(100) NOT NULL,
    total_import_value              NUMERIC(18, 3) NOT NULL DEFAULT 0,
    total_return_value              NUMERIC(18, 3) NOT NULL DEFAULT 0,
    total_paid_amount               NUMERIC(18, 3) NOT NULL DEFAULT 0,
    remaining_amount                NUMERIC(18, 3) NOT NULL DEFAULT 0,
    supplier_settlement_receipt_url VARCHAR(500),
    status                          VARCHAR(30) NOT NULL DEFAULT 'OPEN',
    reconciliation_phase            VARCHAR(40) NOT NULL DEFAULT 'MATCHING',
    transaction_id                  BIGINT REFERENCES transactions (id),
    paid_at                         TIMESTAMP,
    is_return_expired               BOOLEAN NOT NULL DEFAULT FALSE,
    expired_return_value            NUMERIC(18, 3) NOT NULL DEFAULT 0.000,

    system_import_quantity          INTEGER,
    system_import_value             NUMERIC(18, 3),
    system_return_quantity          INTEGER,
    system_return_value             NUMERIC(18, 3),
    actual_ticket_import_quantity   INTEGER,
    actual_ticket_import_value      NUMERIC(18, 3),
    actual_return_ticket_quantity   INTEGER,
    actual_return_ticket_value      NUMERIC(18, 3),
    original_ticket_unit_price      NUMERIC(18, 3),
    reconciled_ticket_unit_price    NUMERIC(18, 3),
    initial_estimated_settlement_value NUMERIC(18, 3),
    final_settlement_value          NUMERIC(18, 3),
    actual_paid_amount              NUMERIC(18, 3),
    settlement_difference_amount    NUMERIC(18, 3),
    discrepancy_types               JSONB NOT NULL DEFAULT '[]'::jsonb,
    discrepancy_items               JSONB NOT NULL DEFAULT '[]'::jsonb,

    import_quantity_mismatch        BOOLEAN NOT NULL DEFAULT FALSE,
    import_value_mismatch           BOOLEAN NOT NULL DEFAULT FALSE,
    return_quantity_mismatch        BOOLEAN NOT NULL DEFAULT FALSE,
    return_value_mismatch           BOOLEAN NOT NULL DEFAULT FALSE,
    import_discrepancy_resolved     BOOLEAN NOT NULL DEFAULT FALSE,
    return_discrepancy_resolved     BOOLEAN NOT NULL DEFAULT FALSE,
    unit_price_discrepancy_resolved BOOLEAN NOT NULL DEFAULT TRUE,
    recalculated_total_paid_amount  NUMERIC(18, 3),
    reconciliation_note             TEXT,
    matching_confirmed_at           TIMESTAMP,
    matching_confirmed_by           UUID,
    completed_at                    TIMESTAMP,
    completed_by                    UUID,

    created_at                      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at                      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by                      VARCHAR(100) DEFAULT 'SYSTEM',
    last_modified_by                VARCHAR(100) DEFAULT 'SYSTEM',
    deleted_at                      TIMESTAMP,
    CONSTRAINT fk_supplier_settlements_supplier
        FOREIGN KEY (lottery_supplier_id) REFERENCES lottery_suppliers (id),
    CONSTRAINT uq_supplier_settlements_supplier_period_from
        UNIQUE (lottery_supplier_id, period_from),
    CONSTRAINT uq_supplier_settlements_code
        UNIQUE (supplier_settlement_code)
);

CREATE INDEX IF NOT EXISTS idx_supplier_settlements_supplier_id
    ON supplier_settlements (lottery_supplier_id);
CREATE INDEX IF NOT EXISTS idx_supplier_settlements_period_from
    ON supplier_settlements (period_from);
CREATE INDEX IF NOT EXISTS idx_supplier_settlements_status
    ON supplier_settlements (status);
CREATE INDEX IF NOT EXISTS idx_supplier_settlements_paid_at
    ON supplier_settlements (paid_at);
CREATE INDEX IF NOT EXISTS idx_supplier_settlements_reconciliation_phase
    ON supplier_settlements (reconciliation_phase);

COMMENT ON TABLE supplier_settlements IS
    'Supplier reconciliation aggregate. Initial/final settlement values are system-calculated; adjustments are stored separately.';
COMMENT ON COLUMN supplier_settlements.actual_paid_amount IS
    'Giá trị thực trả theo biên lai đối soát nhà cung cấp.';
COMMENT ON COLUMN supplier_settlements.discrepancy_items IS
    'Chi tiết chênh lệch dạng JSONB phục vụ đối soát.';
COMMENT ON COLUMN supplier_settlements.reconciliation_phase IS
    'MATCHING | DISCREPANCY_DETECTED | RESOLVING_IMPORT_DISCREPANCY | RESOLVING_RETURN_DISCREPANCY | COMPLETED.';

ALTER TABLE import_batches
    DROP CONSTRAINT IF EXISTS fk_import_batches_supplier_settlement_id;

ALTER TABLE import_batches
    ADD CONSTRAINT fk_import_batches_supplier_settlement_id
        FOREIGN KEY (supplier_settlement_id) REFERENCES supplier_settlements (id);
