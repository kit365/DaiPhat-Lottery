-- Backfill for DBs that applied V202605312230 before auth_version was added to that script.
ALTER TABLE users
    ADD COLUMN IF NOT EXISTS auth_version BIGINT NOT NULL DEFAULT 0;
