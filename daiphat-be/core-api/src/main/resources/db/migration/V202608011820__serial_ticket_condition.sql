-- Physical condition of a serial (GOOD / DAMAGED / LOST), separate from lifecycle status.
ALTER TABLE lottery_ticket_serials
    ADD COLUMN IF NOT EXISTS ticket_condition VARCHAR(20) NOT NULL DEFAULT 'GOOD';

-- Move former DAMAGED / LOST statuses onto ticket_condition; restore lifecycle to IN_STOCK.
UPDATE lottery_ticket_serials
SET ticket_condition = status,
    status = 'IN_STOCK'
WHERE status IN ('DAMAGED', 'LOST');

-- Return state is derived from return_batch_line_id + ReturnBatch; clear obsolete statuses.
UPDATE lottery_ticket_serials
SET status = 'IN_STOCK'
WHERE status IN ('PENDING_RETURN', 'RETURNED');

CREATE INDEX IF NOT EXISTS idx_lottery_ticket_serials_sellable
    ON lottery_ticket_serials (status, ticket_condition, return_batch_line_id)
    WHERE deleted_at IS NULL;
