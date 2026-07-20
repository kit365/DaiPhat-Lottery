UPDATE ticket_categories SET priority = 1 WHERE code = 'ORDER_ISSUE';
UPDATE ticket_categories SET priority = 2 WHERE code = 'PAYMENT_SYNC_ERROR';
UPDATE ticket_categories SET priority = 3 WHERE code = 'ORDER_PREPARATION_DELAY';
UPDATE ticket_categories SET priority = 4 WHERE code = 'ORDER_PICKUP_ISSUE';
UPDATE ticket_categories SET priority = 5 WHERE code = 'ORDER_CANCELLED_OUT_OF_STOCK';
UPDATE ticket_categories SET priority = 6 WHERE code = 'ORDER_SERVICE_QUALITY';

UPDATE ticket_categories SET priority = 1 WHERE code = 'PAYMENT_ISSUE';
UPDATE ticket_categories SET priority = 2 WHERE code = 'REFUND_SLOW_PROCESSING';
UPDATE ticket_categories SET priority = 3 WHERE code = 'REFUND_PAID_ISSUE';
