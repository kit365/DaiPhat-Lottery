-- One live assignment per operator (ACTIVE / WAITING_FOR_CUSTOMER).
-- Keep the most recently active thread; return extras to the staff queue.

WITH ranked AS (
    SELECT
        id,
        ROW_NUMBER() OVER (
            PARTITION BY assigned_operator_id
            ORDER BY last_message_at DESC NULLS LAST, updated_at DESC NULLS LAST, id DESC
        ) AS rn
    FROM conversations
    WHERE deleted_at IS NULL
      AND assigned_operator_id IS NOT NULL
      AND status IN ('ACTIVE', 'WAITING_FOR_CUSTOMER')
)
UPDATE conversations c
SET assigned_operator_id = NULL,
    status = 'WAITING_FOR_OPERATOR',
    updated_at = NOW()
FROM ranked r
WHERE c.id = r.id
  AND r.rn > 1;

CREATE UNIQUE INDEX IF NOT EXISTS uk_conversations_one_live_operator
    ON conversations (assigned_operator_id)
    WHERE assigned_operator_id IS NOT NULL
      AND deleted_at IS NULL
      AND status IN ('ACTIVE', 'WAITING_FOR_CUSTOMER');
