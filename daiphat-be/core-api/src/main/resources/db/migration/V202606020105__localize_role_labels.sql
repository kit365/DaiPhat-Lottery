UPDATE roles
SET name = CASE code
        WHEN 'ROLE_ADMIN' THEN 'Quản trị viên'
        WHEN 'ROLE_MEMBER' THEN 'Khách hàng'
        WHEN 'ROLE_STREET_AGENT' THEN 'Street Agent'
        WHEN 'ROLE_STAFF_OPERATOR' THEN 'Nhân viên vận hành'
        ELSE name
    END,
    description = CASE code
        WHEN 'ROLE_ADMIN' THEN 'Toàn quyền hệ thống'
        WHEN 'ROLE_MEMBER' THEN 'Tài khoản khách hàng sử dụng dịch vụ'
        WHEN 'ROLE_STREET_AGENT' THEN 'Hồ sơ đại lý bán dạo do vận hành quản lý'
        WHEN 'ROLE_STAFF_OPERATOR' THEN 'Quản lý vận hành xổ số'
        ELSE description
    END
WHERE code IN ('ROLE_ADMIN', 'ROLE_MEMBER', 'ROLE_STREET_AGENT', 'ROLE_STAFF_OPERATOR');
