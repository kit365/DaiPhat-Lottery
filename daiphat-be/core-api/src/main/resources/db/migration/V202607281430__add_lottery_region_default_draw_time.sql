ALTER TABLE lottery_regions
    ADD COLUMN IF NOT EXISTS default_draw_time TIME NOT NULL DEFAULT '16:15:00';

UPDATE lottery_regions
SET default_draw_time = '16:15:00'
WHERE code = 'MIEN_NAM';

UPDATE lottery_regions
SET default_draw_time = '17:15:00'
WHERE code = 'MIEN_TRUNG';

UPDATE lottery_regions
SET default_draw_time = '18:15:00'
WHERE code = 'MIEN_BAC';
