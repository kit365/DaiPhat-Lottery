-- Align return_batches with V202607311400 / V202607311500 / V202608041100 when an older
-- CREATE TABLE IF NOT EXISTS left the table without return_batch_type (and related columns).

ALTER TABLE return_batches
    ADD COLUMN IF NOT EXISTS return_batch_type VARCHAR(30) NOT NULL DEFAULT 'SUPPLIER_RETURN',
    ADD COLUMN IF NOT EXISTS source_allocation_batch_id BIGINT;

-- STREET_AGENT_RETURN rows have no supplier; older schema forced NOT NULL.
ALTER TABLE return_batches
    ALTER COLUMN lottery_supplier_id DROP NOT NULL;

CREATE INDEX IF NOT EXISTS idx_return_batches_type
    ON return_batches (return_batch_type);
CREATE INDEX IF NOT EXISTS idx_return_batches_source_allocation
    ON return_batches (source_allocation_batch_id);

-- Replace legacy unique (supplier, draw) that blocked multiple open statuses / agent returns.
DROP INDEX IF EXISTS uq_return_batches_supplier_draw;

CREATE UNIQUE INDEX IF NOT EXISTS uq_return_batches_pending_supplier_draw
    ON return_batches (lottery_supplier_id, draw_date)
    WHERE deleted_at IS NULL
      AND return_batch_type = 'SUPPLIER_RETURN'
      AND status = 'PENDING';

CREATE UNIQUE INDEX IF NOT EXISTS uq_return_batches_pending_inspection_supplier_draw
    ON return_batches (lottery_supplier_id, draw_date)
    WHERE deleted_at IS NULL
      AND return_batch_type = 'SUPPLIER_RETURN'
      AND status = 'PENDING_INSPECTION';

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'fk_return_batches_source_allocation_batch'
    ) AND EXISTS (
        SELECT 1 FROM information_schema.tables WHERE table_name = 'allocation_batches'
    ) THEN
        ALTER TABLE return_batches
            ADD CONSTRAINT fk_return_batches_source_allocation_batch
                FOREIGN KEY (source_allocation_batch_id) REFERENCES allocation_batches(id);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'ck_return_batches_type_source'
    ) THEN
        ALTER TABLE return_batches
            ADD CONSTRAINT ck_return_batches_type_source CHECK (
                (return_batch_type = 'SUPPLIER_RETURN'
                    AND lottery_supplier_id IS NOT NULL
                    AND source_allocation_batch_id IS NULL)
                OR
                (return_batch_type = 'STREET_AGENT_RETURN'
                    AND lottery_supplier_id IS NULL
                    AND source_allocation_batch_id IS NOT NULL)
            );
    END IF;
END $$;
