UPDATE system_config 
SET data_type = 'INT' 
WHERE config_key = 'TICKET_AUTO_IMPORT_THRESHOLD' AND data_type = 'INTEGER';
