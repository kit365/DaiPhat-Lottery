-- Align prize-claim / partial-payout tables with BaseEntity (@CreatedDate, @LastModifiedDate, deleted_at).
-- Without deleted_at Hibernate INSERT/SELECT fails with "column deleted_at does not exist".

ALTER TABLE prize_claim_submissions
    ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP;

ALTER TABLE prize_claim_submission_lines
    ADD COLUMN IF NOT EXISTS created_by VARCHAR(100),
    ADD COLUMN IF NOT EXISTS last_modified_by VARCHAR(100),
    ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP;

ALTER TABLE agency_funds
    ADD COLUMN IF NOT EXISTS created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    ADD COLUMN IF NOT EXISTS created_by VARCHAR(100),
    ADD COLUMN IF NOT EXISTS last_modified_by VARCHAR(100),
    ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP;

ALTER TABLE supplier_settlement_receivables
    ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
    ADD COLUMN IF NOT EXISTS last_modified_by VARCHAR(100),
    ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP;

ALTER TABLE prize_payout_installments
    ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
    ADD COLUMN IF NOT EXISTS created_by VARCHAR(100),
    ADD COLUMN IF NOT EXISTS last_modified_by VARCHAR(100),
    ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP;
