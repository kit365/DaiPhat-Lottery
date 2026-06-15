-- serial_number chỉ còn trên lottery_ticket_serials
ALTER TABLE lottery_tickets DROP COLUMN IF EXISTS serial_number;

DROP INDEX IF EXISTS uq_lottery_tickets_serial_number;
DROP INDEX IF EXISTS uk_lottery_tickets_serial_number;
DROP INDEX IF EXISTS idx_lottery_tickets_serial_number;
