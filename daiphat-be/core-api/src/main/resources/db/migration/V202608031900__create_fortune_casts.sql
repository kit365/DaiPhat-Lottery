-- Daily fortune-cast (oracle jar) results for authenticated clients.
CREATE TABLE IF NOT EXISTS fortune_casts (
    id                  BIGSERIAL PRIMARY KEY,
    user_id             UUID         NOT NULL REFERENCES users (id),
    cast_date           DATE         NOT NULL,
    sellable_draw_date  DATE         NOT NULL,
    birth_year          INTEGER      NOT NULL,
    user_element        VARCHAR(20)  NOT NULL,
    day_element         VARCHAR(20)  NOT NULL,
    primary_tail        CHAR(2)      NOT NULL,
    final_tail          CHAR(2)      NOT NULL,
    fallback_used       BOOLEAN      NOT NULL DEFAULT FALSE,
    fallback_reason     VARCHAR(255),
    score_snapshot      JSONB,
    prose               TEXT         NOT NULL,
    prose_source        VARCHAR(20)  NOT NULL,
    created_at          TIMESTAMP    NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMP    NOT NULL DEFAULT NOW(),
    created_by          VARCHAR(100) DEFAULT 'SYSTEM',
    last_modified_by    VARCHAR(100) DEFAULT 'SYSTEM',
    deleted_at          TIMESTAMP,
    CONSTRAINT uk_fortune_casts_user_cast_date UNIQUE (user_id, cast_date)
);

CREATE INDEX IF NOT EXISTS idx_fortune_casts_user_id ON fortune_casts (user_id);
CREATE INDEX IF NOT EXISTS idx_fortune_casts_cast_date ON fortune_casts (cast_date);
