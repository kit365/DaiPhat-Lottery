CREATE TABLE IF NOT EXISTS import_batches (
    id                    BIGSERIAL PRIMARY KEY,
    lottery_station_id    BIGINT NOT NULL,
    supplier_ledger_id    BIGINT,
    requested_batch_type  VARCHAR(30) NOT NULL,
    batch_type            VARCHAR(30) NOT NULL,
    invoice_evidence_url  VARCHAR(500),
    draw_date             DATE NOT NULL,
    declare_quantity      INTEGER NOT NULL,
    total_quantity        INTEGER NOT NULL DEFAULT 0,
    import_cost           NUMERIC(15, 0) NOT NULL,
    total_cost_value      NUMERIC(15, 0) NOT NULL DEFAULT 0,
    imported_by           UUID NOT NULL,
    imported_at           TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    status                VARCHAR(30) NOT NULL DEFAULT 'DRAFT',
    created_at            TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at            TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by            VARCHAR(100) DEFAULT 'SYSTEM',
    last_modified_by      VARCHAR(100) DEFAULT 'SYSTEM',
    CONSTRAINT fk_import_batches_lottery_station_id
        FOREIGN KEY (lottery_station_id) REFERENCES lottery_stations(id),
    CONSTRAINT fk_import_batches_imported_by
        FOREIGN KEY (imported_by) REFERENCES users(id)
);

CREATE INDEX IF NOT EXISTS idx_import_batches_station_draw_date
    ON import_batches(lottery_station_id, draw_date);
CREATE INDEX IF NOT EXISTS idx_import_batches_status
    ON import_batches(status);

INSERT INTO system_config (config_key, config_value, config_type, data_type, description)
VALUES
    ('IMPORT_LATE_WINDOW_START', '14:30', 'ORDER_SETTING', 'TIME', 'Giờ bắt đầu khung nhập muộn lô vé')
ON CONFLICT (config_key) DO UPDATE SET
    config_value = EXCLUDED.config_value,
    config_type = EXCLUDED.config_type,
    data_type = EXCLUDED.data_type,
    description = EXCLUDED.description,
    updated_at = CURRENT_TIMESTAMP;
