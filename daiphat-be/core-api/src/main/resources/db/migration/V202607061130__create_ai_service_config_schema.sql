CREATE TABLE IF NOT EXISTS ai_service_configs (
    id BIGSERIAL PRIMARY KEY,
    service_name VARCHAR(50) NOT NULL,
    description VARCHAR(500),
    enabled BOOLEAN NOT NULL DEFAULT FALSE,
    switch_intent_threshold DOUBLE PRECISION NOT NULL DEFAULT 0.85,
    active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP,
    updated_at TIMESTAMP,
    created_by VARCHAR(255),
    last_modified_by VARCHAR(255),
    deleted_at TIMESTAMP,
    CONSTRAINT uk_ai_service_configs_service_name UNIQUE (service_name),
    CONSTRAINT chk_ai_service_configs_switch_threshold
        CHECK (switch_intent_threshold >= 0 AND switch_intent_threshold <= 1)
);

CREATE INDEX IF NOT EXISTS idx_ai_service_configs_active
    ON ai_service_configs (service_name, active)
    WHERE deleted_at IS NULL;

CREATE TABLE IF NOT EXISTS ai_intent_configs (
    id BIGSERIAL PRIMARY KEY,
    ai_service_config_id BIGINT NOT NULL,
    intent VARCHAR(50) NOT NULL,
    description VARCHAR(500),
    enabled BOOLEAN NOT NULL DEFAULT TRUE,
    priority INT NOT NULL DEFAULT 100,
    fallback_to_human BOOLEAN NOT NULL DEFAULT FALSE,
    config_json JSONB NOT NULL DEFAULT '{}'::jsonb,
    active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP,
    updated_at TIMESTAMP,
    created_by VARCHAR(255),
    last_modified_by VARCHAR(255),
    deleted_at TIMESTAMP,
    CONSTRAINT fk_ai_intent_configs_service
        FOREIGN KEY (ai_service_config_id) REFERENCES ai_service_configs (id),
    CONSTRAINT uk_ai_intent_configs_service_intent
        UNIQUE (ai_service_config_id, intent)
);

CREATE INDEX IF NOT EXISTS idx_ai_intent_configs_service_active
    ON ai_intent_configs (ai_service_config_id, active)
    WHERE deleted_at IS NULL;

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
