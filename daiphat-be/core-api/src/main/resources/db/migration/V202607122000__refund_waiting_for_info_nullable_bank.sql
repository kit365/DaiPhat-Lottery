-- Allow refunds awaiting bank account (WAITING_FOR_INFO) without bank_account_id.
ALTER TABLE refund_requests
    ALTER COLUMN bank_account_id DROP NOT NULL;
