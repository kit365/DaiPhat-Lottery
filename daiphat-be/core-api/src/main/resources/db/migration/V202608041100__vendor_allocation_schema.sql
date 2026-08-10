CREATE TABLE IF NOT EXISTS lucky_pattern_configs (
    id BIGSERIAL PRIMARY KEY,
    pattern_type VARCHAR(30) NOT NULL,
    exact_numbers TEXT,
    match_digits VARCHAR(100),
    match_position VARCHAR(20),
    name VARCHAR(100) NOT NULL,
    description TEXT,
    badge_label VARCHAR(50) NOT NULL,
    badge_color VARCHAR(30),
    priority INTEGER NOT NULL DEFAULT 0,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by VARCHAR(100) DEFAULT 'SYSTEM',
    last_modified_by VARCHAR(100) DEFAULT 'SYSTEM',
    deleted_at TIMESTAMP
);

-- Link vendor profile to auth user (unique). Phase 1 keeps nullable (0..1) because
-- create-flow may create profile before linking a user.
-- Do NOT auto SET NOT NULL here: empty table would incorrectly tighten the column.
-- Enforce NOT NULL later only after create-flow always sets user_id and data is backfilled.
ALTER TABLE street_agent_profiles
    ADD COLUMN IF NOT EXISTS user_id UUID UNIQUE REFERENCES users(id);

ALTER TABLE street_agent_profiles
    ALTER COLUMN user_id DROP NOT NULL;

CREATE INDEX IF NOT EXISTS idx_street_agent_profiles_user_id
    ON street_agent_profiles(user_id)
    WHERE user_id IS NOT NULL AND deleted_at IS NULL;

CREATE TABLE IF NOT EXISTS allocation_batches (
    id BIGSERIAL PRIMARY KEY,
    batch_code VARCHAR(50) NOT NULL UNIQUE,
    batch_type VARCHAR(30) NOT NULL,
    street_agent_profile_id BIGINT REFERENCES street_agent_profiles(id),
    business_date DATE NOT NULL,
    status VARCHAR(30) NOT NULL DEFAULT 'DRAFT',
    reservation_expires_at TIMESTAMP,
    requested_quantity INTEGER,
    reserve_count_snapshot INTEGER,
    reserve_percent_snapshot NUMERIC(6,5),
    face_value_snapshot NUMERIC(18,0), vendor_unit_price_snapshot NUMERIC(18,0),
    commission_rate_snapshot NUMERIC(6,5), deposit_rate_snapshot NUMERIC(6,5),
    late_policy_snapshot VARCHAR(30), return_cutoff_snapshot TIME,
    supplier_return_cutoff_snapshot TIME, return_buffer_minutes_snapshot INT,
    allocated_quantity INTEGER NOT NULL DEFAULT 0, returned_quantity INTEGER NOT NULL DEFAULT 0,
    sold_quantity INTEGER NOT NULL DEFAULT 0,
    deposit_required_amount NUMERIC(18,0), deposit_received_amount NUMERIC(18,0),
    gross_cash_remitted NUMERIC(18,0), commission_payable NUMERIC(18,0),
    deposit_refund_amount NUMERIC(18,0), deposit_forfeited_amount NUMERIC(18,0),
    deposit_applied_amount NUMERIC(18,0), deposit_excess_refund_amount NUMERIC(18,0),
    forced_purchase_amount NUMERIC(18,0), additional_amount_due NUMERIC(18,0),
    deposit_balance_before NUMERIC(18,0), deposit_balance_after NUMERIC(18,0),
    deposit_received_at TIMESTAMP, deposit_received_by UUID, settled_at TIMESTAMP, settled_by UUID,
    lucky_override_reason VARCHAR(500),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by VARCHAR(100) DEFAULT 'SYSTEM', last_modified_by VARCHAR(100) DEFAULT 'SYSTEM', deleted_at TIMESTAMP
);

-- return_batches is created in an earlier migration, while allocation_batches is created here.
-- Add the cross-aggregate FK/check only now to preserve Flyway dependency order.
ALTER TABLE return_batches
    ADD CONSTRAINT fk_return_batches_source_allocation_batch
        FOREIGN KEY (source_allocation_batch_id) REFERENCES allocation_batches(id);

ALTER TABLE return_batches
    ADD CONSTRAINT ck_return_batches_type_source CHECK (
        (return_batch_type = 'SUPPLIER_RETURN'
            AND lottery_supplier_id IS NOT NULL
            AND source_allocation_batch_id IS NULL)
        OR
        (return_batch_type = 'STREET_AGENT_RETURN'
            AND lottery_supplier_id IS NULL
            AND source_allocation_batch_id IS NOT NULL)
    );

CREATE TABLE IF NOT EXISTS allocation_batch_details (
    id BIGSERIAL PRIMARY KEY,
    allocation_batch_id BIGINT NOT NULL REFERENCES allocation_batches(id),
    lottery_station_id BIGINT NOT NULL REFERENCES lottery_stations(id),
    draw_date DATE NOT NULL,
    allocated_quantity INTEGER NOT NULL DEFAULT 0,
    returned_quantity INTEGER NOT NULL DEFAULT 0,
    sold_quantity INTEGER NOT NULL DEFAULT 0,
    eligible_quantity_snapshot INTEGER,
    agency_reserve_quantity_snapshot INTEGER,
    vendor_capacity_snapshot INTEGER,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by VARCHAR(100) DEFAULT 'SYSTEM', last_modified_by VARCHAR(100) DEFAULT 'SYSTEM', deleted_at TIMESTAMP
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_allocation_detail_batch_station
    ON allocation_batch_details(allocation_batch_id, lottery_station_id) WHERE deleted_at IS NULL;

-- Agent_Ticket_Stock (draw.io). Replaces removed allocation_batch_serials.
CREATE TABLE IF NOT EXISTS agent_ticket_stocks (
    id BIGSERIAL PRIMARY KEY,
    -- draw.io core
    allocation_batch_detail_id BIGINT NOT NULL REFERENCES allocation_batch_details(id),
    lottery_ticket_id BIGINT NOT NULL REFERENCES lottery_tickets(id),
    -- supplemental (update ERD)
    allocation_batch_id BIGINT NOT NULL REFERENCES allocation_batches(id),
    lottery_ticket_serial_id BIGINT NOT NULL REFERENCES lottery_ticket_serials(id),
    status VARCHAR(30) NOT NULL DEFAULT 'DRAFT_RESERVED',
    reserved_at TIMESTAMP,
    reserved_expires_at TIMESTAMP,
    returned_at TIMESTAMP,
    sold_at TIMESTAMP,
    vendor_return_batch_line_id BIGINT REFERENCES return_batch_lines(id),
    return_rejection_reason VARCHAR(500),
    lucky_override BOOLEAN NOT NULL DEFAULT FALSE,
    lucky_override_reason VARCHAR(500),
    lucky_override_by UUID,
    lucky_override_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by VARCHAR(100) DEFAULT 'SYSTEM',
    last_modified_by VARCHAR(100) DEFAULT 'SYSTEM',
    deleted_at TIMESTAMP
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_active_agent_ticket_stock
    ON agent_ticket_stocks (lottery_ticket_serial_id)
    WHERE deleted_at IS NULL
      AND status IN ('DRAFT_RESERVED', 'HANDED_OVER');

CREATE INDEX IF NOT EXISTS idx_agent_ticket_stock_detail ON agent_ticket_stocks(allocation_batch_detail_id);
CREATE INDEX IF NOT EXISTS idx_agent_ticket_stock_batch ON agent_ticket_stocks(allocation_batch_id);
CREATE INDEX IF NOT EXISTS idx_agent_ticket_stock_ticket ON agent_ticket_stocks(lottery_ticket_id);
CREATE INDEX IF NOT EXISTS idx_agent_ticket_stock_serial ON agent_ticket_stocks(lottery_ticket_serial_id);
CREATE INDEX IF NOT EXISTS idx_agent_ticket_stocks_vendor_return_line
    ON agent_ticket_stocks(vendor_return_batch_line_id);

ALTER TABLE lottery_ticket_serials
    ADD COLUMN IF NOT EXISTS reserved_by_allocation_batch_id BIGINT REFERENCES allocation_batches(id),
    ADD COLUMN IF NOT EXISTS is_lucky BOOLEAN NOT NULL DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS lucky_badges TEXT;

CREATE INDEX IF NOT EXISTS idx_allocation_batch_profile_date
    ON allocation_batches(street_agent_profile_id, business_date);
CREATE INDEX IF NOT EXISTS idx_allocation_batch_status ON allocation_batches(status);

-- At most one open allocation batch per street agent at a time.
CREATE UNIQUE INDEX IF NOT EXISTS uq_allocation_batch_one_open_per_profile
    ON allocation_batches(street_agent_profile_id)
    WHERE deleted_at IS NULL
      AND status IN ('DRAFT', 'CONFIRMED', 'RETURN_OPEN');

-- Skeleton: Daily_Sales_Report (before settlements that may FK report_id)
CREATE TABLE IF NOT EXISTS daily_sales_reports (
    id BIGSERIAL PRIMARY KEY,
    owner_type VARCHAR(30) NOT NULL DEFAULT 'STREET_AGENT',
    agent_id BIGINT REFERENCES street_agent_profiles(id),
    report_date DATE NOT NULL,
    total_sold_quantity INTEGER NOT NULL DEFAULT 0,
    total_remaining_quantity INTEGER NOT NULL DEFAULT 0,
    total_cash_collected NUMERIC(18,0) NOT NULL DEFAULT 0,
    status VARCHAR(30) NOT NULL DEFAULT 'OPEN',
    confirmed_by UUID REFERENCES users(id),
    confirmed_at TIMESTAMP,
    submitted_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by VARCHAR(100) DEFAULT 'SYSTEM',
    last_modified_by VARCHAR(100) DEFAULT 'SYSTEM',
    deleted_at TIMESTAMP,
    CONSTRAINT chk_daily_sales_report_owner CHECK (
        (owner_type = 'STREET_AGENT' AND agent_id IS NOT NULL)
        OR (owner_type = 'INTERNAL_COUNTER' AND agent_id IS NULL)
    )
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_daily_sales_reports_agent_date
    ON daily_sales_reports(agent_id, report_date)
    WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_daily_sales_reports_agent_date
    ON daily_sales_reports(agent_id, report_date);
CREATE UNIQUE INDEX IF NOT EXISTS uq_daily_sales_reports_internal_counter_date
    ON daily_sales_reports(report_date)
    WHERE owner_type = 'INTERNAL_COUNTER' AND deleted_at IS NULL;

-- Daily_Sales_Report_Detail — detail_id FK → allocation_batch_details
CREATE TABLE IF NOT EXISTS daily_sales_report_details (
    id BIGSERIAL PRIMARY KEY,
    report_id BIGINT NOT NULL REFERENCES daily_sales_reports(id),
    detail_id BIGINT NOT NULL REFERENCES allocation_batch_details(id),
    allocated_quantity INTEGER NOT NULL DEFAULT 0,
    sold_quantity INTEGER NOT NULL DEFAULT 0,
    remaining_quantity INTEGER NOT NULL DEFAULT 0,
    cash_collected NUMERIC(18,0) NOT NULL DEFAULT 0,
    source_type VARCHAR(30) NOT NULL DEFAULT 'VENDOR_ALLOCATION',
    order_detail_id BIGINT REFERENCES order_details(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by VARCHAR(100) DEFAULT 'SYSTEM',
    last_modified_by VARCHAR(100) DEFAULT 'SYSTEM',
    deleted_at TIMESTAMP
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_daily_sales_report_details_report_detail
    ON daily_sales_report_details(report_id, detail_id)
    WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_daily_sales_report_details_report
    ON daily_sales_report_details(report_id);

-- Agent_Settlement projection (1:1 with allocation batch)
CREATE TABLE IF NOT EXISTS agent_settlements (
    id BIGSERIAL PRIMARY KEY,
    agent_id BIGINT NOT NULL REFERENCES street_agent_profiles(id),
    settlement_date DATE NOT NULL,
    allocation_batch_id BIGINT NOT NULL REFERENCES allocation_batches(id),
    return_batch_id BIGINT REFERENCES return_batches(id),
    report_id BIGINT REFERENCES daily_sales_reports(id),
    returned_value NUMERIC(18,0),
    sold_value NUMERIC(18,0),
    commission_amount NUMERIC(18,0),
    deposit_amount NUMERIC(18,0),
    agent_receives NUMERIC(18,0),
    agent_pays NUMERIC(18,0),
    status VARCHAR(30) NOT NULL DEFAULT 'COMPLETED',
    paid_at TIMESTAMP,
    collected_by UUID REFERENCES users(id),
    collected_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by VARCHAR(100) DEFAULT 'SYSTEM',
    last_modified_by VARCHAR(100) DEFAULT 'SYSTEM',
    deleted_at TIMESTAMP
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_agent_settlements_batch
    ON agent_settlements(allocation_batch_id)
    WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_agent_settlements_agent_date
    ON agent_settlements(agent_id, settlement_date);
CREATE INDEX IF NOT EXISTS idx_agent_settlements_batch
    ON agent_settlements(allocation_batch_id);
CREATE INDEX IF NOT EXISTS idx_agent_settlements_return_batch
    ON agent_settlements(return_batch_id);

-- Skeleton: Agent_Deposit_Transaction
CREATE TABLE IF NOT EXISTS agent_deposit_transactions (
    id BIGSERIAL PRIMARY KEY,
    agent_id BIGINT NOT NULL REFERENCES street_agent_profiles(id),
    debt_date DATE NOT NULL,
    allocation_id BIGINT REFERENCES allocation_batches(id),
    required_amount NUMERIC(18,0),
    paid_amount NUMERIC(18,0),
    remaining_amount NUMERIC(18,0),
    returned_amount NUMERIC(18,0),
    status VARCHAR(30) NOT NULL DEFAULT 'pending',
    paid_at TIMESTAMP,
    collected_by UUID REFERENCES users(id),
    payment_method VARCHAR(50),
    transaction_type VARCHAR(30),
    balance_before NUMERIC(18,0),
    balance_after NUMERIC(18,0),
    reason VARCHAR(500),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by VARCHAR(100) DEFAULT 'SYSTEM',
    last_modified_by VARCHAR(100) DEFAULT 'SYSTEM',
    deleted_at TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_agent_deposit_tx_agent
    ON agent_deposit_transactions(agent_id);
CREATE INDEX IF NOT EXISTS idx_agent_deposit_tx_allocation
    ON agent_deposit_transactions(allocation_id);
