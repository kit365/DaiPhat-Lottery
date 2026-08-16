ALTER TABLE supplier_settlements
    ADD COLUMN IF NOT EXISTS actual_paid_amount NUMERIC(18, 3);

COMMENT ON COLUMN supplier_settlements.actual_paid_amount IS
    'Giá trị thực trả từ biên lai — Admin nhập tay theo tổng tiền trên biên lai đối soát NCC.';

ALTER TABLE supplier_settlement_adjustments
    ADD COLUMN IF NOT EXISTS custom_name VARCHAR(255);

COMMENT ON COLUMN supplier_settlement_adjustments.custom_name IS
    'Tên khoản chi phí tùy chọn, bắt buộc khi reason_code = OTHER.';
