-- Update RETURN_BUFFER_TIME config_type to TICKET_RETURN (Cấu hình trả vé)
UPDATE system_config
SET config_type = 'TICKET_RETURN',
    updated_at = NOW()
WHERE config_key = 'RETURN_BUFFER_TIME';
