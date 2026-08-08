-- DP-269 follow-up: scan/verification audit trail, kept separate from a
-- general-purpose audit log (faster reporting queries, scan-specific
-- fields like scan_method/is_valid, no extra weight on Audit_Log).

CREATE TABLE IF NOT EXISTS ocr_scan_results (
    id                          BIGSERIAL PRIMARY KEY,

    -- Correlates back to ticket-vision's scan batch (TicketScanResponse.scanId)
    -- and this ticket's position within it.
    scan_id                     VARCHAR(100) NOT NULL,
    ticket_index                INTEGER NOT NULL,

    import_batch_line_id        BIGINT,
    station_id                  BIGINT,

    extracted_station_name      VARCHAR(255),
    extracted_serial_number     VARCHAR(100),
    extracted_numbers           VARCHAR(50),
    extracted_draw_date         DATE,
    confidence                  DOUBLE PRECISION,

    -- ScannedTicketStatus: COMPLETE / NEEDS_REVIEW / INCOMPLETE
    status                      VARCHAR(20),
    missing_fields               JSONB,
    validation_errors           JSONB,
    business_validation_errors  JSONB,
    cropped_image_url           VARCHAR(500),

    scanned_by                  UUID NOT NULL,
    scanned_at                  TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    -- Audit
    created_at                  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at                  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by                  VARCHAR(100) DEFAULT 'SYSTEM',
    last_modified_by            VARCHAR(100) DEFAULT 'SYSTEM',
    deleted_at                  TIMESTAMP,

    CONSTRAINT fk_ocr_scan_results_import_batch_line
        FOREIGN KEY (import_batch_line_id) REFERENCES import_batch_lines(id) ON DELETE SET NULL,
    CONSTRAINT fk_ocr_scan_results_station
        FOREIGN KEY (station_id) REFERENCES lottery_stations(id) ON DELETE SET NULL,
    CONSTRAINT fk_ocr_scan_results_scanned_by
        FOREIGN KEY (scanned_by) REFERENCES users(id) ON DELETE RESTRICT
);

CREATE INDEX IF NOT EXISTS idx_ocr_scan_results_scan_id ON ocr_scan_results(scan_id);
CREATE INDEX IF NOT EXISTS idx_ocr_scan_results_scanned_by ON ocr_scan_results(scanned_by);
CREATE INDEX IF NOT EXISTS idx_ocr_scan_results_import_batch_line ON ocr_scan_results(import_batch_line_id);

CREATE TABLE IF NOT EXISTS lottery_scan_logs (
    id                          BIGSERIAL PRIMARY KEY,

    -- ScanEventType: SCAN_STARTED, OCR_COMPLETED, MANUAL_INPUT, VERIFY_PASSED,
    -- VERIFY_FAILED, TICKET_CREATED, TICKET_FOUND, TICKET_NOT_FOUND,
    -- INVALID_TICKET, SCAN_COMPLETED
    event_type                  VARCHAR(30) NOT NULL,

    ocr_scan_result_id          BIGINT,
    lottery_ticket_serial_id    BIGINT,
    scanned_by                  UUID NOT NULL,

    -- ScanMethod: QR_SCAN, OCR_SCAN, MANUAL_INPUT. OCR_SCAN was added
    -- alongside qr_scan/manual_input (the two the spec named) so every
    -- OCR-camera-scan event has a coherent value here too.
    scan_method                 VARCHAR(20),
    is_valid                    BOOLEAN,
    note                        VARCHAR(500),

    scanned_at                  TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    -- Audit
    created_at                  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at                  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by                  VARCHAR(100) DEFAULT 'SYSTEM',
    last_modified_by            VARCHAR(100) DEFAULT 'SYSTEM',
    deleted_at                  TIMESTAMP,

    CONSTRAINT fk_lottery_scan_logs_ocr_scan_result
        FOREIGN KEY (ocr_scan_result_id) REFERENCES ocr_scan_results(id) ON DELETE SET NULL,
    CONSTRAINT fk_lottery_scan_logs_ticket_serial
        FOREIGN KEY (lottery_ticket_serial_id) REFERENCES lottery_ticket_serials(id) ON DELETE SET NULL,
    CONSTRAINT fk_lottery_scan_logs_scanned_by
        FOREIGN KEY (scanned_by) REFERENCES users(id) ON DELETE RESTRICT
);

CREATE INDEX IF NOT EXISTS idx_lottery_scan_logs_event_type ON lottery_scan_logs(event_type);
CREATE INDEX IF NOT EXISTS idx_lottery_scan_logs_ticket_serial ON lottery_scan_logs(lottery_ticket_serial_id);
CREATE INDEX IF NOT EXISTS idx_lottery_scan_logs_scanned_by ON lottery_scan_logs(scanned_by);
CREATE INDEX IF NOT EXISTS idx_lottery_scan_logs_scanned_at ON lottery_scan_logs(scanned_at);
