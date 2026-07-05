-- Reclassify import-batch time settings under Ticket Import Configuration.

UPDATE system_config
SET config_type = 'TICKET_IMPORT',
    updated_at = CURRENT_TIMESTAMP
WHERE config_key IN ('LATE_IMPORT_TIME', 'IMPORT_BATCH_CUTOFF_TIME');
