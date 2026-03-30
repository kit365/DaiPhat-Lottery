-- Seed Initial Accounts matching Keycloak data
-- Seed Admin (ID: 0e44453a-1c44-445c-aedf-49d5eecf8a5d)
INSERT INTO users (id, role_id, username, email, first_name, last_name, status, is_email_verified)
SELECT '0e44453a-1c44-445c-aedf-49d5eecf8a5d', id, 'admin', 'admin@smartlotto.com', 'Super', 'Admin', 'ACTIVE', TRUE
FROM roles WHERE code = 'ADMIN'
ON CONFLICT (username) DO NOTHING;

-- Seed Standard User (ID: 400fb13d-1ee8-40b3-920c-6ff52a0dd4ad)
INSERT INTO users (id, role_id, username, email, first_name, last_name, status, is_email_verified)
SELECT '400fb13d-1ee8-40b3-920c-6ff52a0dd4ad', id, 'user', 'user@smartlotto.com', 'John', 'Doe', 'ACTIVE', TRUE
FROM roles WHERE code = 'USER'
ON CONFLICT (username) DO NOTHING;
