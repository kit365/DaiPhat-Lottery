-- Move VOIDED from lifecycle status onto ticket_condition.
UPDATE lottery_ticket_serials
SET ticket_condition = 'VOIDED',
    status = 'IN_STOCK'
WHERE status = 'VOIDED';
