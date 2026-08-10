-- Vendor pricing is derived from VENDOR_COMMISSION_RATE and the ticket face value.
-- Keep the historical row for audit, but remove it from active System Config.
UPDATE system_config
SET is_active = FALSE,
    is_editable = FALSE,
    updated_at = NOW()
WHERE config_key = 'VENDOR_DEFAULT_UNIT_PRICE';
