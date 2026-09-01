ALTER TABLE prize_claim_submissions
    ADD COLUMN IF NOT EXISTS actual_received_evidence_url VARCHAR(500);

COMMENT ON COLUMN prize_claim_submissions.actual_received_evidence_url IS
    'Ảnh chứng từ số tiền Nhà cung cấp đã thanh toán cho phiếu nộp.';
