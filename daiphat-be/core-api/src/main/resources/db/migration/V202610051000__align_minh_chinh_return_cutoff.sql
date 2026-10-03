-- The official Minh Chinh supplier returns tickets at 14:30 on the draw date.
-- Older demo data stored 02:30, which made same-day intake close shortly after
-- midnight and incorrectly disabled file/OCR import for otherwise valid files.
UPDATE lottery_suppliers
SET return_cut_off_time = TIME '14:30:00',
    updated_at = CURRENT_TIMESTAMP,
    last_modified_by = 'SYSTEM'
WHERE UPPER(code) = 'MINH_CHINH'
  AND deleted_at IS NULL
  AND return_cut_off_time <> TIME '14:30:00';
