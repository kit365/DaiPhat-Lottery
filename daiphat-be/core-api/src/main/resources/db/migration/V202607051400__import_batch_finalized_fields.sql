-- Finalize import_batches / import_batch_lines schema per domain model.

ALTER TABLE import_batches
    ADD COLUMN IF NOT EXISTS supplier_settlement_id BIGINT,
    ADD COLUMN IF NOT EXISTS import_mode                VARCHAR(30),
    ADD COLUMN IF NOT EXISTS invoice_evidence_url       VARCHAR(500),
    ADD COLUMN IF NOT EXISTS line_count                 INTEGER NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS total_declare_quantity     INTEGER NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS total_declared_cost_value  NUMERIC(15, 0) NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS total_imported_quantity    INTEGER NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS total_imported_cost_value  NUMERIC(15, 0) NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS submitted_at               TIMESTAMP,
    ADD COLUMN IF NOT EXISTS completed_at               TIMESTAMP,
    ADD COLUMN IF NOT EXISTS ledger_at                  TIMESTAMP,
    ADD COLUMN IF NOT EXISTS note                       TEXT;

ALTER TABLE import_batch_lines
    ADD COLUMN IF NOT EXISTS declared_cost_value NUMERIC(15, 0) NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS status              VARCHAR(30) NOT NULL DEFAULT 'OPEN',
    ADD COLUMN IF NOT EXISTS imported_at           TIMESTAMP;

-- Move invoice evidence from lines to batch header (one shared receipt per batch).
UPDATE import_batches ib
SET invoice_evidence_url = src.invoice_evidence_url
FROM (
    SELECT DISTINCT ON (import_batch_id)
        import_batch_id,
        invoice_evidence_url
    FROM import_batch_lines
    WHERE invoice_evidence_url IS NOT NULL
      AND TRIM(invoice_evidence_url) <> ''
    ORDER BY import_batch_id, id
) src
WHERE ib.id = src.import_batch_id
  AND (ib.invoice_evidence_url IS NULL OR TRIM(ib.invoice_evidence_url) = '');

UPDATE import_batch_lines
SET declared_cost_value = declare_quantity * import_cost
WHERE declared_cost_value = 0
  AND declare_quantity > 0
  AND import_cost > 0;

UPDATE import_batch_lines
SET status = CASE
    WHEN total_quantity >= declare_quantity AND declare_quantity > 0 THEN 'IMPORTED'
    WHEN total_quantity > 0 THEN 'IMPORTING'
    ELSE 'OPEN'
END
WHERE status = 'OPEN';

UPDATE import_batch_lines
SET imported_at = updated_at
WHERE status = 'IMPORTED'
  AND imported_at IS NULL;

UPDATE import_batches ib
SET line_count = agg.line_count,
    total_declare_quantity = agg.total_declare_quantity,
    total_declared_cost_value = agg.total_declared_cost_value,
    total_imported_quantity = agg.total_imported_quantity,
    total_imported_cost_value = agg.total_imported_cost_value
FROM (
    SELECT
        import_batch_id,
        COUNT(*)::INTEGER AS line_count,
        COALESCE(SUM(declare_quantity), 0)::INTEGER AS total_declare_quantity,
        COALESCE(SUM(declared_cost_value), 0) AS total_declared_cost_value,
        COALESCE(SUM(total_quantity), 0)::INTEGER AS total_imported_quantity,
        COALESCE(SUM(total_cost_value), 0) AS total_imported_cost_value
    FROM import_batch_lines
    WHERE deleted_at IS NULL
    GROUP BY import_batch_id
) agg
WHERE ib.id = agg.import_batch_id;

UPDATE import_batches
SET submitted_at = imported_at
WHERE submitted_at IS NULL
  AND status <> 'DRAFT';

UPDATE import_batches
SET completed_at = updated_at
WHERE completed_at IS NULL
  AND status IN ('IMPORTED', 'IN_LEDGER');

ALTER TABLE import_batch_lines
    DROP COLUMN IF EXISTS invoice_evidence_url;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'uq_import_batch_lines_batch_station'
    ) THEN
        ALTER TABLE import_batch_lines
            ADD CONSTRAINT uq_import_batch_lines_batch_station
                UNIQUE (import_batch_id, lottery_station_id);
    END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_import_batches_supplier_settlement_id
    ON import_batches(supplier_settlement_id);
