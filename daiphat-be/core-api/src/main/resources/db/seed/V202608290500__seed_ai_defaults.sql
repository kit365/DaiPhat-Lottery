INSERT INTO public.ai_service_configs (id, service_name, description, enabled, switch_intent_threshold, active, created_at, updated_at, created_by, last_modified_by, deleted_at)
VALUES
    (1, 'CHATBOT', 'Default chatbot runtime configuration for intent routing, fallback behavior, and schedule matching.', false, 0.85, true, '2026-08-29 04:47:09.54965', '2026-08-29 04:47:09.54965', 'SYSTEM', 'SYSTEM', NULL)
ON CONFLICT (service_name) DO NOTHING;

INSERT INTO public.ai_intent_configs (id, ai_service_config_id, intent, description, enabled, priority, fallback_to_human, config_json, active, created_at, updated_at, created_by, last_modified_by, deleted_at)
VALUES
    (1, 1, 'ESCALATE_REQUEST', 'Immediate escalation intent when the customer asks for a human operator or cannot continue with the bot.', true, 10, true, '{"defaultConfidence": 0.95}', true, '2026-08-29 04:47:09.550214', '2026-08-29 04:47:09.550214', 'SYSTEM', 'SYSTEM', NULL),
    (2, 1, 'WEB_ACCOUNT', 'Account and profile support intent such as login, registration, password, profile, and order/account lookup.', true, 20, false, '{"defaultConfidence": 0.92}', true, '2026-08-29 04:47:09.550214', '2026-08-29 04:47:09.550214', 'SYSTEM', 'SYSTEM', NULL),
    (3, 1, 'WEB_SCHEDULE', 'Lottery draw schedule intent with slot-answer support, station fuzzy matching, and entity-aware confidence thresholds.', true, 30, false, '{"slotAnswerConfidence": 0.76, "withEntityConfidence": 0.88, "withoutEntityConfidence": 0.75, "stationFuzzyAmbiguityGap": 0.10, "stationFuzzyMatchThreshold": 0.75}', true, '2026-08-29 04:47:09.550214', '2026-08-29 04:47:09.550214', 'SYSTEM', 'SYSTEM', NULL),
    (4, 1, 'WEB_RESULT', 'Lottery result lookup intent with separate confidence for cases with and without an extracted ticket number.', true, 40, false, '{"withTicketConfidence": 0.85, "withoutTicketConfidence": 0.70}', true, '2026-08-29 04:47:09.550214', '2026-08-29 04:47:09.550214', 'SYSTEM', 'SYSTEM', NULL),
    (5, 1, 'OTHER_KNOWLEDGE', 'Reference-only knowledge intent for fortune, dream interpretation, and other non-transactional knowledge questions.', true, 50, false, '{"defaultConfidence": 0.82}', true, '2026-08-29 04:47:09.550214', '2026-08-29 04:47:09.550214', 'SYSTEM', 'SYSTEM', NULL),
    (6, 1, 'TRASH_TALK', 'Low-value conversational or playful messages that should receive a light non-business response.', true, 60, false, '{"defaultConfidence": 0.90}', true, '2026-08-29 04:47:09.550214', '2026-08-29 04:47:09.550214', 'SYSTEM', 'SYSTEM', NULL),
    (7, 1, 'WEB_SEARCH', 'Find available lottery tickets in inventory by number fragment or station.', true, 70, false, '{"defaultConfidence": 0.88}', true, '2026-08-29 04:47:09.550214', '2026-08-29 04:47:09.550214', 'SYSTEM', 'SYSTEM', NULL),
    (8, 1, 'WEB_SUGGEST', 'Suggest available lottery tickets currently for sale from inventory.', true, 80, false, '{"defaultConfidence": 0.85}', true, '2026-08-29 04:47:09.550214', '2026-08-29 04:47:09.550214', 'SYSTEM', 'SYSTEM', NULL),
    (9, 1, 'WEB_SUPPORT', 'Reserved intent for future customer support triage flows beyond the current chatbot scope.', true, 90, false, '{"defaultConfidence": 0.70}', true, '2026-08-29 04:47:09.550214', '2026-08-29 04:47:09.550214', 'SYSTEM', 'SYSTEM', NULL),
    (10, 1, 'SYSTEM_ATTACK', 'Reserved guardrail intent for hostile or prompt-attack style inputs that may require dedicated handling later.', true, 100, false, '{"defaultConfidence": 0.70}', true, '2026-08-29 04:47:09.550214', '2026-08-29 04:47:09.550214', 'SYSTEM', 'SYSTEM', NULL),
    (11, 1, 'UNKNOWN', 'Fallback intent when no confident business intent can be determined from the customer message.', true, 999, false, '{"defaultConfidence": 0.30}', true, '2026-08-29 04:47:09.550214', '2026-08-29 04:47:09.550214', 'SYSTEM', 'SYSTEM', NULL)
ON CONFLICT (ai_service_config_id, intent) DO NOTHING;

INSERT INTO public.ai_model_registry (id, provider, model_name, display_name, is_active, is_default, notes, created_at, updated_at, created_by, last_modified_by, deleted_at)
VALUES
    (1, 'groq', 'qwen/qwen3.6-27b', 'Groq Qwen 3.6 27B Vision', true, true, 'Default ticket-vision engine (GROQ_VISION_MODEL).', '2026-08-29 04:47:15.913355', '2026-08-29 04:47:15.913355', 'SYSTEM', 'SYSTEM', NULL)
ON CONFLICT (provider, model_name) DO NOTHING;

SELECT setval(
    'public.ai_intent_configs_id_seq',
    GREATEST((SELECT COALESCE(MAX(id), 1) FROM public.ai_intent_configs), 11),
    true
);
SELECT setval(
    'public.ai_model_registry_id_seq',
    GREATEST((SELECT COALESCE(MAX(id), 1) FROM public.ai_model_registry), 1),
    true
);
SELECT setval(
    'public.ai_service_configs_id_seq',
    GREATEST((SELECT COALESCE(MAX(id), 1) FROM public.ai_service_configs), 1),
    true
);
