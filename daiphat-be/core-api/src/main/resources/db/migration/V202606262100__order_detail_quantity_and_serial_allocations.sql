-- Support one order detail line per lottery number with quantity and multiple serial allocations.
ALTER TABLE order_details
    ADD COLUMN IF NOT EXISTS lottery_ticket_id BIGINT,
    ADD COLUMN IF NOT EXISTS quantity INTEGER NOT NULL DEFAULT 1;

ALTER TABLE order_details
    ADD CONSTRAINT fk_order_details_lottery_ticket
        FOREIGN KEY (lottery_ticket_id) REFERENCES lottery_tickets (id);

UPDATE order_details od
SET lottery_ticket_id = lts.ticket_id,
    quantity = 1
FROM lottery_ticket_serials lts
WHERE od.lottery_ticket_serial_id = lts.id
  AND od.lottery_ticket_id IS NULL;

ALTER TABLE order_details
    ALTER COLUMN lottery_ticket_serial_id DROP NOT NULL;

CREATE TABLE IF NOT EXISTS order_detail_serials (
    id BIGSERIAL PRIMARY KEY,
    order_detail_id BIGINT NOT NULL,
    lottery_ticket_serial_id BIGINT NOT NULL,
    created_at TIMESTAMP,
    CONSTRAINT fk_order_detail_serials_detail
        FOREIGN KEY (order_detail_id) REFERENCES order_details (id) ON DELETE CASCADE,
    CONSTRAINT fk_order_detail_serials_serial
        FOREIGN KEY (lottery_ticket_serial_id) REFERENCES lottery_ticket_serials (id),
    CONSTRAINT uk_order_detail_serials_detail_serial
        UNIQUE (order_detail_id, lottery_ticket_serial_id),
    CONSTRAINT uk_order_detail_serials_serial
        UNIQUE (lottery_ticket_serial_id)
);

CREATE INDEX IF NOT EXISTS idx_order_detail_serials_detail_id
    ON order_detail_serials (order_detail_id);

CREATE INDEX IF NOT EXISTS idx_order_details_lottery_ticket_id
    ON order_details (lottery_ticket_id);
