ALTER TABLE notifications
    ADD COLUMN IF NOT EXISTS audience VARCHAR(20) NOT NULL DEFAULT 'CUSTOMER';

CREATE INDEX IF NOT EXISTS idx_notifications_user_audience_created_at
    ON notifications (user_id, audience, created_at DESC);

-- Reclassify known internal operational alerts.
UPDATE notifications
SET audience = 'STAFF'
WHERE title IN (
    'Cảnh báo quá hạn trả vé nhà cung cấp',
    'Nhắc nhở kiểm vé trả nhà cung cấp',
    'Trễ hạn thanh toán nhà cung cấp',
    'Sắp đến hạn thanh toán NCC',
    'Có đơn hàng mới cần xử lý',
    'Có chứng từ thanh toán cần xác minh',
    'Phiếu nhập lô đã bị hủy tự động',
    'Một phần phiếu nhập lô đã bị hủy tự động',
    'Vé giữ hộ đã quá hạn'
);

-- Remove staff alerts that were incorrectly delivered to customer accounts.
UPDATE notifications n
SET deleted_at = CURRENT_TIMESTAMP
WHERE n.audience = 'STAFF'
  AND n.deleted_at IS NULL
  AND EXISTS (
      SELECT 1
      FROM users u
      INNER JOIN roles r ON r.id = u.role_id
      WHERE u.id = n.user_id
        AND r.code = 'ROLE_MEMBER'
  );
