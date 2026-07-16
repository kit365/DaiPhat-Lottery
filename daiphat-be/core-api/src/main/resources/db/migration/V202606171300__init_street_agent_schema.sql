CREATE TABLE IF NOT EXISTS street_agent_profiles (
    id                          BIGSERIAL PRIMARY KEY,
    first_name                  VARCHAR(100) NOT NULL,
    last_name                   VARCHAR(100) NOT NULL,
    phone                       VARCHAR(20) NOT NULL,
    cccd                        VARCHAR(20) NOT NULL,
    image_url                   VARCHAR(500),
    contact_address             VARCHAR(255),
    contact_province            VARCHAR(100),
    coverage_area               VARCHAR(255),
    commission_rate             NUMERIC(5, 4),
    contract_start_date         DATE,
    contract_end_date           DATE,
    deposit_balance             NUMERIC(15, 0) NOT NULL DEFAULT 0,
    deposit_adjustment_reason   TEXT,
    status                      VARCHAR(20) NOT NULL DEFAULT 'ACTIVE',
    created_at                  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at                  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by                  VARCHAR(100) DEFAULT 'SYSTEM',
    last_modified_by            VARCHAR(100) DEFAULT 'SYSTEM',
    deleted_at                  TIMESTAMP,

    CONSTRAINT uq_street_agent_profiles_phone UNIQUE (phone),
    CONSTRAINT uq_street_agent_profiles_cccd UNIQUE (cccd)
);

CREATE INDEX IF NOT EXISTS idx_street_agent_profiles_status ON street_agent_profiles(status);
CREATE INDEX IF NOT EXISTS idx_street_agent_profiles_contact_province ON street_agent_profiles(contact_province);
