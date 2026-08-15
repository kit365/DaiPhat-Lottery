-- Keeps the supplier's original upload as evidence for settlement disputes.
--
-- The file hash alone proves a file has not changed, but it cannot reproduce what
-- the supplier actually sent, which is exactly what a disagreement over quantities
-- comes down to.
ALTER TABLE import_batch_file_import_logs
    ADD COLUMN IF NOT EXISTS original_file_url VARCHAR(500);

ALTER TABLE import_batch_file_import_logs
    ADD COLUMN IF NOT EXISTS original_file_public_id VARCHAR(255);
