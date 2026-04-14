-- Migration: Add Permission System and Role-Permission mapping
-- Module: Account Service

CREATE TABLE IF NOT EXISTS permissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code VARCHAR(50) NOT NULL UNIQUE,
    name VARCHAR(100) NOT NULL,
    description VARCHAR(255),
    module VARCHAR(50) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by VARCHAR(100) DEFAULT 'SYSTEM',
    last_modified_by VARCHAR(100) DEFAULT 'SYSTEM'
);

CREATE TABLE IF NOT EXISTS role_permissions (
    role_id UUID NOT NULL,
    permission_id UUID NOT NULL,
    PRIMARY KEY (role_id, permission_id),
    CONSTRAINT fk_role_permissions_role FOREIGN KEY (role_id) REFERENCES roles (id) ON DELETE CASCADE,
    CONSTRAINT fk_role_permissions_permission FOREIGN KEY (permission_id) REFERENCES permissions (id) ON DELETE CASCADE
);

-- Seed Initial Permissions
INSERT INTO permissions (code, name, description, module) VALUES 
('dashboard:view', 'Xem Dashboard', 'Quyền xem biểu đồ và thống kê tổng quan', 'DASHBOARD'),
('user:manage', 'Quản lý người dùng', 'Quyền xem, thêm, sửa, xóa người dùng', 'USER_MANAGEMENT'),
('article:manage', 'Quản lý bài viết', 'Quyền quản lý tin tức và bài viết', 'POST_MANAGEMENT'),
('role:manage', 'Quản lý phân quyền', 'Quyền chỉnh sửa vai trò và quyền hạn hệ thống', 'ROLE_MANAGEMENT')
ON CONFLICT (code) DO NOTHING;

-- Grant all seeded permissions to ROLE_ADMIN
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id 
FROM roles r, permissions p
WHERE r.code = 'ROLE_ADMIN'
AND p.code IN ('dashboard:view', 'user:manage', 'article:manage', 'role:manage')
ON CONFLICT DO NOTHING;
