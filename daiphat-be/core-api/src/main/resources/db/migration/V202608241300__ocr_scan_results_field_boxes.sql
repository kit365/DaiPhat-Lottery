-- Per-field bounding boxes from ticket-vision (station, serial, numbers, …).

ALTER TABLE ocr_scan_results
    ADD COLUMN IF NOT EXISTS field_boxes JSONB;
