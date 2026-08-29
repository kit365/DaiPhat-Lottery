-- Supporting tables for creating import batches from a supplier .csv / .xlsx file.
-- Version 202608121100 (not 202608121000) so it does not collide with
-- V202608121000__add_street_agent_report_indexes.sql from origin/dev.

-- Learned spellings of a station name, so a supplier's wording only has to be
-- corrected by hand once.
CREATE TABLE IF NOT EXISTS lottery_station_aliases
(
    id                 BIGSERIAL PRIMARY KEY,
    lottery_station_id BIGINT       NOT NULL REFERENCES lottery_stations (id),
    alias_normalized   VARCHAR(160) NOT NULL,
    created_at         TIMESTAMP,
    updated_at         TIMESTAMP,
    created_by         VARCHAR(255),
    last_modified_by   VARCHAR(255),
    deleted_at         TIMESTAMP,
    CONSTRAINT uk_lottery_station_alias_normalized UNIQUE (alias_normalized)
);

CREATE INDEX IF NOT EXISTS idx_lottery_station_alias_station
    ON lottery_station_aliases (lottery_station_id);

-- Column mapping remembered per supplier + header layout, so a recurring file
-- shape is recognised on upload and the user never re-maps it.
CREATE TABLE IF NOT EXISTS import_batch_file_mapping_profiles
(
    id               BIGSERIAL PRIMARY KEY,
    supplier_id      BIGINT      NOT NULL REFERENCES lottery_suppliers (id),
    header_signature VARCHAR(64) NOT NULL,
    mapping          JSONB       NOT NULL,
    use_count        INT         NOT NULL DEFAULT 0,
    last_used_at     TIMESTAMP,
    created_at       TIMESTAMP,
    updated_at       TIMESTAMP,
    created_by       VARCHAR(255),
    last_modified_by VARCHAR(255),
    deleted_at       TIMESTAMP,
    CONSTRAINT uk_import_batch_file_mapping_profile UNIQUE (supplier_id, header_signature)
);

-- One row per batch created from a file. The unique key stops a double submit or
-- a page refresh from creating the same batch twice, while still allowing the very
-- same weekly file to be re-uploaded tomorrow for the next draw date.
CREATE TABLE IF NOT EXISTS import_batch_file_import_logs
(
    id               BIGSERIAL PRIMARY KEY,
    file_hash        VARCHAR(64) NOT NULL,
    file_name        VARCHAR(255),
    supplier_id      BIGINT      NOT NULL REFERENCES lottery_suppliers (id),
    draw_date        DATE        NOT NULL,
    imported_by      UUID        NOT NULL,
    import_batch_id  BIGINT      NOT NULL REFERENCES import_batches (id),
    line_count       INT         NOT NULL DEFAULT 0,
    created_at       TIMESTAMP,
    updated_at       TIMESTAMP,
    created_by       VARCHAR(255),
    last_modified_by VARCHAR(255),
    deleted_at       TIMESTAMP,
    CONSTRAINT uk_import_batch_file_import UNIQUE (file_hash, supplier_id, draw_date, imported_by)
);

CREATE INDEX IF NOT EXISTS idx_import_batch_file_import_log_batch
    ON import_batch_file_import_logs (import_batch_id);
-- Keeps the supplier's original upload as evidence for settlement disputes.
--
-- The file hash alone proves a file has not changed, but it cannot reproduce what
-- the supplier actually sent, which is exactly what a disagreement over quantities
-- comes down to.
ALTER TABLE import_batch_file_import_logs
    ADD COLUMN IF NOT EXISTS original_file_url VARCHAR(500);

ALTER TABLE import_batch_file_import_logs
    ADD COLUMN IF NOT EXISTS original_file_public_id VARCHAR(255);
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
