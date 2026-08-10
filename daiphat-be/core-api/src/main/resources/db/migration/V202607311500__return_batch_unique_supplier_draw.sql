-- One return batch per supplier + draw date (any status), for idempotent auto-generation.
DROP INDEX IF EXISTS uq_return_batches_pending_supplier_draw;

CREATE UNIQUE INDEX IF NOT EXISTS uq_return_batches_supplier_draw
    ON return_batches (lottery_supplier_id, draw_date)
    WHERE deleted_at IS NULL
      AND return_batch_type = 'SUPPLIER_RETURN';

CREATE UNIQUE INDEX IF NOT EXISTS uq_return_batches_street_agent_allocation
    ON return_batches (source_allocation_batch_id)
    WHERE deleted_at IS NULL
      AND return_batch_type = 'STREET_AGENT_RETURN';
