-- Align PrizeClaimSubmission workflow with ReturnBatch: inspection → handover → per-line outcomes

-- 1. Migrate header status SUBMITTED → HANDED_OVER
UPDATE prize_claim_submissions SET status = 'HANDED_OVER' WHERE status = 'SUBMITTED';

-- 2. Migrate line statuses
UPDATE prize_claim_submission_lines l
SET line_status = 'AWAITING_OUTCOME'
FROM prize_claim_submissions s
WHERE l.prize_claim_submission_id = s.id
  AND l.line_status = 'PENDING'
  AND s.status IN ('HANDED_OVER', 'CLOSED');

UPDATE prize_claim_submission_lines l
SET line_status = 'SELECTED'
FROM prize_claim_submissions s
WHERE l.prize_claim_submission_id = s.id
  AND l.line_status = 'PENDING'
  AND s.status = 'DRAFT';

UPDATE prize_claim_submission_lines SET line_status = 'SELECTED' WHERE line_status = 'PENDING';

-- 3. Handover evidence & delivery fields
ALTER TABLE prize_claim_submissions
    ADD COLUMN IF NOT EXISTS handover_evidence_url VARCHAR(500),
    ADD COLUMN IF NOT EXISTS handover_receipt_url VARCHAR(500),
    ADD COLUMN IF NOT EXISTS delivery_mode VARCHAR(32),
    ADD COLUMN IF NOT EXISTS handed_over_at TIMESTAMP,
    ADD COLUMN IF NOT EXISTS handed_over_by UUID,
    ADD COLUMN IF NOT EXISTS supplier_reference VARCHAR(200),
    ADD COLUMN IF NOT EXISTS handover_note TEXT;

ALTER TABLE prize_claim_submission_lines
    ADD COLUMN IF NOT EXISTS outcome_evidence_url VARCHAR(500);

UPDATE prize_claim_submissions
SET handed_over_at = submitted_at,
    handed_over_by = submitted_by
WHERE status IN ('HANDED_OVER', 'CLOSED')
  AND handed_over_at IS NULL
  AND submitted_at IS NOT NULL;

-- 4. Replace unique index — block serials in active prep/outcome lines
DROP INDEX IF EXISTS ux_pcsl_serial_active;
CREATE UNIQUE INDEX ux_pcsl_serial_active
    ON prize_claim_submission_lines (serial_id)
    WHERE line_status IN ('SELECTED', 'INSPECTED', 'AWAITING_OUTCOME');
