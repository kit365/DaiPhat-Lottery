CREATE TABLE IF NOT EXISTS lottery_suppliers (
    id                    BIGSERIAL PRIMARY KEY,
    name                  VARCHAR(200) NOT NULL,
    code                  VARCHAR(50)  NOT NULL,
    type                  VARCHAR(30)  NOT NULL,
    contact_name          VARCHAR(150),
    contact_phone         VARCHAR(30)  NOT NULL,
    contact_email         VARCHAR(150),
    address               VARCHAR(500),
    tax_code              VARCHAR(50),
    payment_term_days     INTEGER,
    default_import_cost   NUMERIC(15, 0),
    is_active             BOOLEAN      NOT NULL DEFAULT FALSE,
    created_at            TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at            TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by            VARCHAR(100) DEFAULT 'SYSTEM',
    last_modified_by      VARCHAR(100) DEFAULT 'SYSTEM',
    deleted_at            TIMESTAMP,
    CONSTRAINT uq_lottery_suppliers_code UNIQUE (code)
);

CREATE INDEX IF NOT EXISTS idx_lottery_suppliers_name
    ON lottery_suppliers (LOWER(name));
CREATE INDEX IF NOT EXISTS idx_lottery_suppliers_contact_phone
    ON lottery_suppliers (contact_phone);
CREATE INDEX IF NOT EXISTS idx_lottery_suppliers_is_active
    ON lottery_suppliers (is_active)
    WHERE deleted_at IS NULL;

-- supplier_id is required by application rules when creating new import batches.
-- Column stays nullable so environments without suppliers can migrate existing rows.
ALTER TABLE import_batches
    ADD COLUMN IF NOT EXISTS supplier_id BIGINT;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'fk_import_batches_supplier_id'
    ) THEN
        ALTER TABLE import_batches
            ADD CONSTRAINT fk_import_batches_supplier_id
                FOREIGN KEY (supplier_id) REFERENCES lottery_suppliers (id);
    END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_import_batches_supplier_id
    ON import_batches (supplier_id);
