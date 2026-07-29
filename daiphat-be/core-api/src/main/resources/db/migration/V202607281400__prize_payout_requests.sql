ALTER TABLE lottery_ticket_serials
    ADD COLUMN IF NOT EXISTS payout_state VARCHAR(30) NOT NULL DEFAULT 'NONE';

CREATE TABLE prize_payout_requests (
    id                  BIGSERIAL PRIMARY KEY,
    request_code        VARCHAR(50)  NOT NULL,
    customer_id         UUID         NOT NULL REFERENCES users (id),
    order_id            UUID         NOT NULL REFERENCES orders (id),
    order_detail_id     BIGINT       NOT NULL REFERENCES order_details (id),
    serial_id           BIGINT       NOT NULL REFERENCES lottery_ticket_serials (id),
    prize_code          VARCHAR(50)  NOT NULL,
    prize_display_name  VARCHAR(200),
    gross_amount        NUMERIC(15, 2) NOT NULL,
    bank_account_id     BIGINT       NOT NULL REFERENCES user_bank_accounts (id),
    bank_name           VARCHAR(200),
    bank_account_number VARCHAR(50),
    account_holder_name VARCHAR(200),
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

CREATE UNIQUE INDEX uk_prize_payout_serial_pending
    ON prize_payout_requests (serial_id)
    WHERE status = 'PENDING';
