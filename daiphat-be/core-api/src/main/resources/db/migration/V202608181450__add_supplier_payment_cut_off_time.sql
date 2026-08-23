-- Older local lottery_suppliers tables were created before payment_cut_off_time
-- existed on CREATE TABLE IF NOT EXISTS. Seed V202608181500 inserts that column.

ALTER TABLE lottery_suppliers
    ADD COLUMN IF NOT EXISTS payment_cut_off_time TIME DEFAULT '17:00:00';
