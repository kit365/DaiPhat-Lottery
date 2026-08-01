ALTER TABLE conversations
    ADD COLUMN IF NOT EXISTS closed_at TIMESTAMP;

UPDATE conversations
SET closed_at = updated_at
WHERE status = 'CLOSED'
  AND closed_at IS NULL
  AND deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_conversations_customer_spam_closed_at
    ON conversations (customer_id, close_reason, closed_at DESC)
    WHERE close_reason = 'SPAM' AND deleted_at IS NULL;
