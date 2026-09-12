-- Persist original uploaded ticket image so Admin can reopen unfinished OCR reviews.
ALTER TABLE ocr_scan_results
    ADD COLUMN IF NOT EXISTS source_image_url VARCHAR(500);
