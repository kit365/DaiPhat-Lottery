-- Remove auto-seeded default supplier (if present) and relax NOT NULL so
-- historical import batches can exist without a supplier reference.

UPDATE import_batches ib
SET supplier_id = NULL
FROM lottery_suppliers ls
WHERE ib.supplier_id = ls.id
  AND ls.code = 'DEFAULT_SUPPLIER';

DELETE FROM lottery_suppliers
WHERE code = 'DEFAULT_SUPPLIER';
