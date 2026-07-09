CREATE TABLE IF NOT EXISTS lottery_ticket_entry_drafts (
    id                    BIGSERIAL PRIMARY KEY,
    import_batch_line_id  BIGINT NOT NULL,
    operator_id           UUID NOT NULL,
    draft_payload         JSONB NOT NULL,
    created_at            TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at            TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by            VARCHAR(100) DEFAULT 'SYSTEM',
    last_modified_by      VARCHAR(100) DEFAULT 'SYSTEM',
    deleted_at            TIMESTAMP,
    CONSTRAINT fk_lottery_ticket_entry_drafts_line
        FOREIGN KEY (import_batch_line_id) REFERENCES import_batch_lines(id),
    CONSTRAINT fk_lottery_ticket_entry_drafts_operator
        FOREIGN KEY (operator_id) REFERENCES users(id)
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_lottery_ticket_entry_drafts_line_operator_active
    ON lottery_ticket_entry_drafts(import_batch_line_id, operator_id)
    WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_lottery_ticket_entry_drafts_operator_updated
    ON lottery_ticket_entry_drafts(operator_id, updated_at DESC);
