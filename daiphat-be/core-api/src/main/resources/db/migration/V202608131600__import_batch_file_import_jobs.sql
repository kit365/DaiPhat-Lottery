-- History of every attempt to import a supplier file.
--
-- Deliberately separate from import_batches: a batch is a business document whose
-- status drives stock and supplier debt, while a job is a technical run that lasts
-- seconds. Putting PENDING/FAILED on a batch would corrupt the meaning of a
-- voucher that settlement reads.
--
-- One job produces zero to many batches - a weekly file typically yields two.
CREATE TABLE IF NOT EXISTS import_batch_file_import_jobs
(
    id                      BIGSERIAL PRIMARY KEY,
    file_hash               VARCHAR(64) NOT NULL,
    file_name               VARCHAR(255),
    original_file_url       VARCHAR(500),
    original_file_public_id VARCHAR(255),
    supplier_id             BIGINT      NOT NULL REFERENCES lottery_suppliers (id),
    imported_by             UUID        NOT NULL,
    status                  VARCHAR(30) NOT NULL,
    imports_tickets         BOOLEAN     NOT NULL DEFAULT FALSE,
    requested_draw_dates    VARCHAR(255),
    requested_count         INT         NOT NULL DEFAULT 0,
    created_count           INT         NOT NULL DEFAULT 0,
    failed_count            INT         NOT NULL DEFAULT 0,
    declared_quantity       INT         NOT NULL DEFAULT 0,
    imported_quantity       INT         NOT NULL DEFAULT 0,
    error_code              VARCHAR(30),
    error_message           TEXT,
    started_at              TIMESTAMP,
    finished_at             TIMESTAMP,
    created_at              TIMESTAMP,
    updated_at              TIMESTAMP,
    created_by              VARCHAR(255),
    last_modified_by        VARCHAR(255),
    deleted_at              TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_import_batch_file_import_job_supplier
    ON import_batch_file_import_jobs (supplier_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_import_batch_file_import_job_operator
    ON import_batch_file_import_jobs (imported_by, created_at DESC);

-- Ties each created batch back to the run that produced it.
ALTER TABLE import_batch_file_import_logs
    ADD COLUMN IF NOT EXISTS job_id BIGINT REFERENCES import_batch_file_import_jobs (id);
