CREATE TABLE IF NOT EXISTS import_batch_lines (
    id                    BIGSERIAL PRIMARY KEY,
    import_batch_id       BIGINT NOT NULL,
    lottery_station_id    BIGINT NOT NULL,
    batch_type            VARCHAR(30) NOT NULL,
    declare_quantity      INTEGER NOT NULL,
    total_quantity        INTEGER NOT NULL DEFAULT 0,
    import_cost           NUMERIC(15, 0) NOT NULL,
    total_cost_value      NUMERIC(15, 0) NOT NULL DEFAULT 0,
    invoice_evidence_url  VARCHAR(500),
    created_at            TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at            TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by            VARCHAR(100) DEFAULT 'SYSTEM',
    last_modified_by      VARCHAR(100) DEFAULT 'SYSTEM',
    deleted_at            TIMESTAMP,
    CONSTRAINT fk_import_batch_lines_import_batch_id
        FOREIGN KEY (import_batch_id) REFERENCES import_batches(id),
    CONSTRAINT fk_import_batch_lines_lottery_station_id
        FOREIGN KEY (lottery_station_id) REFERENCES lottery_stations(id)
);

INSERT INTO import_batch_lines (
    import_batch_id,
    lottery_station_id,
    batch_type,
    declare_quantity,
    total_quantity,
    import_cost,
    total_cost_value,
    invoice_evidence_url,
    created_at,
    updated_at,
    created_by,
    last_modified_by
)
SELECT
    id,
    lottery_station_id,
    batch_type,
    declare_quantity,
    total_quantity,
    import_cost,
    total_cost_value,
    invoice_evidence_url,
    created_at,
    updated_at,
    created_by,
    last_modified_by
FROM import_batches
WHERE lottery_station_id IS NOT NULL;

ALTER TABLE lottery_tickets
    ADD COLUMN IF NOT EXISTS import_batch_line_id BIGINT;

UPDATE lottery_tickets t
SET import_batch_line_id = l.id
FROM import_batch_lines l
WHERE t.import_batch_id = l.import_batch_id
  AND t.import_batch_line_id IS NULL;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'fk_lottery_tickets_import_batch_line_id'
    ) THEN
        ALTER TABLE lottery_tickets
            ADD CONSTRAINT fk_lottery_tickets_import_batch_line_id
                FOREIGN KEY (import_batch_line_id) REFERENCES import_batch_lines(id);
    END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_import_batch_lines_import_batch_id
    ON import_batch_lines(import_batch_id);
CREATE INDEX IF NOT EXISTS idx_import_batch_lines_station_batch_type
    ON import_batch_lines(lottery_station_id, batch_type);
CREATE INDEX IF NOT EXISTS idx_lottery_tickets_import_batch_line_id
    ON lottery_tickets(import_batch_line_id);

ALTER TABLE import_batches DROP COLUMN IF EXISTS lottery_station_id;
ALTER TABLE import_batches DROP COLUMN IF EXISTS supplier_ledger_id;
ALTER TABLE import_batches DROP COLUMN IF EXISTS requested_batch_type;
ALTER TABLE import_batches DROP COLUMN IF EXISTS batch_type;
ALTER TABLE import_batches DROP COLUMN IF EXISTS invoice_evidence_url;
ALTER TABLE import_batches DROP COLUMN IF EXISTS declare_quantity;
ALTER TABLE import_batches DROP COLUMN IF EXISTS total_quantity;
ALTER TABLE import_batches DROP COLUMN IF EXISTS import_cost;
ALTER TABLE import_batches DROP COLUMN IF EXISTS total_cost_value;

DROP INDEX IF EXISTS idx_import_batches_station_draw_date;
