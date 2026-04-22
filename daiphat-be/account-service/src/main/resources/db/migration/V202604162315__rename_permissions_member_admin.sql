-- Migration: Rename existing permission codes to match the new member and admin convention
-- This ensures that the Admin dashboard and permission mappings remain consistent.

-- 1. Rename 'user' module permissions to 'member'
UPDATE permissions 
SET code = REPLACE(code, 'user:', 'member:'),
    module = 'MEMBER_MANAGEMENT'
WHERE code LIKE 'user:%';

-- 2. Rename specifically seeded 'user:manage' to 'member:manage'
UPDATE permissions 
SET code = 'member:manage',
    module = 'MEMBER_MANAGEMENT'
WHERE code = 'user:manage';

-- 3. Rename 'account' module permissions to 'admin' (if any exist)
UPDATE permissions 
SET code = REPLACE(code, 'account:', 'admin:'),
    module = 'ADMIN_MANAGEMENT'
WHERE code LIKE 'account:%';

-- 4. Clean up any other weird naming inconsistencies
UPDATE permissions 
SET name = REPLACE(name, 'Người dùng', 'Thành viên'),
    description = REPLACE(description, 'người dùng', 'thành viên')
WHERE code LIKE 'member:%';

UPDATE permissions 
SET name = REPLACE(name, 'Tài khoản', 'Quản trị'),
    description = REPLACE(description, 'tài khoản', 'quản trị')
WHERE code LIKE 'admin:%';
