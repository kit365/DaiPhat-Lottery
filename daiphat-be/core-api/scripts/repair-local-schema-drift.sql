-- Local-only: align Postgres schema when Flyway history was repaired but tables
-- were created from an older revision of squashed/edited migrations.
--
-- Run:
--   docker exec -i daiphat-local-postgres-1 psql -U sa -d daiphat_core_db < daiphat-be/core-api/scripts/repair-local-schema-drift.sql

BEGIN;

-- street_agent_profiles (V202606171300 current shape)
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
        SET approved_daily_cap = COALESCE(approved_daily_cap, daily_ticket_cap)
        WHERE daily_ticket_cap IS NOT NULL;

        ALTER TABLE street_agent_profiles DROP COLUMN daily_ticket_cap;
    END IF;
END $$;

-- allocation_batches (V202608041100 columns missing when CREATE TABLE IF NOT EXISTS skipped)
ALTER TABLE allocation_batches
    ADD COLUMN IF NOT EXISTS requested_quantity INTEGER,
    ADD COLUMN IF NOT EXISTS reserve_count_snapshot INTEGER,
    ADD COLUMN IF NOT EXISTS reserve_percent_snapshot NUMERIC(6, 5),
    ADD COLUMN IF NOT EXISTS commission_rate_snapshot NUMERIC(6, 5),
    ADD COLUMN IF NOT EXISTS supplier_return_cutoff_snapshot TIME,
    ADD COLUMN IF NOT EXISTS return_buffer_minutes_snapshot INTEGER,
    ADD COLUMN IF NOT EXISTS deposit_applied_amount NUMERIC(18, 0),
    ADD COLUMN IF NOT EXISTS deposit_excess_refund_amount NUMERIC(18, 0);

CREATE UNIQUE INDEX IF NOT EXISTS allocation_batches_batch_code_key
    ON allocation_batches (batch_code);

-- return_batches (V202607311400 columns missing when CREATE TABLE IF NOT EXISTS skipped)
ALTER TABLE return_batches
    ADD COLUMN IF NOT EXISTS return_batch_type VARCHAR(30) NOT NULL DEFAULT 'SUPPLIER_RETURN',
    ADD COLUMN IF NOT EXISTS source_allocation_batch_id BIGINT;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.table_constraints
        WHERE constraint_name = 'fk_return_batches_source_allocation'
          AND table_name = 'return_batches'
    ) THEN
        ALTER TABLE return_batches
            ADD CONSTRAINT fk_return_batches_source_allocation
                FOREIGN KEY (source_allocation_batch_id) REFERENCES allocation_batches (id);
    END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_return_batches_type
    ON return_batches (return_batch_type);
CREATE INDEX IF NOT EXISTS idx_return_batches_source_allocation
    ON return_batches (source_allocation_batch_id);

COMMIT;

SELECT column_name
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'allocation_batches'
  AND column_name IN (
      'commission_rate_snapshot',
      'requested_quantity',
      'deposit_applied_amount'
  )
ORDER BY column_name;

SELECT column_name
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'street_agent_profiles'
  AND column_name IN ('approved_daily_cap', 'contract_max_daily_cap')
ORDER BY column_name;
