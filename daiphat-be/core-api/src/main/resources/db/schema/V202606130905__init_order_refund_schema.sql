-- Create orders table
CREATE TABLE IF NOT EXISTS orders (
    id UUID PRIMARY KEY,
    user_id UUID,
    name VARCHAR(100) NOT NULL,
    phone VARCHAR(20),
    email VARCHAR(100),
    order_code VARCHAR(50) NOT NULL,
    order_type VARCHAR(20) NOT NULL,
    receive_type VARCHAR(30) NOT NULL,
    total_amount DECIMAL(15, 0) NOT NULL,
    status VARCHAR(40) NOT NULL,
    expected_pickup_at TIMESTAMP,
    cancelled_at TIMESTAMP,
    cancel_reason VARCHAR(500),
    cancel_type VARCHAR(50),
    actual_picked_up_at TIMESTAMP,
    picked_up_by UUID,
    handover_evidence_url VARCHAR(500),
    payment_complaint_evidence_url VARCHAR(500),
    payment_complaint_submitted_at TIMESTAMP,
    payment_complaint_resolved_at TIMESTAMP,
    payment_complaint_resolved_by UUID,
    payment_complaint_resolution_reason VARCHAR(500),
    created_at TIMESTAMP,
    updated_at TIMESTAMP,
    created_by VARCHAR(255),
    last_modified_by VARCHAR(255),
    CONSTRAINT uk_orders_order_code UNIQUE (order_code),
    CONSTRAINT fk_orders_user FOREIGN KEY (user_id) REFERENCES users (id),
    CONSTRAINT fk_orders_picked_up_by FOREIGN KEY (picked_up_by) REFERENCES users (id),
    CONSTRAINT fk_orders_payment_complaint_resolved_by
        FOREIGN KEY (payment_complaint_resolved_by) REFERENCES users (id)
);

CREATE INDEX IF NOT EXISTS idx_orders_user_id ON orders(user_id);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_order_type ON orders(order_type);
CREATE INDEX IF NOT EXISTS idx_orders_payment_complaint_pending
    ON orders (payment_complaint_submitted_at)
    WHERE status = 'PAYMENT_COMPLAINT_PENDING';

-- Create order_details table
CREATE TABLE IF NOT EXISTS order_details (
    id BIGSERIAL PRIMARY KEY,
    order_id UUID NOT NULL,
    lottery_ticket_id BIGINT,
    lottery_ticket_serial_id BIGINT,
    replaced_by_ticket_serial_id BIGINT,
    refund_request_id BIGINT,
    quantity INTEGER NOT NULL DEFAULT 1,
    price DECIMAL(15, 0) NOT NULL,
    status VARCHAR(40) NOT NULL,
    rejection_reason VARCHAR(500),
    rejected_at TIMESTAMP,
    rejected_by UUID,
    handed_over_at TIMESTAMP,
    handed_over_by UUID,
    created_at TIMESTAMP,
    updated_at TIMESTAMP,
    created_by VARCHAR(255),
    last_modified_by VARCHAR(255),
    CONSTRAINT uk_order_details_order_ticket_serial UNIQUE (order_id, lottery_ticket_serial_id),
    CONSTRAINT uk_order_details_replaced_by_ticket_serial UNIQUE (replaced_by_ticket_serial_id),
    CONSTRAINT fk_order_details_order FOREIGN KEY (order_id) REFERENCES orders (id),
    CONSTRAINT fk_order_details_lottery_ticket FOREIGN KEY (lottery_ticket_id) REFERENCES lottery_tickets (id),
    CONSTRAINT fk_order_details_ticket FOREIGN KEY (lottery_ticket_serial_id) REFERENCES lottery_ticket_serials (id),
    CONSTRAINT fk_order_details_replaced_ticket FOREIGN KEY (replaced_by_ticket_serial_id) REFERENCES lottery_ticket_serials (id)
);

CREATE INDEX IF NOT EXISTS idx_order_details_order_id ON order_details(order_id);
CREATE INDEX IF NOT EXISTS idx_order_details_status ON order_details(status);
CREATE INDEX IF NOT EXISTS idx_order_details_ticket_serial_id ON order_details(lottery_ticket_serial_id);
CREATE INDEX IF NOT EXISTS idx_order_details_lottery_ticket_id ON order_details(lottery_ticket_id);
CREATE INDEX IF NOT EXISTS idx_order_details_refund_request_id ON order_details(refund_request_id);

COMMENT ON COLUMN orders.handover_evidence_url IS
    'Photo or receipt captured by staff when at least one paid ticket is handed to the customer.';

COMMENT ON COLUMN orders.payment_complaint_evidence_url IS
    'Image proof submitted by customer after SYSTEM_PAYMENT_TIMEOUT cancellation.';

COMMENT ON COLUMN orders.payment_complaint_resolution_reason IS
    'Mandatory staff reason when a payment-timeout complaint is rejected.';

COMMENT ON COLUMN order_details.rejection_reason IS
    'Mandatory staff reason when a paid ticket is rejected by the customer at handover.';

CREATE SEQUENCE IF NOT EXISTS payment_order_code_seq START WITH 5100000;

-- Create transactions table
CREATE TABLE IF NOT EXISTS transactions (
    id BIGSERIAL PRIMARY KEY,
    order_id UUID,
    refund_request_id BIGINT,
    amount DECIMAL(15, 0) NOT NULL,
    gateway VARCHAR(30),
    gateway_order_code BIGINT,
    payment_ref VARCHAR(100),
    status VARCHAR(20) NOT NULL,
    paid_at TIMESTAMP,
    cancelled_at TIMESTAMP,
    failure_reason VARCHAR(500),
    cod_collected_at TIMESTAMP,
    cod_collected_by UUID,
    payment_evidence_url VARCHAR(500),
    payment_by UUID,
    note TEXT,
    type VARCHAR(20) NOT NULL,
    created_at TIMESTAMP,
    updated_at TIMESTAMP,
    created_by VARCHAR(255),
    last_modified_by VARCHAR(255),
    CONSTRAINT uk_transactions_gateway_order_code UNIQUE (gateway_order_code),
    CONSTRAINT uk_transactions_payment_ref UNIQUE (payment_ref),
    CONSTRAINT fk_transactions_order FOREIGN KEY (order_id) REFERENCES orders (id),
    CONSTRAINT fk_transactions_cod_collected_by FOREIGN KEY (cod_collected_by) REFERENCES users (id),
    CONSTRAINT fk_transactions_payment_by FOREIGN KEY (payment_by) REFERENCES users (id)
);

CREATE INDEX IF NOT EXISTS idx_transactions_order_id ON transactions(order_id);
CREATE INDEX IF NOT EXISTS idx_transactions_status ON transactions(status);
CREATE INDEX IF NOT EXISTS idx_transactions_type ON transactions(type);
CREATE INDEX IF NOT EXISTS idx_transactions_refund_request_id ON transactions(refund_request_id);
CREATE INDEX IF NOT EXISTS idx_transactions_order_id_type ON transactions(order_id, type);

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
    requested_by UUID NOT NULL,
    request_role VARCHAR(20) NOT NULL,
    refund_amount DECIMAL(15, 0) NOT NULL,
    refund_reason VARCHAR(500),
    fund_source VARCHAR(30) NOT NULL DEFAULT 'COMPANY_FUND',
    reimburse_status VARCHAR(20) NOT NULL DEFAULT 'NONE',
    attempt_number INT NOT NULL DEFAULT 1,
    transfer_note VARCHAR(500),
    bank_account_id BIGINT,
    status VARCHAR(20) NOT NULL,
    reviewed_by UUID,
    reviewed_at TIMESTAMP,
    retry_count INT NOT NULL DEFAULT 0,
    operator_note TEXT,
    created_at TIMESTAMP,
    updated_at TIMESTAMP,
    created_by VARCHAR(255),
    last_modified_by VARCHAR(255),
    CONSTRAINT fk_refund_requests_requested_by FOREIGN KEY (requested_by) REFERENCES users (id),
    CONSTRAINT fk_refund_requests_bank_account FOREIGN KEY (bank_account_id) REFERENCES user_bank_accounts (id),
    CONSTRAINT fk_refund_requests_reviewed_by FOREIGN KEY (reviewed_by) REFERENCES users (id)
);

CREATE INDEX IF NOT EXISTS idx_refund_requests_requested_by ON refund_requests (requested_by);
CREATE INDEX IF NOT EXISTS idx_refund_requests_status ON refund_requests (status);
CREATE INDEX IF NOT EXISTS idx_refund_requests_bank_account_id ON refund_requests (bank_account_id);

-- These relationships are declared here because the child tables are created
-- before refund_requests in the migration sequence.
ALTER TABLE order_details
    ADD CONSTRAINT fk_order_details_refund_request
        FOREIGN KEY (refund_request_id) REFERENCES refund_requests (id);

ALTER TABLE transactions
    ADD CONSTRAINT fk_transactions_refund_request
        FOREIGN KEY (refund_request_id) REFERENCES refund_requests (id);
