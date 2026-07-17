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

-- V202606221200__init_system_config_schema.sql

INSERT INTO system_config (
    config_key,
    config_value,
    config_type,
    data_type,
    description,
    is_active
)
VALUES
    ('ORDER_CANCEL_GRACE_MIN', '30', 'ORDER_SETTING', 'INT', 'Thời gian ân hạn hủy đơn (phút)', TRUE),
    ('CUSTOMER_CANCEL_CUTOFF', '14:30', 'ORDER_SETTING', 'TIME', 'Giờ chốt hủy đơn của khách hàng', TRUE),
    ('ORDER_PREPARE_SLA_MIN', '30', 'ORDER_SETTING', 'INT', 'SLA chuẩn bị đơn (phút)', TRUE),
    ('VENDOR_RETURN_CUTOFF', '15:00', 'ORDER_SETTING', 'TIME', 'Giờ chốt trả vé cho đại lý', TRUE),
    ('STAFF_INCIDENT_CUTOFF', '16:00', 'REFUND_SETTING', 'TIME', 'Giờ chốt xử lý sự cố của nhân viên', TRUE),
    ('INVALID_INFO_EXPIRED_DAYS', '7', 'REFUND_SETTING', 'INT', 'Số ngày hết hạn thông tin không hợp lệ', TRUE),
    ('LATE_IMPORT_TIME', '14:30', 'TICKET_IMPORT', 'TIME', 'Giờ chốt sau đó lô nhập trong ngày được phân loại LATE_IMPORT', TRUE),
    ('IMPORT_BATCH_CUTOFF_TIME', '15:00', 'TICKET_IMPORT', 'TIME', 'Giờ chốt sau đó không cho phép tạo lô nhập trong ngày (trừ lô nhập bổ sung)', TRUE)
ON CONFLICT (config_key) DO UPDATE SET
    config_value = EXCLUDED.config_value,
    config_type = EXCLUDED.config_type,
    data_type = EXCLUDED.data_type,
    description = EXCLUDED.description,
    is_active = EXCLUDED.is_active,
    updated_at = CURRENT_TIMESTAMP;

-- V202606231200__init_support_ticket_schema.sql

INSERT INTO ticket_categories (name, code, description, priority, required_ref_type, created_at, updated_at, created_by, last_modified_by)
VALUES
    ('Khiếu nại đơn hàng', 'ORDER_ISSUE', 'Khiếu nại liên quan đến đơn hàng đã đặt', 1, 'ORDER', NOW(), NOW(), 'SYSTEM', 'SYSTEM'),
    ('Lỗi thanh toán', 'PAYMENT_ISSUE', 'Khiếu nại về giao dịch thanh toán', 2, 'PAYMENT_TRANSACTION', NOW(), NOW(), 'SYSTEM', 'SYSTEM'),
    ('Hỗ trợ chung', 'GENERAL', 'Yêu cầu hỗ trợ không gắn đối tượng cụ thể', 2, NULL, NOW(), NOW(), 'SYSTEM', 'SYSTEM')
ON CONFLICT (code) DO UPDATE SET
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    priority = EXCLUDED.priority,
    required_ref_type = EXCLUDED.required_ref_type,
    updated_at = NOW(),
    last_modified_by = 'SYSTEM';

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
            'Reserved intent for future general web or platform information lookup flows.',
            70,
            FALSE,
            '{"defaultConfidence": 0.70}'
        ),
        (
            'WEB_SUGGEST',
            'Reserved intent for future number suggestion and recommendation flows.',
            80,
            FALSE,
            '{"defaultConfidence": 0.70}'
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
