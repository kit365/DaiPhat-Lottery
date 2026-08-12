-- Return batches (supplier + draw date) and per-station lines.
CREATE TABLE IF NOT EXISTS return_batches (
    id                       BIGSERIAL PRIMARY KEY,
    batch_code               VARCHAR(100),
    -- SUPPLIER_RETURN: outbound return to supplier.
    -- STREET_AGENT_RETURN: inbound receipt from a vendor; linked to allocation later.
    -- EXCESS_SUPPLIER_RETURN: additional supplier return after reconciliation.
    return_batch_type        VARCHAR(30) NOT NULL DEFAULT 'SUPPLIER_RETURN',
    lottery_supplier_id      BIGINT,
    source_allocation_batch_id BIGINT,
    draw_date                DATE NOT NULL,
    supplier_settlement_id   BIGINT,
    return_receipt_url       VARCHAR(500),
    return_evidence_url       VARCHAR(500),
    delivery_mode            VARCHAR(40),
    total_quantity           INT NOT NULL DEFAULT 0,
    total_return_value       NUMERIC(18, 3) NOT NULL DEFAULT 0,
    returned_by              UUID,
    returned_at              TIMESTAMP,
    confirmed_at             TIMESTAMP,
    status                   VARCHAR(30) NOT NULL DEFAULT 'PENDING_INSPECTION',
    note                     TEXT,
    cancel_reason            TEXT,
    cancelled_at             TIMESTAMP,
    created_at               TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at               TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by               VARCHAR(100) DEFAULT 'SYSTEM',
    last_modified_by         VARCHAR(100) DEFAULT 'SYSTEM',
    deleted_at               TIMESTAMP,
    CONSTRAINT fk_return_batches_supplier
        FOREIGN KEY (lottery_supplier_id) REFERENCES lottery_suppliers (id),
    CONSTRAINT fk_return_batches_supplier_settlement
        FOREIGN KEY (supplier_settlement_id) REFERENCES supplier_settlements (id)
);

CREATE INDEX IF NOT EXISTS idx_return_batches_supplier_id
    ON return_batches (lottery_supplier_id);
CREATE INDEX IF NOT EXISTS idx_return_batches_draw_date
    ON return_batches (draw_date);
CREATE INDEX IF NOT EXISTS idx_return_batches_settlement_id
    ON return_batches (supplier_settlement_id);
CREATE INDEX IF NOT EXISTS idx_return_batches_status
    ON return_batches (status);
CREATE INDEX IF NOT EXISTS idx_return_batches_type
    ON return_batches (return_batch_type);
CREATE INDEX IF NOT EXISTS idx_return_batches_source_allocation
    ON return_batches (source_allocation_batch_id);
CREATE INDEX IF NOT EXISTS idx_return_batches_batch_code
    ON return_batches (batch_code);

COMMENT ON COLUMN return_batches.return_batch_type IS
    'SUPPLIER_RETURN | STREET_AGENT_RETURN | EXCESS_SUPPLIER_RETURN';

CREATE SEQUENCE IF NOT EXISTS return_batch_header_code_seq START WITH 1 INCREMENT BY 1;

-- One supplier return batch per supplier + draw date, regardless of status.
-- This keeps auto-generation idempotent and supports the vendor return type.
DROP INDEX IF EXISTS uq_return_batches_pending_supplier_draw;

CREATE UNIQUE INDEX IF NOT EXISTS uq_return_batches_supplier_draw
    ON return_batches (lottery_supplier_id, draw_date)
    WHERE deleted_at IS NULL
      AND return_batch_type = 'SUPPLIER_RETURN';

CREATE UNIQUE INDEX IF NOT EXISTS uq_return_batches_street_agent_allocation
    ON return_batches (source_allocation_batch_id)
    WHERE deleted_at IS NULL
      AND return_batch_type = 'STREET_AGENT_RETURN';

CREATE TABLE IF NOT EXISTS return_batch_lines (
    id                   BIGSERIAL PRIMARY KEY,
    return_batch_id      BIGINT NOT NULL,
    lottery_station_id   BIGINT NOT NULL,
    status               VARCHAR(30) NOT NULL DEFAULT 'PENDING',
    total_quantity       INT NOT NULL DEFAULT 0,
    total_return_value   NUMERIC(18, 3) NOT NULL DEFAULT 0,
    created_at           TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at           TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by           VARCHAR(100) DEFAULT 'SYSTEM',
    last_modified_by     VARCHAR(100) DEFAULT 'SYSTEM',
    deleted_at           TIMESTAMP,
    CONSTRAINT fk_return_batch_lines_batch
        FOREIGN KEY (return_batch_id) REFERENCES return_batches (id),
    CONSTRAINT fk_return_batch_lines_station
        FOREIGN KEY (lottery_station_id) REFERENCES lottery_stations (id)
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_return_batch_lines_batch_station
    ON return_batch_lines (return_batch_id, lottery_station_id)
    WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_return_batch_lines_batch_id
    ON return_batch_lines (return_batch_id);
CREATE INDEX IF NOT EXISTS idx_return_batch_lines_station_id
    ON return_batch_lines (lottery_station_id);
CREATE INDEX IF NOT EXISTS idx_return_batch_lines_status
    ON return_batch_lines (status);

-- Manual override + return line link on ticket serials.
ALTER TABLE lottery_ticket_serials
    ADD COLUMN IF NOT EXISTS is_manual_override BOOLEAN NOT NULL DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS override_reason TEXT,
    ADD COLUMN IF NOT EXISTS override_evidence_url VARCHAR(500),
    ADD COLUMN IF NOT EXISTS return_batch_line_id BIGINT;

ALTER TABLE lottery_ticket_serials
    DROP CONSTRAINT IF EXISTS fk_lottery_ticket_serials_return_batch_line;

ALTER TABLE lottery_ticket_serials
    ADD CONSTRAINT fk_lottery_ticket_serials_return_batch_line
        FOREIGN KEY (return_batch_line_id) REFERENCES return_batch_lines (id);

CREATE INDEX IF NOT EXISTS idx_lottery_ticket_serials_return_batch_line_id
    ON lottery_ticket_serials (return_batch_line_id);
CREATE INDEX IF NOT EXISTS idx_lottery_ticket_serials_sellable
    ON lottery_ticket_serials (status, ticket_condition, return_batch_line_id)
    WHERE deleted_at IS NULL;
