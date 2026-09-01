-- Prize claim submission amounts should be supplier-facing (gross - tax only),
-- not customer payout net (which also deducts level-2 commission).

UPDATE prize_claim_submission_lines
SET net_claim_amount = COALESCE(gross_prize_amount, 0) - COALESCE(tax_amount, 0),
    commission_amount = 0
WHERE COALESCE(commission_amount, 0) <> 0
   OR net_claim_amount <> COALESCE(gross_prize_amount, 0) - COALESCE(tax_amount, 0);

UPDATE prize_claim_submissions pcs
SET total_net_claim_amount = agg.total_net,
    total_commission_amount = 0
FROM (
    SELECT prize_claim_submission_id AS submission_id,
           COALESCE(SUM(COALESCE(gross_prize_amount, 0) - COALESCE(tax_amount, 0)), 0) AS total_net
    FROM prize_claim_submission_lines
    GROUP BY prize_claim_submission_id
) agg
WHERE pcs.id = agg.submission_id
  AND (
      COALESCE(pcs.total_commission_amount, 0) <> 0
      OR pcs.total_net_claim_amount <> agg.total_net
  );

ALTER TABLE prize_claim_submissions
    ADD COLUMN IF NOT EXISTS actual_received_amount NUMERIC(19, 2);
