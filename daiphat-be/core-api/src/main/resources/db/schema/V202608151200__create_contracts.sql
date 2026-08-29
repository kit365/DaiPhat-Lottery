-- Legal contract templates shared by street-agent sales and prize-payout PDFs.
-- Per-agent instance fields (code, dates, signed file, daily cap) stay on street_agent_profiles.
CREATE TABLE IF NOT EXISTS contracts (
    id                          BIGSERIAL PRIMARY KEY,
    code                        VARCHAR(50) NOT NULL,
    type                        VARCHAR(40) NOT NULL,
    title                       VARCHAR(255) NOT NULL,
    subtitle                    VARCHAR(500),
    party_a_role_label          VARCHAR(200) NOT NULL,
    party_b_role_label          VARCHAR(200) NOT NULL,
    party_a_signature_label     VARCHAR(200) NOT NULL,
    party_b_signature_label     VARCHAR(200) NOT NULL,
    articles                    jsonb NOT NULL DEFAULT '[]'::jsonb,
    footer_note                 TEXT,
    based_on_id                 BIGINT,
    is_active                   BOOLEAN NOT NULL DEFAULT TRUE,
    created_at                  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at                  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by                  VARCHAR(100) DEFAULT 'SYSTEM',
    last_modified_by            VARCHAR(100) DEFAULT 'SYSTEM',
    deleted_at                  TIMESTAMP,

    CONSTRAINT uq_contracts_code UNIQUE (code),
    CONSTRAINT ck_contracts_type CHECK (type IN ('STREET_AGENT_SALES', 'PRIZE_PAYOUT')),
    CONSTRAINT fk_contracts_based_on FOREIGN KEY (based_on_id) REFERENCES contracts (id)
);

ALTER TABLE contracts
    ADD COLUMN IF NOT EXISTS staff_name VARCHAR(255),
    ADD COLUMN IF NOT EXISTS is_default BOOLEAN NOT NULL DEFAULT FALSE;

ALTER TABLE contracts
    ALTER COLUMN staff_name SET NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS uq_contracts_one_default_per_type
    ON contracts (type)
    WHERE is_default = TRUE AND deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_contracts_type_default
    ON contracts (type, is_default)
    WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_contracts_type_active
    ON contracts (type, is_active)
    WHERE deleted_at IS NULL;
-- Staff-facing name + exactly one default template per contract type.
ALTER TABLE contracts
    ADD COLUMN IF NOT EXISTS staff_name VARCHAR(255),
    ADD COLUMN IF NOT EXISTS is_default BOOLEAN NOT NULL DEFAULT FALSE;


ALTER TABLE contracts
    ALTER COLUMN staff_name SET NOT NULL;

-- Existing seeded templates become the defaults for their type.

CREATE UNIQUE INDEX IF NOT EXISTS uq_contracts_one_default_per_type
    ON contracts (type)
    WHERE is_default = TRUE AND deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_contracts_type_default
    ON contracts (type, is_default)
    WHERE deleted_at IS NULL;
