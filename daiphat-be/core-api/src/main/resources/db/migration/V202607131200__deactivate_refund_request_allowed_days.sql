-- Remove obsolete refund period config (only daily max requests remains).
UPDATE system_config
SET is_active = FALSE,
    updated_at = CURRENT_TIMESTAMP
WHERE config_key = 'REFUND_REQUEST_ALLOWED_DAYS'
  AND is_active = TRUE;
