-- Supplier settlement adjustment audit ledger.
-- Supplier settlement fields live in the canonical CREATE TABLE from
-- V202607311100; this migration only owns this dependent table.
CREATE TABLE IF NOT EXISTS supplier_settlement_adjustments (
    id                       BIGSERIAL PRIMARY KEY,
    supplier_settlement_id   BIGINT       NOT NULL REFERENCES supplier_settlements (id),
    lottery_ticket_serial_id BIGINT      REFERENCES lottery_ticket_serials (id),
    group_type               VARCHAR(20)  NOT NULL,
    reason_code              VARCHAR(40)  NOT NULL,
    amount                   NUMERIC(18, 3) NOT NULL DEFAULT 0,
    custom_name              VARCHAR(255),
    auto_generated           BOOLEAN      NOT NULL DEFAULT FALSE,
    note                     TEXT,
    resolved_by              UUID,
    created_at               TIMESTAMP    NOT NULL DEFAULT NOW(),
    updated_at               TIMESTAMP,
    created_by               VARCHAR(255),
    last_modified_by         VARCHAR(255),
    deleted_at               TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_ssa_settlement_id
    ON supplier_settlement_adjustments (supplier_settlement_id)
    WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_ssa_serial_id
    ON supplier_settlement_adjustments (lottery_ticket_serial_id)
    WHERE deleted_at IS NULL;

COMMENT ON TABLE supplier_settlement_adjustments IS
    '1-N ledger for settlement reconciliation. group_type: IMPORT|RETURN|SETTLEMENT. '
    'SETTLEMENT amounts: positive increases payable to supplier; negative decreases (discount/credit). '
    'Never overwrite supplier_settlements.initial_estimated_settlement_value.';
COMMENT ON COLUMN supplier_settlement_adjustments.group_type IS
    'IMPORT | RETURN | SETTLEMENT';
COMMENT ON COLUMN supplier_settlement_adjustments.reason_code IS
    'Inventory: MISSING_IMPORT, INSUFFICIENT_IMPORT, WRONG_DENOMINATION, EXCESS_IMPORT, '
    'MISSING_RETURN, LOST_DURING_RETURN, EXPIRED_UNRETURNED, EXCESS_RETURN, OTHER. '
    'Monetary: SHIPPING_FEE, LATE_PENALTY, DISCOUNT, ROUNDING, OTHER.';
COMMENT ON COLUMN supplier_settlement_adjustments.custom_name IS
    'Tên khoản điều chỉnh tùy chọn, bắt buộc khi reason_code = OTHER.';
COMMENT ON COLUMN supplier_settlement_adjustments.auto_generated IS
    'True when the adjustment was auto-created from a reconciliation difference.';
