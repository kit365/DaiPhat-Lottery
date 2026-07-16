-- Add cancel_type to orders for classifying how/why an order was cancelled.
ALTER TABLE orders
    ADD COLUMN IF NOT EXISTS cancel_type VARCHAR(50);

COMMENT ON COLUMN orders.cancel_type IS
    'OrderCancelType: CUSTOMER_REQUEST | ADMIN_FORCE_CANCEL | SYSTEM_PAYMENT_TIMEOUT | OUT_OF_STOCK_INCIDENT';
