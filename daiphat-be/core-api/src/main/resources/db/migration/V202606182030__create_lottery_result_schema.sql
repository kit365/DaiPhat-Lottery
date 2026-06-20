CREATE TABLE IF NOT EXISTS lottery_results (
    id                  BIGSERIAL PRIMARY KEY,
    station_id          BIGINT NOT NULL,
    draw_date           DATE NOT NULL,
    source              VARCHAR(100),
    is_official         BOOLEAN NOT NULL DEFAULT FALSE,
    status              VARCHAR(30) NOT NULL DEFAULT 'PENDING',
    published_at        TIMESTAMP,
    last_synced_at      TIMESTAMP,
    requested_at        TIMESTAMP,

    -- Audit
    created_at          TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at          TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by          VARCHAR(100) DEFAULT 'SYSTEM',
    last_modified_by    VARCHAR(100) DEFAULT 'SYSTEM',
    deleted_at          TIMESTAMP,

    CONSTRAINT fk_lottery_results_station_id
        FOREIGN KEY (station_id) REFERENCES lottery_stations(id) ON DELETE CASCADE,
    CONSTRAINT uk_lottery_results_station_draw_date
        UNIQUE (station_id, draw_date)
);

CREATE INDEX IF NOT EXISTS idx_lottery_results_station_id
    ON lottery_results(station_id);
CREATE INDEX IF NOT EXISTS idx_lottery_results_draw_date
    ON lottery_results(draw_date);
CREATE INDEX IF NOT EXISTS idx_lottery_results_status
    ON lottery_results(status);
CREATE INDEX IF NOT EXISTS idx_lottery_results_requested_at
    ON lottery_results(requested_at);

CREATE TABLE IF NOT EXISTS lottery_result_details (
    id                  BIGSERIAL PRIMARY KEY,
    lottery_result_id   BIGINT NOT NULL,
    prize_structure_id  BIGINT NOT NULL,
    winning_number      VARCHAR(20) NOT NULL,

    -- Audit
    created_at          TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at          TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by          VARCHAR(100) DEFAULT 'SYSTEM',
    last_modified_by    VARCHAR(100) DEFAULT 'SYSTEM',
    deleted_at          TIMESTAMP,

    CONSTRAINT fk_lottery_result_details_result_id
        FOREIGN KEY (lottery_result_id) REFERENCES lottery_results(id) ON DELETE CASCADE,
    CONSTRAINT fk_lottery_result_details_prize_structure_id
        FOREIGN KEY (prize_structure_id) REFERENCES prize_structures(id) ON DELETE RESTRICT,
    CONSTRAINT uk_lottery_result_details_result_prize_winning_number
        UNIQUE (lottery_result_id, prize_structure_id, winning_number)
);

CREATE INDEX IF NOT EXISTS idx_lottery_result_details_result_id
    ON lottery_result_details(lottery_result_id);
CREATE INDEX IF NOT EXISTS idx_lottery_result_details_prize_structure_id
    ON lottery_result_details(prize_structure_id);
CREATE INDEX IF NOT EXISTS idx_lottery_result_details_winning_number
    ON lottery_result_details(winning_number);
