-- Bank-info retry workflow: track customer STK correction attempts and staff notes.

ALTER TABLE refund_requests
    ADD COLUMN IF NOT EXISTS retry_count INT NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS operator_note TEXT;

-- MANUAL_RESOLUTION status fits existing VARCHAR(20) status column.
