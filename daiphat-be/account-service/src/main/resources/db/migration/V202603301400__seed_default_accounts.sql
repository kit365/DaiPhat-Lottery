-- Seed Initial Accounts matching Keycloak data
-- Seed Admin (ID: 0e44453a-1c44-445c-aedf-49d5eecf8a5d)
INSERT INTO users (id, role_id, username, email, first_name, last_name, status, is_email_verified)
SELECT '0e44453a-1c44-445c-aedf-49d5eecf8a5d', id, 'admin', 'admin@daiphat.com', 'Super', 'Admin', 'ACTIVE', TRUE
FROM roles WHERE code = 'ADMIN'
ON CONFLICT (username) DO NOTHING;

-- Seed Standard Member (ID: 400fb13d-1ee8-40b3-920c-6ff52a0dd4ad)
INSERT INTO users (id, role_id, username, email, first_name, last_name, status, is_email_verified)
SELECT '400fb13d-1ee8-40b3-920c-6ff52a0dd4ad', id, 'user', 'user@daiphat.com', 'John', 'Doe', 'ACTIVE', TRUE
FROM roles WHERE code = 'ROLE_MEMBER'
ON CONFLICT (username) DO NOTHING;

-- Seed Staff Shipper (ID: 6e44453a-1c44-445c-aedf-49d5eecf8a5d)
INSERT INTO users (id, role_id, username, email, first_name, last_name, status, is_email_verified)
SELECT '6e44453a-1c44-445c-aedf-49d5eecf8a5d', id, 'shipper123', 'shipper@daiphat.com', 'Super', 'Shipper', 'ACTIVE', TRUE
FROM roles WHERE code = 'ROLE_STAFF_SHIPPER'
ON CONFLICT (username) DO NOTHING;

-- Seed Staff Manager (ID: 7e44453a-1c44-445c-aedf-49d5eecf8a5d)
INSERT INTO users (id, role_id, username, email, first_name, last_name, status, is_email_verified)
SELECT '7e44453a-1c44-445c-aedf-49d5eecf8a5d', id, 'manager123', 'manager@daiphat.com', 'Super', 'Manager', 'ACTIVE', TRUE
FROM roles WHERE code = 'ROLE_STAFF_MANAGER'
ON CONFLICT (username) DO NOTHING;
