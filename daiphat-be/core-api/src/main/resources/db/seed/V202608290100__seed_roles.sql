INSERT INTO public.roles (id, code, name, description, created_at, updated_at, created_by, last_modified_by, deleted_at)
VALUES
    ('d259a379-87e6-4bdf-baa8-fdc65c8cf53e', 'ROLE_ADMIN', 'Quản trị viên', 'Toàn quyền hệ thống', '2026-08-29 04:47:09.544217', '2026-08-29 04:47:09.544217', 'SYSTEM', 'SYSTEM', NULL),
    ('06fb8a49-d38b-4283-9117-00d6142291e2', 'ROLE_MEMBER', 'Khách hàng', 'Tài khoản khách hàng sử dụng dịch vụ', '2026-08-29 04:47:09.544217', '2026-08-29 04:47:09.544217', 'SYSTEM', 'SYSTEM', NULL),
    ('4e64acbe-9a05-4350-bbc5-ae6fc4e90afb', 'ROLE_STREET_AGENT', 'Street Agent', 'Hồ sơ đại lý bán dạo do vận hành quản lý', '2026-08-29 04:47:09.544217', '2026-08-29 04:47:09.544217', 'SYSTEM', 'SYSTEM', NULL),
    ('70f9000e-3881-4b73-8639-61df8ed0a00b', 'ROLE_STAFF_OPERATOR', 'Nhân viên vận hành', 'Quản lý vận hành xổ số', '2026-08-29 04:47:09.544217', '2026-08-29 04:47:09.544217', 'SYSTEM', 'SYSTEM', NULL)
ON CONFLICT (code) DO NOTHING;
