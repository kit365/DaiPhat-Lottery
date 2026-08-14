-- Local DBs that created allocation_batches before effective_handover_deadline_at
-- was added to V202608041100 still miss the column (CREATE TABLE IF NOT EXISTS).
-- Scheduler expireDrafts selects the full entity and fails without it.

ALTER TABLE allocation_batches
    ADD COLUMN IF NOT EXISTS effective_handover_deadline_at TIMESTAMP;
