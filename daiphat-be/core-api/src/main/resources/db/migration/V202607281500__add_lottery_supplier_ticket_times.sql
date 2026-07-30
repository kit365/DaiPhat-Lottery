ALTER TABLE lottery_suppliers
    ADD COLUMN IF NOT EXISTS ticket_import_time TIME NOT NULL DEFAULT '08:00:00';

ALTER TABLE lottery_suppliers
    ADD COLUMN IF NOT EXISTS ticket_return_time TIME NOT NULL DEFAULT '14:30:00';

UPDATE lottery_suppliers
SET ticket_import_time = '08:00:00'
WHERE ticket_import_time IS NULL;

UPDATE lottery_suppliers
SET ticket_return_time = '14:30:00'
WHERE ticket_return_time IS NULL;
