ALTER TABLE support_tickets
    ADD COLUMN IF NOT EXISTS resolved_reason_id BIGINT,
    ADD COLUMN IF NOT EXISTS rejected_reason_id BIGINT;

ALTER TABLE support_tickets
    DROP CONSTRAINT IF EXISTS fk_support_tickets_resolved_reason,
    DROP CONSTRAINT IF EXISTS fk_support_tickets_rejected_reason;

ALTER TABLE support_tickets
    ADD CONSTRAINT fk_support_tickets_resolved_reason
        FOREIGN KEY (resolved_reason_id) REFERENCES support_ticket_comments (id),
    ADD CONSTRAINT fk_support_tickets_rejected_reason
        FOREIGN KEY (rejected_reason_id) REFERENCES support_ticket_comments (id);

CREATE INDEX IF NOT EXISTS idx_support_tickets_status_resolved_at
    ON support_tickets (status, resolved_at);
