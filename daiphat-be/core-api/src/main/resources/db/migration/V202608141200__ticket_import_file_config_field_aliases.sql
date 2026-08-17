-- Persist built-in file-import header aliases into system_config.
-- Previously these lived only in ImportBatchFileMappingDetector Java constants;
-- operators edit them via supplier edit / PUT file-import/config (shared for all suppliers).

-- Full default JSON (limits + fieldAliases). Used on INSERT and when merging into rows
-- that do not yet have a non-empty fieldAliases object.
-- Keys match ImportBatchFileMappingDetector.defaultAliasDictionary().

INSERT INTO system_config (
    config_key,
    config_value,
    config_type,
    data_type,
    description,
    config_name,
    unit,
    validation_rules,
    is_editable,
    is_active
)
VALUES (
    'TICKET_IMPORT_FILE_CONFIG',
    '{
      "maxFileSizeMb": 2,
      "maxRows": 2000,
      "serialSeparator": ";",
      "storeOriginalFile": true,
      "allowPartialImport": true,
      "fieldAliases": {
        "drawDateColumn": ["ngayquay", "ngayxoso", "ngayso", "ngay", "drawdate", "date"],
        "stationCodeColumn": ["madai", "manhadai", "ma", "stationcode", "code"],
        "stationColumn": ["nhadai", "tendai", "dai", "tinh", "station", "lotterystation"],
        "quantityColumn": ["soluong", "sl", "sove", "quantity", "qty", "amount"],
        "numbersColumn": ["dayso", "sove", "sodu", "conso", "numbers", "ticketnumber", "so"],
        "serialsColumn": ["seri", "sori", "soseri", "danhsachseri", "serial", "serials", "serialnumber"],
        "ticketImageColumn": ["anhve", "hinhve", "anh", "hinh", "ticketimg", "ticketimage", "image", "photo", "url"],
        "importCostColumn": ["giavon", "dongia", "giave", "importcost", "unitprice", "price", "gia"]
      }
    }',
    'TICKET_IMPORT',
    'JSON',
    'Giới hạn và quy ước khi đọc tệp .csv/.xlsx nhập vé, kèm alias tên cột tự nhận diện (dùng chung mọi NCC).',
    'Cấu hình nhập vé từ tệp',
    NULL,
    '{}',
    TRUE,
    TRUE
)
ON CONFLICT (config_key) DO UPDATE SET
    config_type = EXCLUDED.config_type,
    data_type = EXCLUDED.data_type,
    description = EXCLUDED.description,
    config_name = EXCLUDED.config_name,
    validation_rules = EXCLUDED.validation_rules,
    is_editable = EXCLUDED.is_editable,
    is_active = EXCLUDED.is_active,
    -- Only inject fieldAliases when missing/empty so an operator-edited list is kept.
    config_value = CASE
        WHEN COALESCE(system_config.config_value, '') <> ''
             AND (system_config.config_value::jsonb -> 'fieldAliases') IS NOT NULL
             AND jsonb_typeof(system_config.config_value::jsonb -> 'fieldAliases') = 'object'
             AND system_config.config_value::jsonb -> 'fieldAliases' <> '{}'::jsonb
            THEN system_config.config_value
        WHEN COALESCE(system_config.config_value, '') <> ''
            THEN (
                COALESCE(system_config.config_value::jsonb, '{}'::jsonb)
                || jsonb_build_object(
                    'fieldAliases',
                    EXCLUDED.config_value::jsonb -> 'fieldAliases'
                )
            )::text
        ELSE EXCLUDED.config_value
    END,
    updated_at = CURRENT_TIMESTAMP;
