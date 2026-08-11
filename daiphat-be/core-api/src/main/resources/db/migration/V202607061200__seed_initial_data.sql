-- Initial reference data. This runs only after all feature schemas are created.

-- V202605312230__init_auth_schema.sql

INSERT INTO roles (code, name, description)
VALUES
    ('ROLE_ADMIN', 'Quản trị viên', 'Toàn quyền hệ thống'),
    ('ROLE_MEMBER', 'Khách hàng', 'Tài khoản khách hàng sử dụng dịch vụ'),
    ('ROLE_STREET_AGENT', 'Street Agent', 'Hồ sơ đại lý bán dạo do vận hành quản lý'),
    ('ROLE_STAFF_OPERATOR', 'Nhân viên vận hành', 'Quản lý vận hành xổ số')
ON CONFLICT (code) DO UPDATE
SET name = EXCLUDED.name,
    description = EXCLUDED.description;

-- V202606031045__init_blog_schema.sql

INSERT INTO blog_category (name, slug, description, display_order, status, avatar) VALUES
('Kinh nghiệm chơi số', 'kinh-nghiem-choi-so', 'Chia sẻ kinh nghiệm, bí quyết chơi số hiệu quả', 1, 'ACTIVE', 'fa-solid fa-lightbulb'),
('Soi cầu', 'soi-cau', 'Phân tích soi cầu kết quả hàng ngày', 2, 'ACTIVE', 'fa-solid fa-magnifying-glass-chart'),
('Tin tức', 'tin-tuc', 'Tin tức sự kiện, tin tức xổ số mới nhất', 3, 'ACTIVE', 'fa-regular fa-newspaper'),
('Bài viết nổi bật', 'bai-viet-noi-bat', 'Tổng hợp các bài viết nổi bật được nhiều người đọc', 4, 'ACTIVE', 'fa-solid fa-star')
ON CONFLICT (slug) DO NOTHING;

-- V202606051300__init_lottery_schema.sql

INSERT INTO lottery_regions (code, name, type, min_number, max_number, station_count)
VALUES
    ('MIEN_NAM', 'Miền Nam', 'TRADITIONAL', 0, 999999, 0),
    ('MIEN_TRUNG', 'Miền Trung', 'TRADITIONAL', 0, 999999, 0),
    ('MIEN_BAC', 'Miền Bắc', 'TRADITIONAL', 0, 99999, 0)
ON CONFLICT (code) DO NOTHING;

-- V202606231200__init_support_ticket_schema.sql

INSERT INTO ticket_categories (name, code, description, priority, required_ref_type, created_at, updated_at, created_by, last_modified_by)
VALUES
    ('Khiếu nại đơn hàng', 'ORDER_ISSUE', 'Khiếu nại liên quan đến đơn hàng đã đặt', 1, 'ORDER', NOW(), NOW(), 'SYSTEM', 'SYSTEM'),
    ('Lỗi thanh toán', 'PAYMENT_ISSUE', 'Khiếu nại về giao dịch thanh toán', 1, 'PAYMENT_TRANSACTION', NOW(), NOW(), 'SYSTEM', 'SYSTEM'),
    ('Hỗ trợ chung', 'GENERAL', 'Yêu cầu hỗ trợ không gắn đối tượng cụ thể', 2, NULL, NOW(), NOW(), 'SYSTEM', 'SYSTEM')
ON CONFLICT (code) DO UPDATE SET
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    priority = EXCLUDED.priority,
    required_ref_type = EXCLUDED.required_ref_type,
    updated_at = NOW(),
    last_modified_by = 'SYSTEM';

-- Complaint category parents are reference data, so seed and wire them here
-- instead of maintaining separate parent backfill migrations.
INSERT INTO ticket_categories (
    name, code, description, priority, required_ref_type,
    created_at, updated_at, created_by, last_modified_by
)
VALUES
    ('Đơn hàng', 'GROUP_ORDER', 'Nhóm khiếu nại liên quan đến đơn hàng', 1, NULL, NOW(), NOW(), 'SYSTEM', 'SYSTEM'),
    ('Thanh toán & Hoàn tiền', 'GROUP_PAYMENT', 'Nhóm khiếu nại thanh toán và hoàn tiền', 1, NULL, NOW(), NOW(), 'SYSTEM', 'SYSTEM'),
    ('Hỗ trợ chung', 'GROUP_GENERAL', 'Nhóm các yêu cầu hỗ trợ khác', 2, NULL, NOW(), NOW(), 'SYSTEM', 'SYSTEM'),
    ('Khiếu nại trả thưởng', 'GROUP_PRIZE_PAYOUT', 'Nhóm khiếu nại liên quan đến trả thưởng / nhận thưởng', 3, NULL, NOW(), NOW(), 'SYSTEM', 'SYSTEM')
ON CONFLICT (code) DO UPDATE SET
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    priority = EXCLUDED.priority,
    updated_at = NOW(),
    last_modified_by = 'SYSTEM';

UPDATE ticket_categories
SET parent_id = CASE
    WHEN code = 'ORDER_ISSUE' THEN (SELECT id FROM ticket_categories WHERE code = 'GROUP_ORDER')
    WHEN code = 'PAYMENT_ISSUE' THEN (SELECT id FROM ticket_categories WHERE code = 'GROUP_PAYMENT')
    WHEN code = 'GENERAL' THEN (SELECT id FROM ticket_categories WHERE code = 'GROUP_GENERAL')
    ELSE parent_id
END
WHERE code IN ('ORDER_ISSUE', 'PAYMENT_ISSUE', 'GENERAL');

-- V202607061130__init_ai_service_config_schema.sql

INSERT INTO ai_service_configs (
    service_name,
    description,
    enabled,
    switch_intent_threshold,
    active,
    created_at,
    updated_at,
    created_by,
    last_modified_by
)
VALUES (
    'CHATBOT',
    'Default chatbot runtime configuration for intent routing, fallback behavior, and schedule matching.',
    FALSE,
    0.85,
    TRUE,
    NOW(),
    NOW(),
    'SYSTEM',
    'SYSTEM'
)
ON CONFLICT (service_name) DO NOTHING;

INSERT INTO ai_intent_configs (
    ai_service_config_id,
    intent,
    description,
    enabled,
    priority,
    fallback_to_human,
    config_json,
    active,
    created_at,
    updated_at,
    created_by,
    last_modified_by
)
SELECT
    cfg.id,
    seed.intent,
    seed.description,
    TRUE,
    seed.priority,
    seed.fallback_to_human,
    seed.config_json::jsonb,
    TRUE,
    NOW(),
    NOW(),
    'SYSTEM',
    'SYSTEM'
FROM ai_service_configs cfg
JOIN (
    VALUES
        (
            'ESCALATE_REQUEST',
            'Immediate escalation intent when the customer asks for a human operator or cannot continue with the bot.',
            10,
            TRUE,
            '{"defaultConfidence": 0.95}'
        ),
        (
            'WEB_ACCOUNT',
            'Account and profile support intent such as login, registration, password, profile, and order/account lookup.',
            20,
            FALSE,
            '{"defaultConfidence": 0.92}'
        ),
        (
            'WEB_SCHEDULE',
            'Lottery draw schedule intent with slot-answer support, station fuzzy matching, and entity-aware confidence thresholds.',
            30,
            FALSE,
            '{"slotAnswerConfidence": 0.76, "withEntityConfidence": 0.88, "withoutEntityConfidence": 0.75, "stationFuzzyMatchThreshold": 0.75, "stationFuzzyAmbiguityGap": 0.10}'
        ),
        (
            'WEB_RESULT',
            'Lottery result lookup intent with separate confidence for cases with and without an extracted ticket number.',
            40,
            FALSE,
            '{"withTicketConfidence": 0.85, "withoutTicketConfidence": 0.70}'
        ),
        (
            'OTHER_KNOWLEDGE',
            'Reference-only knowledge intent for fortune, dream interpretation, and other non-transactional knowledge questions.',
            50,
            FALSE,
            '{"defaultConfidence": 0.82}'
        ),
        (
            'TRASH_TALK',
            'Low-value conversational or playful messages that should receive a light non-business response.',
            60,
            FALSE,
            '{"defaultConfidence": 0.90}'
        ),
        (
            'WEB_SEARCH',
            'Find available lottery tickets in inventory by number fragment or station.',
            70,
            FALSE,
            '{"defaultConfidence": 0.88}'
        ),
        (
            'WEB_SUGGEST',
            'Suggest available lottery tickets currently for sale from inventory.',
            80,
            FALSE,
            '{"defaultConfidence": 0.85}'
        ),
        (
            'WEB_SUPPORT',
            'Reserved intent for future customer support triage flows beyond the current chatbot scope.',
            90,
            FALSE,
            '{"defaultConfidence": 0.70}'
        ),
        (
            'SYSTEM_ATTACK',
            'Reserved guardrail intent for hostile or prompt-attack style inputs that may require dedicated handling later.',
            100,
            FALSE,
            '{"defaultConfidence": 0.70}'
        ),
        (
            'UNKNOWN',
            'Fallback intent when no confident business intent can be determined from the customer message.',
            999,
            FALSE,
            '{"defaultConfidence": 0.30}'
        )
) AS seed(intent, description, priority, fallback_to_human, config_json)
    ON TRUE
WHERE cfg.service_name = 'CHATBOT'
ON CONFLICT (ai_service_config_id, intent) DO NOTHING;
