-- Local/dev DBs may have older street-agent tables created before V202606171300 /
-- V202608041100 reached their current shape. Those migrations use CREATE TABLE IF NOT EXISTS,
-- so Flyway can mark them applied while columns remain missing. Align columns to entities.

-- street_agent_profiles: rename legacy daily_ticket_cap → approved/contract caps
ALTER TABLE street_agent_profiles
    ADD COLUMN IF NOT EXISTS contract_max_daily_cap INTEGER,
    ADD COLUMN IF NOT EXISTS approved_daily_cap INTEGER,
    ADD COLUMN IF NOT EXISTS daily_cap_adjustment_reason VARCHAR(500),
    ADD COLUMN IF NOT EXISTS daily_cap_adjusted_by UUID REFERENCES users(id),
    ADD COLUMN IF NOT EXISTS daily_cap_adjusted_at TIMESTAMP;

DO $$
BEGIN
    IF EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'street_agent_profiles'
          AND column_name = 'daily_ticket_cap'
    ) THEN
        UPDATE street_agent_profiles
        SET approved_daily_cap = COALESCE(approved_daily_cap, daily_ticket_cap),
            contract_max_daily_cap = COALESCE(contract_max_daily_cap, daily_ticket_cap)
        WHERE daily_ticket_cap IS NOT NULL;

        ALTER TABLE street_agent_profiles
            DROP CONSTRAINT IF EXISTS ck_street_agent_profiles_daily_ticket_cap;

        ALTER TABLE street_agent_profiles
            DROP COLUMN daily_ticket_cap;
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'ck_street_agent_profiles_daily_caps'
    ) THEN
        ALTER TABLE street_agent_profiles
            ADD CONSTRAINT ck_street_agent_profiles_daily_caps CHECK (
                (contract_max_daily_cap IS NULL AND approved_daily_cap IS NULL)
                OR (contract_max_daily_cap > 0 AND approved_daily_cap > 0
                    AND approved_daily_cap <= contract_max_daily_cap)
            );
    END IF;
END $$;

-- allocation_batches: columns added to V202608041100 after the table already existed
ALTER TABLE allocation_batches
    ADD COLUMN IF NOT EXISTS requested_quantity INTEGER,
    ADD COLUMN IF NOT EXISTS reserve_count_snapshot INTEGER,
    ADD COLUMN IF NOT EXISTS reserve_percent_snapshot NUMERIC(6, 5),
    ADD COLUMN IF NOT EXISTS commission_rate_snapshot NUMERIC(6, 5),
    ADD COLUMN IF NOT EXISTS supplier_return_cutoff_snapshot TIME,
    ADD COLUMN IF NOT EXISTS return_buffer_minutes_snapshot INTEGER,
    ADD COLUMN IF NOT EXISTS deposit_applied_amount NUMERIC(18, 0),
    ADD COLUMN IF NOT EXISTS deposit_excess_refund_amount NUMERIC(18, 0);

-- allocation_batch_details: snapshot fields from current V202608041100
ALTER TABLE allocation_batch_details
    ADD COLUMN IF NOT EXISTS eligible_quantity_snapshot INTEGER,
    ADD COLUMN IF NOT EXISTS agency_reserve_quantity_snapshot INTEGER,
    ADD COLUMN IF NOT EXISTS vendor_capacity_snapshot INTEGER;

-- agent_ticket_stocks: return linkage fields
ALTER TABLE agent_ticket_stocks
    ADD COLUMN IF NOT EXISTS vendor_return_batch_line_id BIGINT REFERENCES return_batch_lines(id),
    ADD COLUMN IF NOT EXISTS return_rejection_reason VARCHAR(500);

CREATE INDEX IF NOT EXISTS idx_agent_ticket_stocks_vendor_return_line
    ON agent_ticket_stocks(vendor_return_batch_line_id);

-- daily_sales_reports / details / settlements / deposit txs: later columns from V202608041100
ALTER TABLE daily_sales_reports
    ADD COLUMN IF NOT EXISTS owner_type VARCHAR(30) NOT NULL DEFAULT 'STREET_AGENT';

ALTER TABLE daily_sales_report_details
    ADD COLUMN IF NOT EXISTS source_type VARCHAR(30) NOT NULL DEFAULT 'VENDOR_ALLOCATION',
    ADD COLUMN IF NOT EXISTS order_detail_id BIGINT REFERENCES order_details(id);

ALTER TABLE agent_settlements
    ADD COLUMN IF NOT EXISTS return_batch_id BIGINT REFERENCES return_batches(id);

CREATE INDEX IF NOT EXISTS idx_agent_settlements_return_batch
    ON agent_settlements(return_batch_id);

-- Legacy local DBs may still have agent_deposit_transactions. Current schema
-- records vendor cash on the shared transactions ledger (V202608041100), so
-- skip this ALTER when the old table was never created.
DO $$
BEGIN
    IF EXISTS (
        SELECT 1
        FROM information_schema.tables
        WHERE table_schema = 'public'
          AND table_name = 'agent_deposit_transactions'
    ) THEN
        ALTER TABLE agent_deposit_transactions
            ADD COLUMN IF NOT EXISTS transaction_type VARCHAR(30),
            ADD COLUMN IF NOT EXISTS balance_before NUMERIC(18, 0),
            ADD COLUMN IF NOT EXISTS balance_after NUMERIC(18, 0),
            ADD COLUMN IF NOT EXISTS reason VARCHAR(500);
    END IF;
END $$;
