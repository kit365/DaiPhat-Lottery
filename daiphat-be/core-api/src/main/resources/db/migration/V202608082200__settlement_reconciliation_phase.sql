-- Reconciliation state machine fields on supplier_settlements + adjustment audit ledger

ALTER TABLE supplier_settlements
    ADD COLUMN IF NOT EXISTS reconciliation_phase VARCHAR(40) NOT NULL DEFAULT 'MATCHING';

ALTER TABLE supplier_settlements
    ADD COLUMN IF NOT EXISTS system_import_quantity INTEGER,
    ADD COLUMN IF NOT EXISTS system_import_value NUMERIC(18, 3),
    ADD COLUMN IF NOT EXISTS system_return_quantity INTEGER,
    ADD COLUMN IF NOT EXISTS system_return_value NUMERIC(18, 3),
    ADD COLUMN IF NOT EXISTS actual_ticket_import_quantity INTEGER,
    ADD COLUMN IF NOT EXISTS actual_ticket_import_value NUMERIC(18, 3),
    ADD COLUMN IF NOT EXISTS actual_return_ticket_quantity INTEGER,
    ADD COLUMN IF NOT EXISTS actual_return_ticket_value NUMERIC(18, 3),
    ADD COLUMN IF NOT EXISTS actual_settlement_value NUMERIC(18, 3),
    ADD COLUMN IF NOT EXISTS import_quantity_mismatch BOOLEAN NOT NULL DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS import_value_mismatch BOOLEAN NOT NULL DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS return_quantity_mismatch BOOLEAN NOT NULL DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS return_value_mismatch BOOLEAN NOT NULL DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS import_discrepancy_resolved BOOLEAN NOT NULL DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS return_discrepancy_resolved BOOLEAN NOT NULL DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS recalculated_total_paid_amount NUMERIC(18, 3),
    ADD COLUMN IF NOT EXISTS reconciliation_note TEXT,
    ADD COLUMN IF NOT EXISTS matching_confirmed_at TIMESTAMP,
    ADD COLUMN IF NOT EXISTS matching_confirmed_by UUID,
    ADD COLUMN IF NOT EXISTS completed_at TIMESTAMP,
    ADD COLUMN IF NOT EXISTS completed_by UUID;

CREATE INDEX IF NOT EXISTS idx_supplier_settlements_reconciliation_phase
    ON supplier_settlements (reconciliation_phase);

CREATE TABLE IF NOT EXISTS supplier_settlement_adjustments (
    id                      BIGSERIAL PRIMARY KEY,
    supplier_settlement_id  BIGINT       NOT NULL REFERENCES supplier_settlements (id),
    lottery_ticket_serial_id BIGINT      REFERENCES lottery_ticket_serials (id),
    group_type              VARCHAR(20)  NOT NULL,
    reason_code             VARCHAR(40)  NOT NULL,
    amount                  NUMERIC(18, 3) NOT NULL DEFAULT 0,
    note                    TEXT,
    resolved_by             UUID,
    created_at              TIMESTAMP    NOT NULL DEFAULT NOW(),
    updated_at              TIMESTAMP,
    created_by              VARCHAR(255),
    last_modified_by        VARCHAR(255),
    deleted_at              TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_ssa_settlement_id
    ON supplier_settlement_adjustments (supplier_settlement_id)
    WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_ssa_serial_id
    ON supplier_settlement_adjustments (lottery_ticket_serial_id)
    WHERE deleted_at IS NULL;
