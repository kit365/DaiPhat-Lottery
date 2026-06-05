INSERT INTO blog_category (name, slug, description, display_order, status, avatar) VALUES
('Kinh nghiệm chơi số', 'kinh-nghiem-choi-so', 'Chia sẻ kinh nghiệm, bí quyết chơi số hiệu quả', 1, 'ACTIVE', 'fa-solid fa-lightbulb'),
('Soi cầu', 'soi-cau', 'Phân tích soi cầu kết quả hàng ngày', 2, 'ACTIVE', 'fa-solid fa-magnifying-glass-chart'),
('Tin tức', 'tin-tuc', 'Tin tức sự kiện, tin tức xổ số mới nhất', 3, 'ACTIVE', 'fa-regular fa-newspaper'),
('Bài viết nổi bật', 'bai-viet-noi-bat', 'Tổng hợp các bài viết nổi bật được nhiều người đọc', 4, 'ACTIVE', 'fa-solid fa-star')
ON CONFLICT (slug) DO NOTHING;
