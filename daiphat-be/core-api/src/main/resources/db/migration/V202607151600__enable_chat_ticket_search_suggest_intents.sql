-- Enable inventory search/suggest chatbot intents and refresh descriptions.
UPDATE ai_intent_configs
SET enabled = TRUE,
    description = 'Find available lottery tickets in inventory by number fragment or station.',
    config_json = '{"defaultConfidence": 0.88}'::jsonb,
    updated_at = NOW(),
    last_modified_by = 'SYSTEM'
WHERE intent = 'WEB_SEARCH';

UPDATE ai_intent_configs
SET enabled = TRUE,
    description = 'Suggest available lottery tickets currently for sale from inventory.',
    config_json = '{"defaultConfidence": 0.85}'::jsonb,
    updated_at = NOW(),
    last_modified_by = 'SYSTEM'
WHERE intent = 'WEB_SUGGEST';
