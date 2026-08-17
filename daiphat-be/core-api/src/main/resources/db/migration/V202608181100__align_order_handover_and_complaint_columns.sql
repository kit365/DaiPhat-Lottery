-- V202606130905 was later edited in place to add handover / payment-complaint columns.
-- Local DBs that already applied the original CREATE TABLE IF NOT EXISTS never received
-- those columns, so Hibernate fails with: column orders.handover_evidence_url does not exist.

-- ========== orders ==========
ALTER TABLE orders
    ADD COLUMN IF NOT EXISTS handover_evidence_url VARCHAR(500),
    ADD COLUMN IF NOT EXISTS payment_complaint_evidence_url VARCHAR(500),
    ADD COLUMN IF NOT EXISTS payment_complaint_submitted_at TIMESTAMP,
    ADD COLUMN IF NOT EXISTS payment_complaint_resolved_at TIMESTAMP,
    ADD COLUMN IF NOT EXISTS payment_complaint_resolved_by UUID,
    ADD COLUMN IF NOT EXISTS payment_complaint_resolution_reason VARCHAR(500);

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'fk_orders_payment_complaint_resolved_by'
    ) THEN
        ALTER TABLE orders
            ADD CONSTRAINT fk_orders_payment_complaint_resolved_by
                FOREIGN KEY (payment_complaint_resolved_by) REFERENCES users (id);
    END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_orders_payment_complaint_pending
    ON orders (payment_complaint_submitted_at)
    WHERE status = 'PAYMENT_COMPLAINT_PENDING';

COMMENT ON COLUMN orders.handover_evidence_url IS
    'Photo or receipt captured by staff when at least one paid ticket is handed to the customer.';

COMMENT ON COLUMN orders.payment_complaint_evidence_url IS
    'Image proof submitted by customer after SYSTEM_PAYMENT_TIMEOUT cancellation.';

COMMENT ON COLUMN orders.payment_complaint_resolution_reason IS
    'Mandatory staff reason when a payment-timeout complaint is rejected.';

-- ========== order_details ==========
ALTER TABLE order_details
    ALTER COLUMN status TYPE VARCHAR(40);

ALTER TABLE order_details
    ADD COLUMN IF NOT EXISTS rejection_reason VARCHAR(500),
    ADD COLUMN IF NOT EXISTS rejected_at TIMESTAMP,
    ADD COLUMN IF NOT EXISTS rejected_by UUID,
    ADD COLUMN IF NOT EXISTS handed_over_at TIMESTAMP,
    ADD COLUMN IF NOT EXISTS handed_over_by UUID;

COMMENT ON COLUMN order_details.rejection_reason IS
    'Mandatory staff reason when a paid ticket is rejected by the customer at handover.';
