-- prize_structure_templates: mẫu cấu trúc giải theo miền (seed source khi tạo đài)
CREATE TABLE IF NOT EXISTS prize_structure_templates (
    id                      BIGSERIAL PRIMARY KEY,
    region                  VARCHAR(20) NOT NULL,
    is_only                 BOOLEAN NOT NULL DEFAULT FALSE,
    prize_level             VARCHAR(50) NOT NULL,
    prize_display_name      VARCHAR(100),
    prize_code              VARCHAR(20) NOT NULL,
    prize_value             NUMERIC(15, 0) NOT NULL DEFAULT 0,
    quantity                INTEGER NOT NULL,
    match_digits            INTEGER,
    match_from              VARCHAR(20) NOT NULL,
    match_from_display_name VARCHAR(100),
    display_order           INTEGER NOT NULL DEFAULT 0,

    created_at              TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at              TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by              VARCHAR(100) DEFAULT 'SYSTEM',
    last_modified_by        VARCHAR(100) DEFAULT 'SYSTEM',
    deleted_at              TIMESTAMP,
    is_active               BOOLEAN NOT NULL DEFAULT TRUE,

    CONSTRAINT uk_prize_structure_templates_region_code UNIQUE (region, prize_code)
);

CREATE INDEX IF NOT EXISTS idx_prize_structure_templates_region
    ON prize_structure_templates(region);

-- Seed: MIEN_NAM — 9 giải chính + phụ đặc biệt + khuyến khích
INSERT INTO prize_structure_templates
    (region, prize_level, prize_code, prize_value, quantity, match_digits, match_from, display_order)
VALUES
    ('MIEN_NAM', 'SPECIAL',     'DB',     0, 1, 6,    'LAST',  0),
    ('MIEN_NAM', 'FIRST',       'G1',     0, 1, 5,    'LAST',  1),
    ('MIEN_NAM', 'SECOND',      'G2',     0, 1, 5,    'LAST',  2),
    ('MIEN_NAM', 'THIRD',       'G3',     0, 2, 5,    'LAST',  3),
    ('MIEN_NAM', 'FOURTH',      'G4',     0, 7, 5,    'LAST',  4),
    ('MIEN_NAM', 'FIFTH',       'G5',     0, 1, 4,    'LAST',  5),
    ('MIEN_NAM', 'SIXTH',       'G6',     0, 3, 4,    'LAST',  6),
    ('MIEN_NAM', 'SEVENTH',     'G7',     0, 1, 3,    'LAST',  7),
    ('MIEN_NAM', 'EIGHTH',      'G8',     0, 1, 2,    'LAST',  8),
    ('MIEN_NAM', 'SUB_SPECIAL', 'DB_PHU', 0, 1, NULL, 'EXACT', 9),
    ('MIEN_NAM', 'CONSOLATION', 'KK',     0, 3, 5,    'LAST',  10);

-- Seed: MIEN_BAC
INSERT INTO prize_structure_templates
    (region, prize_level, prize_code, prize_value, quantity, match_digits, match_from, display_order)
VALUES
    ('MIEN_BAC', 'SPECIAL',     'DB',     0, 1, 5,    'LAST',  0),
    ('MIEN_BAC', 'FIRST',       'G1',     0, 1, 5,    'LAST',  1),
    ('MIEN_BAC', 'SECOND',      'G2',     0, 2, 5,    'LAST',  2),
    ('MIEN_BAC', 'THIRD',       'G3',     0, 6, 5,    'LAST',  3),
    ('MIEN_BAC', 'FOURTH',      'G4',     0, 4, 4,    'LAST',  4),
    ('MIEN_BAC', 'FIFTH',       'G5',     0, 6, 4,    'LAST',  5),
    ('MIEN_BAC', 'SIXTH',       'G6',     0, 3, 3,    'LAST',  6),
    ('MIEN_BAC', 'SEVENTH',     'G7',     0, 4, 2,    'LAST',  7);

-- Seed: MIEN_TRUNG
INSERT INTO prize_structure_templates
    (region, prize_level, prize_code, prize_value, quantity, match_digits, match_from, display_order)
VALUES
    ('MIEN_TRUNG', 'SPECIAL',     'DB',     0, 1, 6,    'LAST',  0),
    ('MIEN_TRUNG', 'FIRST',       'G1',     0, 1, 5,    'LAST',  1),
    ('MIEN_TRUNG', 'SECOND',      'G2',     0, 1, 5,    'LAST',  2),
    ('MIEN_TRUNG', 'THIRD',       'G3',     0, 2, 5,    'LAST',  3),
    ('MIEN_TRUNG', 'FOURTH',      'G4',     0, 7, 5,    'LAST',  4),
    ('MIEN_TRUNG', 'FIFTH',       'G5',     0, 1, 4,    'LAST',  5),
    ('MIEN_TRUNG', 'SIXTH',       'G6',     0, 3, 4,    'LAST',  6),
    ('MIEN_TRUNG', 'SEVENTH',     'G7',     0, 1, 3,    'LAST',  7),
    ('MIEN_TRUNG', 'EIGHTH',      'G8',     0, 1, 2,    'LAST',  8),
    ('MIEN_TRUNG', 'SUB_SPECIAL', 'DB_PHU', 0, 1, NULL, 'EXACT', 9),
    ('MIEN_TRUNG', 'CONSOLATION', 'KK',     0, 3, 5,    'LAST',  10);
