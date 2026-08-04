ALTER TABLE support_tickets
    ADD COLUMN IF NOT EXISTS customer_last_viewed_at TIMESTAMP;

COMMENT ON COLUMN support_tickets.customer_last_viewed_at IS
    'Last time the customer opened this ticket (list/detail). Used to clear sidebar badge for REJECTED after view.';
