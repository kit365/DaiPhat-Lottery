ALTER TABLE street_agent_profiles
    ADD COLUMN IF NOT EXISTS contact_ward VARCHAR(100);
