-- ============================================================
-- PrizeClaimSubmission: nộp vé trúng thưởng cho nhà đài
-- (Manual Evidence-Based claim process)
-- ============================================================

-- Bảng cha: phiếu nộp
CREATE TABLE prize_claim_submissions (
    id BIGSERIAL PRIMARY KEY,
    submission_code VARCHAR(50) NOT NULL UNIQUE,
    lottery_supplier_id BIGINT NOT NULL REFERENCES lottery_stations(id),
    period_from DATE,
    period_to DATE,
    total_ticket_count INT DEFAULT 0,
    total_gross_prize_amount DECIMAL(19,2) DEFAULT 0,
    total_net_claim_amount DECIMAL(19,2) DEFAULT 0,
    total_commission_amount DECIMAL(19,2) DEFAULT 0,

    -- Trạng thái: DRAFT → SUBMITTED → CONFIRMED → PAYMENT_PENDING → COMPLETED
    -- SUBMITTED trở lên có thể hủy → CANCELLED (maker-checker bắt buộc)
    status VARCHAR(30) NOT NULL DEFAULT 'DRAFT',

    -- Audit trail
    submitted_at TIMESTAMP,
    submitted_by UUID,
    confirmed_at TIMESTAMP,
    confirmed_by UUID,
    completed_at TIMESTAMP,
    completed_by UUID,
    cancelled_at TIMESTAMP,
    cancelled_by UUID,
    approved_by UUID,  -- người duyệt hủy / maker-checker

    -- Bằng chứng nhà đài xác nhận (bắt buộc khi CONFIRMED)
    confirmation_reference VARCHAR(200),
    confirmation_evidence_url VARCHAR(500),

    -- Thanh toán
    payment_deadline DATE,
    is_overdue BOOLEAN NOT NULL DEFAULT FALSE,
    paid_amount DECIMAL(19,2) DEFAULT 0,

    -- Settlement: so sánh paid_amount vs total_net_claim_amount
    settlement_status VARCHAR(30),  -- FULL / UNDERPAID / OVERPAID
    settlement_difference_amount DECIMAL(19,2) DEFAULT 0,

    -- Hủy
    cancel_reason TEXT,

    -- Chứng từ thanh toán (bắt buộc khi COMPLETED)
    payment_evidence_urls JSONB DEFAULT '[]'::jsonb,
    payment_note TEXT,

    -- Timestamps
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
    created_by VARCHAR(100),
    last_modified_by VARCHAR(100)
);

CREATE INDEX ix_pcs_supplier_id ON prize_claim_submissions(lottery_supplier_id);
CREATE INDEX ix_pcs_status ON prize_claim_submissions(status);
CREATE INDEX ix_pcs_payment_deadline ON prize_claim_submissions(payment_deadline) WHERE payment_deadline IS NOT NULL;

-- Bảng con: dòng vé trong phiếu nộp
CREATE TABLE prize_claim_submission_lines (
    id BIGSERIAL PRIMARY KEY,
    prize_claim_submission_id BIGINT NOT NULL REFERENCES prize_claim_submissions(id) ON DELETE CASCADE,

    -- Liên kết đến PrizePayoutRequest (nullable — nếu vé đã tạo payout request)
    prize_payout_request_id BIGINT REFERENCES prize_payout_requests(id),

    -- Liên kết đến serial
    serial_id BIGINT NOT NULL REFERENCES lottery_ticket_serials(id),

    -- Denormalized — nhà đài phát hành vé (cho guard check)
    station_id BIGINT NOT NULL,

    draw_date DATE,
    prize_code VARCHAR(50),
    prize_display_name VARCHAR(200),

    gross_prize_amount DECIMAL(19,2) DEFAULT 0,
    net_claim_amount DECIMAL(19,2) DEFAULT 0,
    commission_amount DECIMAL(19,2) DEFAULT 0,

    ticket_serial_number VARCHAR(100),
    ticket_numbers VARCHAR(200),

    -- Trạng thái dòng
    -- PENDING: chờ nhà đài xác nhận
    -- CONFIRMED: nhà đài đồng ý
    -- REJECTED_RETRYABLE: nhà đài từ chối có thể nộp lại → serial giải phóng
    -- REJECTED_FINAL: nhà đài từ chối vĩnh viễn (gian lận, vé giả) → serial bị khóa
    -- PAID: đã được thanh toán
    -- WITHDRAWN: submission bị cancel → serial giải phóng
    line_status VARCHAR(30) NOT NULL DEFAULT 'PENDING',

    -- Lý do từ chối (nullable)
    rejection_reason VARCHAR(50),  -- PAPER_DAMAGED / WRONG_STATION / FRAUD_SUSPECTED / DUPLICATE_CLAIM / EXPIRED / OTHER
    rejection_note TEXT,

    submitted_at TIMESTAMP,

    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX ix_pcsl_submission_id ON prize_claim_submission_lines(prize_claim_submission_id);
CREATE INDEX ix_pcsl_serial_id ON prize_claim_submission_lines(serial_id);
CREATE INDEX ix_pcsl_payout_request_id ON prize_claim_submission_lines(prize_payout_request_id)
    WHERE prize_payout_request_id IS NOT NULL;

-- ============================================================
-- UNIQUE INDEX: race condition guard
-- Ngăn 2 staff cùng add 1 serial vào 2 draft/submission active
--
-- Logic:
--   - Serial chỉ bị block khi có line đang ACTIVE (không phải REJECTED_FINAL hoặc WITHDRAWN)
--   - REJECTED_FINAL: serial bị khóa vĩnh viễn → không add được vào submission nào
--   - WITHDRAWN: submission cha bị cancel → serial tự do
--
-- Partial index Postgres: chỉ index các dòng đang ACTIVE
-- ============================================================
CREATE UNIQUE INDEX ux_pcsl_serial_active
    ON prize_claim_submission_lines (serial_id)
    WHERE line_status NOT IN ('REJECTED_FINAL', 'WITHDRAWN');
