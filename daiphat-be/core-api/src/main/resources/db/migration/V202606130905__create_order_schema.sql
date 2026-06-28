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
    status VARCHAR(20) NOT NULL,
    expected_pickup_at TIMESTAMP,
    cancelled_at TIMESTAMP,
    cancel_reason VARCHAR(500),
    actual_picked_up_at TIMESTAMP,
    picked_up_by UUID,
    created_at TIMESTAMP,
    updated_at TIMESTAMP,
    created_by VARCHAR(255),
    last_modified_by VARCHAR(255),
    CONSTRAINT uk_orders_order_code UNIQUE (order_code),
    CONSTRAINT fk_orders_user FOREIGN KEY (user_id) REFERENCES users (id),
    CONSTRAINT fk_orders_picked_up_by FOREIGN KEY (picked_up_by) REFERENCES users (id)
);

CREATE INDEX IF NOT EXISTS idx_orders_user_id ON orders(user_id);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_order_type ON orders(order_type);

-- Create order_details table
CREATE TABLE IF NOT EXISTS order_details (
    id BIGSERIAL PRIMARY KEY,
    order_id UUID NOT NULL,
    lottery_ticket_serial_id BIGINT NOT NULL,
    replaced_by_ticket_serial_id BIGINT,
    price DECIMAL(15, 0) NOT NULL,
    status VARCHAR(20) NOT NULL,
    created_at TIMESTAMP,
    updated_at TIMESTAMP,
    created_by VARCHAR(255),
    last_modified_by VARCHAR(255),
    CONSTRAINT uk_order_details_order_ticket_serial UNIQUE (order_id, lottery_ticket_serial_id),
    CONSTRAINT uk_order_details_replaced_by_ticket_serial UNIQUE (replaced_by_ticket_serial_id),
    CONSTRAINT fk_order_details_order FOREIGN KEY (order_id) REFERENCES orders (id),
    CONSTRAINT fk_order_details_ticket FOREIGN KEY (lottery_ticket_serial_id) REFERENCES lottery_ticket_serials (id),
    CONSTRAINT fk_order_details_replaced_ticket FOREIGN KEY (replaced_by_ticket_serial_id) REFERENCES lottery_ticket_serials (id)
);

CREATE INDEX IF NOT EXISTS idx_order_details_order_id ON order_details(order_id);
CREATE INDEX IF NOT EXISTS idx_order_details_status ON order_details(status);
CREATE INDEX IF NOT EXISTS idx_order_details_ticket_serial_id ON order_details(lottery_ticket_serial_id);

CREATE SEQUENCE IF NOT EXISTS payment_order_code_seq START WITH 5100000;

-- Create transactions table
CREATE TABLE IF NOT EXISTS transactions (
    id BIGSERIAL PRIMARY KEY,
    order_id UUID NOT NULL,
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
    note TEXT,
    type VARCHAR(20) NOT NULL,
    created_at TIMESTAMP,
    updated_at TIMESTAMP,
    created_by VARCHAR(255),
    last_modified_by VARCHAR(255),
    CONSTRAINT uk_transactions_gateway_order_code UNIQUE (gateway_order_code),
    CONSTRAINT uk_transactions_payment_ref UNIQUE (payment_ref),
    CONSTRAINT fk_transactions_order FOREIGN KEY (order_id) REFERENCES orders (id),
    CONSTRAINT fk_transactions_cod_collected_by FOREIGN KEY (cod_collected_by) REFERENCES users (id)
);

CREATE INDEX IF NOT EXISTS idx_transactions_order_id ON transactions(order_id);
CREATE INDEX IF NOT EXISTS idx_transactions_status ON transactions(status);
CREATE INDEX IF NOT EXISTS idx_transactions_type ON transactions(type);

-- Create order_refunds table
CREATE TABLE IF NOT EXISTS order_refunds (
    id BIGSERIAL PRIMARY KEY,
    order_detail_id BIGINT NOT NULL,
    refund_status VARCHAR(20) NOT NULL,
    refund_amount DECIMAL(15, 0),
    refund_reason VARCHAR(500),
    bank_bin VARCHAR(20),
    bank_name VARCHAR(100),
    bank_account_no VARCHAR(50),
    bank_account_name VARCHAR(150),
    refund_at TIMESTAMP,
    refund_approved_by UUID,
    created_at TIMESTAMP,
    updated_at TIMESTAMP,
    created_by VARCHAR(255),
    last_modified_by VARCHAR(255),
    CONSTRAINT fk_order_refunds_order_detail FOREIGN KEY (order_detail_id) REFERENCES order_details (id),
    CONSTRAINT fk_order_refunds_approved_by FOREIGN KEY (refund_approved_by) REFERENCES users (id)
);

CREATE INDEX IF NOT EXISTS idx_order_refunds_order_detail_id ON order_refunds(order_detail_id);
CREATE INDEX IF NOT EXISTS idx_order_refunds_status ON order_refunds(refund_status);
