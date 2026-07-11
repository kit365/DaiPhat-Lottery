-- Legacy order_refunds replaced by refund_requests + order_details.refund_request_id.
DROP TABLE IF EXISTS order_refunds;
