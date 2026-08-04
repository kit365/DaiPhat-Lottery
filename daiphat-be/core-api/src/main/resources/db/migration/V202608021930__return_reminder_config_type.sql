-- Move RETURN_REMINDER_TIME from import-batch category to return-batch category.
UPDATE system_config
SET config_type = 'TICKET_RETURN',
    updated_at = NOW()
WHERE config_key = 'RETURN_REMINDER_TIME';
