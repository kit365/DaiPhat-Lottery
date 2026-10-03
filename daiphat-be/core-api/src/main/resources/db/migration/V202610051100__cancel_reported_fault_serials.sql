-- Incident reports are terminal for a physical serial. Align legacy rows that
-- recorded only the condition while incorrectly leaving the serial IN_STOCK.
UPDATE lottery_ticket_serials
SET status = 'CANCELLED',
    updated_at = CURRENT_TIMESTAMP,
    last_modified_by = 'SYSTEM'
WHERE ticket_condition IN ('DAMAGED', 'LOST', 'VOIDED')
  AND status <> 'CANCELLED'
  AND deleted_at IS NULL;
