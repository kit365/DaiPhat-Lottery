INSERT INTO public.lottery_regions (id, code, name, type, min_number, max_number, station_count, default_draw_time, created_at, updated_at, created_by, last_modified_by)
VALUES
    (1, 'MIEN_NAM', 'Miền Nam', 'TRADITIONAL', 0, 999999, 0, '16:15:00', '2026-08-29 04:47:09.546675', '2026-08-29 04:47:09.546675', 'SYSTEM', 'SYSTEM'),
    (2, 'MIEN_TRUNG', 'Miền Trung', 'TRADITIONAL', 0, 999999, 0, '17:15:00', '2026-08-29 04:47:09.546675', '2026-08-29 04:47:09.546675', 'SYSTEM', 'SYSTEM'),
    (3, 'MIEN_BAC', 'Miền Bắc', 'TRADITIONAL', 0, 99999, 0, '18:15:00', '2026-08-29 04:47:09.546675', '2026-08-29 04:47:09.546675', 'SYSTEM', 'SYSTEM')
ON CONFLICT (code) DO NOTHING;

SELECT setval(
    'public.lottery_regions_id_seq',
    GREATEST((SELECT COALESCE(MAX(id), 1) FROM public.lottery_regions), 3),
    true
);
