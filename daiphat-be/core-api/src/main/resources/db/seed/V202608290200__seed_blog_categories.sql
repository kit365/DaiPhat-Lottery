INSERT INTO public.blog_category (id, parent_id, name, slug, description, display_order, is_deleted, status, avatar, created_at, updated_at, created_by, last_modified_by, deleted_at)
VALUES
    (1, NULL, 'Kinh nghiệm chơi số', 'kinh-nghiem-choi-so', 'Chia sẻ kinh nghiệm, bí quyết chơi số hiệu quả', 1, false, 'ACTIVE', 'fa-solid fa-lightbulb', '2026-08-29 04:47:09.54586', '2026-08-29 04:47:09.54586', 'SYSTEM', 'SYSTEM', NULL),
    (2, NULL, 'Soi cầu', 'soi-cau', 'Phân tích soi cầu kết quả hàng ngày', 2, false, 'ACTIVE', 'fa-solid fa-magnifying-glass-chart', '2026-08-29 04:47:09.54586', '2026-08-29 04:47:09.54586', 'SYSTEM', 'SYSTEM', NULL),
    (3, NULL, 'Tin tức', 'tin-tuc', 'Tin tức sự kiện, tin tức xổ số mới nhất', 3, false, 'ACTIVE', 'fa-regular fa-newspaper', '2026-08-29 04:47:09.54586', '2026-08-29 04:47:09.54586', 'SYSTEM', 'SYSTEM', NULL),
    (4, NULL, 'Bài viết nổi bật', 'bai-viet-noi-bat', 'Tổng hợp các bài viết nổi bật được nhiều người đọc', 4, false, 'ACTIVE', 'fa-solid fa-star', '2026-08-29 04:47:09.54586', '2026-08-29 04:47:09.54586', 'SYSTEM', 'SYSTEM', NULL)
ON CONFLICT (slug) DO NOTHING;

SELECT setval(
    'public.blog_category_id_seq',
    GREATEST((SELECT COALESCE(MAX(id), 1) FROM public.blog_category), 4),
    true
);
