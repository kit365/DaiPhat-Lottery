-- Local-only reset for V202608041100__vendor_allocation_schema.sql
-- Use when Flyway fails with checksum mismatch after editing that migration in place.
--
-- What this does:
-- 1) Drops all objects created by that migration (vendor allocation / report / settlement)
-- 2) Removes the Flyway history row so the migration can re-run with the new checksum
--
-- Does NOT drop street_agent_profiles (only clears the history row; user_id column is kept —
-- migration uses ADD COLUMN IF NOT EXISTS / DROP NOT NULL so re-apply is safe).
--
-- Run (Docker Compose Postgres on 5434):
--   docker exec -i daiphat-local-postgres-1 psql -U sa -d daiphat_core_db < daiphat-be/core-api/scripts/reset-vendor-flyway-local.sql
--
-- Then restart core-api with profile `local` (LocalFlywayConfig runs repair before migrate).

BEGIN;

-- Child → parent order (CASCADE as safety net)
DROP TABLE IF EXISTS agent_deposit_transactions CASCADE;
DROP TABLE IF EXISTS agent_settlements CASCADE;
DROP TABLE IF EXISTS daily_sales_report_details CASCADE;
DROP TABLE IF EXISTS daily_sales_reports CASCADE;
DROP TABLE IF EXISTS agent_ticket_stocks CASCADE;
DROP TABLE IF EXISTS allocation_batch_details CASCADE;
DROP TABLE IF EXISTS allocation_batches CASCADE;
DROP TABLE IF EXISTS lucky_pattern_configs CASCADE;

-- Indexes that may linger if created outside the tables above (IF EXISTS is fine)
DROP INDEX IF EXISTS uq_allocation_batch_one_open_per_profile;
DROP INDEX IF EXISTS uq_active_agent_ticket_stock;
DROP INDEX IF EXISTS uq_daily_sales_reports_agent_date;
DROP INDEX IF EXISTS uq_daily_sales_report_details_report_detail;
DROP INDEX IF EXISTS uq_agent_settlements_batch;
DROP INDEX IF EXISTS uq_allocation_detail_batch_station;
DROP INDEX IF EXISTS idx_street_agent_profiles_user_id;
DROP INDEX IF EXISTS idx_agent_settlements_agent_date;
DROP INDEX IF EXISTS idx_agent_settlements_batch;
DROP INDEX IF EXISTS idx_agent_deposit_tx_agent;
DROP INDEX IF EXISTS idx_agent_deposit_tx_allocation;

-- Allow Flyway to apply V202608041100 again with the current file checksum
DELETE FROM flyway_schema_history
WHERE version = '202608041100'
   OR script = 'V202608041100__vendor_allocation_schema.sql';

COMMIT;

-- Sanity check (should return 0 rows / null regclasses)
SELECT version, checksum, script
FROM flyway_schema_history
WHERE version = '202608041100';

SELECT
    to_regclass('public.allocation_batches') AS allocation_batches,
    to_regclass('public.lucky_pattern_configs') AS lucky_pattern_configs,
    to_regclass('public.agent_settlements') AS agent_settlements,
    to_regclass('public.daily_sales_reports') AS daily_sales_reports;
