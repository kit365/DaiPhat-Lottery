-- User bank accounts for refund payouts
CREATE TABLE IF NOT EXISTS user_bank_accounts (
    id BIGSERIAL PRIMARY KEY,
    user_id UUID NOT NULL,
    bank_name VARCHAR(150) NOT NULL,
    bank_logo VARCHAR(500),
    bank_bin VARCHAR(20) NOT NULL,
    bank_account_no VARCHAR(50) NOT NULL,
    bank_account_name VARCHAR(150) NOT NULL,
    is_default BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP,
    updated_at TIMESTAMP,
    created_by VARCHAR(255),
    last_modified_by VARCHAR(255),
    CONSTRAINT fk_user_bank_accounts_user FOREIGN KEY (user_id) REFERENCES users (id),
    CONSTRAINT uk_user_bank_accounts_user_bin_account UNIQUE (user_id, bank_bin, bank_account_no)
);

CREATE INDEX IF NOT EXISTS idx_user_bank_accounts_user_id ON user_bank_accounts (user_id);
CREATE INDEX IF NOT EXISTS idx_user_bank_accounts_user_default ON user_bank_accounts (user_id, is_default);

CREATE UNIQUE INDEX IF NOT EXISTS uk_user_bank_accounts_one_default_per_user
    ON user_bank_accounts (user_id)
    WHERE is_default = TRUE;

-- Refund requests
CREATE TABLE IF NOT EXISTS refund_requests (
    id BIGSERIAL PRIMARY KEY,
    refund_type VARCHAR(30) NOT NULL,
    order_id UUID NOT NULL,
    order_detail_id BIGINT,
    requested_by UUID NOT NULL,
    request_role VARCHAR(20) NOT NULL,
    refund_amount DECIMAL(15, 0) NOT NULL,
    refund_reason VARCHAR(500),
    bank_account_id BIGINT NOT NULL,
    status VARCHAR(20) NOT NULL,
    reject_reason VARCHAR(500),
    reviewed_by UUID,
    reviewed_at TIMESTAMP,
    transfer_evidence_url VARCHAR(500),
    transferred_at TIMESTAMP,
    transferred_by UUID,
    created_at TIMESTAMP,
    updated_at TIMESTAMP,
    created_by VARCHAR(255),
    last_modified_by VARCHAR(255),
    CONSTRAINT fk_refund_requests_order FOREIGN KEY (order_id) REFERENCES orders (id),
    CONSTRAINT fk_refund_requests_order_detail FOREIGN KEY (order_detail_id) REFERENCES order_details (id),
    CONSTRAINT fk_refund_requests_requested_by FOREIGN KEY (requested_by) REFERENCES users (id),
    CONSTRAINT fk_refund_requests_bank_account FOREIGN KEY (bank_account_id) REFERENCES user_bank_accounts (id),
    CONSTRAINT fk_refund_requests_reviewed_by FOREIGN KEY (reviewed_by) REFERENCES users (id),
    CONSTRAINT fk_refund_requests_transferred_by FOREIGN KEY (transferred_by) REFERENCES users (id)
);

CREATE INDEX IF NOT EXISTS idx_refund_requests_order_id ON refund_requests (order_id);
CREATE INDEX IF NOT EXISTS idx_refund_requests_order_detail_id ON refund_requests (order_detail_id);
CREATE INDEX IF NOT EXISTS idx_refund_requests_requested_by ON refund_requests (requested_by);
CREATE INDEX IF NOT EXISTS idx_refund_requests_status ON refund_requests (status);
CREATE INDEX IF NOT EXISTS idx_refund_requests_bank_account_id ON refund_requests (bank_account_id);
