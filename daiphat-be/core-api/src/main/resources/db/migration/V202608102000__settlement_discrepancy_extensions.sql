-- Extend settlement discrepancy enums (stored as VARCHAR; no CHECK constraints to alter).
-- Documents new group/reason codes and return batch type used by reconciliation flows.

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

COMMENT ON COLUMN return_batches.return_batch_type IS
    'SUPPLIER_RETURN | STREET_AGENT_RETURN | EXCESS_SUPPLIER_RETURN';
