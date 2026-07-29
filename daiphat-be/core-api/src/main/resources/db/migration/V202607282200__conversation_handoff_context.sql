-- Persist handoff context so staff sees a short AI→human summary instead of raw bot history.
ALTER TABLE conversations
    ADD COLUMN IF NOT EXISTS escalation_reason VARCHAR(40),
    ADD COLUMN IF NOT EXISTS escalated_at TIMESTAMP,
    ADD COLUMN IF NOT EXISTS handoff_summary TEXT;

CREATE INDEX IF NOT EXISTS idx_conversations_escalated_at
    ON conversations (escalated_at DESC)
    WHERE escalated_at IS NOT NULL;
