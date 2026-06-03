-- Seed static auth roles.
-- Do not put secret-bearing records here. User/admin credentials must be seeded by application code from env.

INSERT INTO roles (code, name, description)
VALUES
    ('ROLE_ADMIN', 'Quản trị viên', 'Toàn quyền hệ thống'),
    ('ROLE_MEMBER', 'Khách hàng', 'Tài khoản khách hàng sử dụng dịch vụ'),
    ('ROLE_STREET_AGENT', 'Street Agent', 'Hồ sơ đại lý bán dạo do vận hành quản lý'),
    ('ROLE_STAFF_OPERATOR', 'Nhân viên vận hành', 'Quản lý vận hành xổ số')
ON CONFLICT (code) DO UPDATE
SET name = EXCLUDED.name,
    description = EXCLUDED.description;
