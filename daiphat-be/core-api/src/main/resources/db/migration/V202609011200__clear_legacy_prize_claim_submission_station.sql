-- Consolidated prize claim submissions no longer pin a single lottery station at header level.
-- Legacy rows kept lottery_supplier_id = 1 (HCM) even when lines belonged to other stations.
UPDATE prize_claim_submissions
SET lottery_supplier_id = NULL
WHERE lottery_supplier_id IS NOT NULL;
