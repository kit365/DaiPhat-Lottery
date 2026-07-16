ALTER TABLE ticket_replacement_history
ADD COLUMN damaged_reason VARCHAR(255) NULL,
ADD COLUMN damaged_evidence_url VARCHAR(1024) NULL;
