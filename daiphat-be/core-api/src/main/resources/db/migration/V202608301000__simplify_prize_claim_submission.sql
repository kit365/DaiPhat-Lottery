-- Simplify PrizeClaimSubmission: 3-state workflow, per-line outcomes, drop settlement

-- 1. Migrate enum data
UPDATE prize_claim_submission_lines SET line_status = 'HANDED_OVER' WHERE line_status IN ('PAID', 'CONFIRMED');
UPDATE prize_claim_submission_lines SET line_status = 'REJECTED_FRAUD' WHERE line_status = 'REJECTED_FINAL' AND rejection_reason = 'FRAUD_SUSPECTED';
UPDATE prize_claim_submission_lines SET line_status = 'REJECTED_LOSS' WHERE line_status = 'REJECTED_FINAL' AND rejection_reason IS DISTINCT FROM 'FRAUD_SUSPECTED';
DELETE FROM prize_claim_submission_lines WHERE line_status = 'WITHDRAWN';

UPDATE prize_claim_submissions SET status = 'CLOSED' WHERE status = 'COMPLETED';
UPDATE prize_claim_submissions SET status = 'SUBMITTED' WHERE status IN ('CONFIRMED', 'PAYMENT_PENDING');

-- Fix net claim amounts
UPDATE prize_claim_submission_lines SET net_claim_amount = gross_prize_amount - commission_amount;
UPDATE prize_claim_submissions pcs SET
  total_net_claim_amount = (SELECT COALESCE(SUM(net_claim_amount), 0) FROM prize_claim_submission_lines l WHERE l.prize_claim_submission_id = pcs.id);

-- 2. Drop settlement infrastructure
DROP TABLE IF EXISTS supplier_settlement_receivables;

ALTER TABLE prize_claim_submissions
    DROP COLUMN IF EXISTS confirmed_at,
    DROP COLUMN IF EXISTS confirmed_by,
    DROP COLUMN IF EXISTS completed_at,
    DROP COLUMN IF EXISTS completed_by,
    DROP COLUMN IF EXISTS approved_by,
    DROP COLUMN IF EXISTS confirmation_reference,
    DROP COLUMN IF EXISTS confirmation_evidence_url,
    DROP COLUMN IF EXISTS payment_deadline,
    DROP COLUMN IF EXISTS is_overdue,
    DROP COLUMN IF EXISTS paid_amount,
    DROP COLUMN IF EXISTS settlement_status,
    DROP COLUMN IF EXISTS settlement_difference_amount,
    DROP COLUMN IF EXISTS payment_evidence_urls,
    DROP COLUMN IF EXISTS payment_note;

DROP INDEX IF EXISTS ix_pcs_payment_deadline;

-- 3. Add needs_outcome flag
ALTER TABLE prize_claim_submissions
    ADD COLUMN IF NOT EXISTS needs_outcome BOOLEAN NOT NULL DEFAULT FALSE;

CREATE INDEX IF NOT EXISTS ix_pcs_needs_outcome ON prize_claim_submissions (needs_outcome) WHERE needs_outcome = TRUE;

-- 4. Replace unique index — only block PENDING lines
DROP INDEX IF EXISTS ux_pcsl_serial_active;
CREATE UNIQUE INDEX ux_pcsl_serial_active
    ON prize_claim_submission_lines (serial_id)
    WHERE line_status = 'PENDING';
