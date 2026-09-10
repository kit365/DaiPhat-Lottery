-- Allow consolidated prize claim submissions across all lottery stations.
ALTER TABLE prize_claim_submissions
    ALTER COLUMN lottery_supplier_id DROP NOT NULL;
