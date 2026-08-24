-- Catch-up for local/dev DBs whose tables were created by an older
-- CREATE TABLE IF NOT EXISTS, then Flyway marked later "init" scripts applied
-- without adding columns that were only present in the CREATE body.
--
-- Verified against JPA @Column/@JoinColumn vs information_schema (2026-08-18):
-- after version v202608181600 the only remaining entity/DB gaps were
-- street_agent_profiles and support_tickets. ADD COLUMN IF NOT EXISTS is a no-op
-- on a clean migrate.

-- street_agent_profiles: V202606171300 CREATE TABLE IF NOT EXISTS skipped these
-- on tables that already existed without confidence / contract / ward fields.
-- V202608101200 aligned daily-cap drift but not this shape.
ALTER TABLE street_agent_profiles
    ADD COLUMN IF NOT EXISTS contact_ward VARCHAR(100),
    ADD COLUMN IF NOT EXISTS contract_code VARCHAR(100),
    ADD COLUMN IF NOT EXISTS contract_document_url VARCHAR(500),
    ADD COLUMN IF NOT EXISTS confidence_score NUMERIC(5, 2) NOT NULL DEFAULT 25,
    ADD COLUMN IF NOT EXISTS confidence_tier VARCHAR(20) NOT NULL DEFAULT 'NEW',
    ADD COLUMN IF NOT EXISTS confidence_calculated_at TIMESTAMP;

-- support_tickets: V202606231200 CREATE TABLE IF NOT EXISTS skipped this column.
ALTER TABLE support_tickets
    ADD COLUMN IF NOT EXISTS customer_last_viewed_at TIMESTAMP;

COMMENT ON COLUMN support_tickets.customer_last_viewed_at IS
    'Last time the customer opened this ticket (list/detail). Used to clear sidebar badge for REJECTED after view.';
