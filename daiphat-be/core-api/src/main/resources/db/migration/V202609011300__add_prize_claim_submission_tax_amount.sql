-- Align prize claim submission amounts with payout request tax breakdown.
ALTER TABLE prize_claim_submission_lines
    ADD COLUMN IF NOT EXISTS tax_amount NUMERIC(19, 2) NOT NULL DEFAULT 0;

ALTER TABLE prize_claim_submissions
    ADD COLUMN IF NOT EXISTS total_tax_amount NUMERIC(19, 2) NOT NULL DEFAULT 0;

-- Backfill line tax and net from linked payout requests.
UPDATE prize_claim_submission_lines pcl
SET tax_amount = COALESCE(ppr.tax_amount, 0),
    net_claim_amount = COALESCE(
        ppr.net_amount,
        pcl.gross_prize_amount - COALESCE(ppr.tax_amount, 0) - pcl.commission_amount
    )
FROM prize_payout_requests ppr
WHERE pcl.prize_payout_request_id = ppr.id;

-- Recompute submission totals.
UPDATE prize_claim_submissions pcs
SET total_tax_amount = COALESCE(sub.total_tax, 0),
    total_net_claim_amount = COALESCE(sub.total_net, 0)
FROM (
    SELECT prize_claim_submission_id,
           SUM(tax_amount) AS total_tax,
           SUM(net_claim_amount) AS total_net
    FROM prize_claim_submission_lines
    GROUP BY prize_claim_submission_id
) sub
WHERE pcs.id = sub.prize_claim_submission_id;
