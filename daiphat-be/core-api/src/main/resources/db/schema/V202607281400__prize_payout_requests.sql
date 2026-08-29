CREATE TABLE prize_payout_requests (
    id                  BIGSERIAL PRIMARY KEY,
    request_code        VARCHAR(50)  NOT NULL,
    customer_id         UUID         REFERENCES users (id),
    order_id            UUID         NOT NULL REFERENCES orders (id),
    order_detail_id     BIGINT       NOT NULL REFERENCES order_details (id),
    serial_id           BIGINT       NOT NULL REFERENCES lottery_ticket_serials (id),
    prize_code          VARCHAR(50)  NOT NULL,
    prize_display_name  VARCHAR(200),
    gross_amount        NUMERIC(15, 2) NOT NULL,
    bank_account_id     BIGINT       REFERENCES user_bank_accounts (id),
    bank_name           VARCHAR(200),
    bank_account_number VARCHAR(50),
    account_holder_name VARCHAR(200),
    recipient_full_name VARCHAR(200),
    recipient_id_number VARCHAR(20),
    recipient_id_image_url VARCHAR(500),
    recipient_id_image_back_url VARCHAR(500),
    recipient_identity_captured_at TIMESTAMPTZ,
    confirmation_contract_url VARCHAR(500),
    cash_amount         NUMERIC(15, 2),
    transfer_amount     NUMERIC(15, 2),
    channel             VARCHAR(30) NOT NULL DEFAULT 'ONLINE',
    tax_amount          NUMERIC(15, 2) NOT NULL DEFAULT 0,
    commission_amount   NUMERIC(15, 2) NOT NULL DEFAULT 0,
    net_amount          NUMERIC(15, 2) NOT NULL DEFAULT 0,
    payment_method      VARCHAR(30) NOT NULL DEFAULT 'TRANSFER',
    reject_count        INTEGER NOT NULL DEFAULT 0,
    ticket_origin       VARCHAR(30) NOT NULL DEFAULT 'INTERNAL_OFFLINE',
    ownership_verification_level VARCHAR(30) NOT NULL DEFAULT 'MANUAL_ONLY',
    manual_ownership_confirmed BOOLEAN NOT NULL DEFAULT FALSE,
    status              VARCHAR(30)  NOT NULL,
    reject_reason       TEXT,
    transfer_evidence_url VARCHAR(500),
    completed_at        TIMESTAMP,
    completed_by        UUID REFERENCES users (id),
    created_at          TIMESTAMP    NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMP    NOT NULL DEFAULT NOW(),
    created_by          VARCHAR(255),
    last_modified_by    VARCHAR(255),
    CONSTRAINT uk_prize_payout_requests_code UNIQUE (request_code)
);

CREATE INDEX idx_prize_payout_requests_customer ON prize_payout_requests (customer_id);
CREATE INDEX idx_prize_payout_requests_status ON prize_payout_requests (status);
CREATE INDEX idx_prize_payout_requests_serial ON prize_payout_requests (serial_id);
CREATE INDEX idx_prize_payout_requests_created_at ON prize_payout_requests (created_at DESC);
CREATE INDEX idx_prize_payout_requests_channel ON prize_payout_requests (channel);
CREATE INDEX idx_prize_payout_requests_ticket_origin ON prize_payout_requests (ticket_origin);

COMMENT ON COLUMN prize_payout_requests.cash_amount IS
    'Cash portion paid at counter (COMBINED / CASH)';
COMMENT ON COLUMN prize_payout_requests.transfer_amount IS
    'Bank transfer portion (COMBINED / TRANSFER)';

CREATE UNIQUE INDEX uk_prize_payout_serial_open
    ON prize_payout_requests (serial_id)
    WHERE status IN ('PENDING', 'APPROVED');
