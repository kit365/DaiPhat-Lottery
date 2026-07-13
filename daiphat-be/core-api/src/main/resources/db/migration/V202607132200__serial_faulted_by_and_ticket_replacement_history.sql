-- Add faulted_by and migrate former serial fault statuses to DAMAGED/LOST model.

ALTER TABLE lottery_ticket_serials
    ADD COLUMN IF NOT EXISTS faulted_by VARCHAR(30);

UPDATE lottery_ticket_serials
SET status = 'DAMAGED',
    faulted_by = 'INTERNAL_FAULT'
WHERE status = 'INTERNAL_FAULT';

UPDATE lottery_ticket_serials
SET status = 'DAMAGED',
    faulted_by = 'ISSUER_FAULT'
WHERE status = 'ISSUER_FAULT';

CREATE TABLE IF NOT EXISTS ticket_replacement_history (
    id                      BIGSERIAL PRIMARY KEY,
    order_id                UUID         NOT NULL,
    order_detail_id         BIGINT       NOT NULL,
    old_ticket_serial_id    BIGINT       NOT NULL,
    new_ticket_serial_id    BIGINT       NOT NULL,
    reason                  VARCHAR(30)  NOT NULL,
    note                    VARCHAR(500),
    handled_by              UUID         NOT NULL,
    created_at              TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_ticket_replacement_history_order
        FOREIGN KEY (order_id) REFERENCES orders (id),
    CONSTRAINT fk_ticket_replacement_history_order_detail
        FOREIGN KEY (order_detail_id) REFERENCES order_details (id),
    CONSTRAINT fk_ticket_replacement_history_old_serial
        FOREIGN KEY (old_ticket_serial_id) REFERENCES lottery_ticket_serials (id),
    CONSTRAINT fk_ticket_replacement_history_new_serial
        FOREIGN KEY (new_ticket_serial_id) REFERENCES lottery_ticket_serials (id),
    CONSTRAINT fk_ticket_replacement_history_handled_by
        FOREIGN KEY (handled_by) REFERENCES users (id)
);

CREATE INDEX IF NOT EXISTS idx_ticket_replacement_history_order_id
    ON ticket_replacement_history (order_id);
CREATE INDEX IF NOT EXISTS idx_ticket_replacement_history_order_detail_id
    ON ticket_replacement_history (order_detail_id);
