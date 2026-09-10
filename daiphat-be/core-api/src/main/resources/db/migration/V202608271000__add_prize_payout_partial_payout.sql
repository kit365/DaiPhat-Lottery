-- ============================================================
-- Partial Payout: installments + agency_funds
-- Supplement cho bảng prize_payout_requests hiện có
-- ============================================================

-- Bảng quỹ đại lý — theo dõi số dư khả dụng để trả giải thưởng
-- Scope: agency = LOTTERY_RETAILER (đại lý bán vé), KHÔNG phải nhà đài
-- Luồng: credit khi PrizeClaimSubmission COMPLETED (nhà đài trả đại lý)
--        debit khi PrizePayout payout/payoutPartial/payFinalInstallment (đại lý trả khách)
CREATE TABLE agency_funds (
    id BIGSERIAL PRIMARY KEY,
    agency_id UUID NOT NULL UNIQUE,  -- FK → lottery_retailers
    available_balance DECIMAL(19,2) NOT NULL DEFAULT 0 CHECK (available_balance >= 0),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX ix_af_agency_id ON agency_funds(agency_id);

-- Bảng ghi nhận từng đợt trả tiền cho 1 payout request
-- Kể cả trả đủ 1 lần cũng ghi 1 dòng
CREATE TABLE prize_payout_installments (
    id BIGSERIAL PRIMARY KEY,
    prize_payout_request_id BIGINT NOT NULL REFERENCES prize_payout_requests(id),
    installment_amount DECIMAL(19,2) NOT NULL CHECK (installment_amount > 0),
    paid_at TIMESTAMP NOT NULL DEFAULT NOW(),
    paid_by UUID NOT NULL,
    payment_method VARCHAR(50) NOT NULL,  -- CASH / TRANSFER / COMBINED
    note TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX ix_ppi_request_id ON prize_payout_installments(prize_payout_request_id);
CREATE INDEX ix_ppi_paid_at ON prize_payout_installments(paid_at);

-- ============================================================
-- Mở rộng prize_payout_requests (ADD COLUMN)
-- ============================================================

-- Tổng tiền thưởng gốc — lưu tại thời điểm tạo, không đổi
ALTER TABLE prize_payout_requests
    ADD COLUMN IF NOT EXISTS total_prize_amount DECIMAL(19,2) DEFAULT 0;

-- Tổng đã trả đến hiện tại
ALTER TABLE prize_payout_requests
    ADD COLUMN IF NOT EXISTS paid_amount_to_date DECIMAL(19,2) DEFAULT 0;

-- Cam kết chi trả (khi quỹ không đủ)
ALTER TABLE prize_payout_requests
    ADD COLUMN IF NOT EXISTS fund_advance_note TEXT;

ALTER TABLE prize_payout_requests
    ADD COLUMN IF NOT EXISTS commitment_voucher_code VARCHAR(50);

ALTER TABLE prize_payout_requests
    ADD COLUMN IF NOT EXISTS commitment_expires_at DATE;

-- Commitment voucher: chỉ tạo khi AWAITING_FUND
-- Hạn cam kết: mặc định 7 ngày sau khi tạo, có thể điều chỉnh

-- Bảng ghi nhận công nợ nhà đài (khi PrizeClaimSubmission COMPLETED với UNDERPAID)
CREATE TABLE IF NOT EXISTS supplier_settlement_receivables (
    id BIGSERIAL PRIMARY KEY,
    -- Submission gốc bị UNDERPAID
    prize_claim_submission_id BIGINT NOT NULL REFERENCES prize_claim_submissions(id),
    lottery_supplier_id BIGINT NOT NULL REFERENCES lottery_stations(id),
    -- Số tiền còn nợ ban đầu (tại thời điểm submission COMPLETED)
    original_outstanding_amount DECIMAL(19,2) NOT NULL,
    -- Số tiền còn nợ còn lại
    remaining_amount DECIMAL(19,2) NOT NULL CHECK (remaining_amount >= 0),
    -- Trạng thái
    status VARCHAR(30) NOT NULL DEFAULT 'PENDING',  -- PENDING / PARTIALLY_SETTLED / SETTLED
    -- Ai tạo / ai settle
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    created_by VARCHAR(100),
    settled_at TIMESTAMP,
    settled_by VARCHAR(100),
    -- Ghi chú
    note TEXT
);

CREATE INDEX ix_ssr_submission_id ON supplier_settlement_receivables(prize_claim_submission_id);
CREATE INDEX ix_ssr_supplier_id ON supplier_settlement_receivables(lottery_supplier_id);
CREATE INDEX ix_ssr_status ON supplier_settlement_receivables(status);
