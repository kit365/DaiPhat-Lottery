-- Add payment_cut_off_time column to lottery_suppliers
ALTER TABLE lottery_suppliers
    ADD COLUMN IF NOT EXISTS payment_cut_off_time TIME DEFAULT '17:00:00';
