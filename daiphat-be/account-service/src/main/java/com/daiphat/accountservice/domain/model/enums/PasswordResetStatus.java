package com.daiphat.accountservice.domain.model.enums;

/**
 * Trạng thái của phiên Reset mật khẩu.
 * PENDING: Vừa tạo, chưa xác thực OTP.
 * VERIFIED: Đã xác thực OTP, sẵn sàng cho bước đổi mật khẩu.
 */
public enum PasswordResetStatus {
    PENDING,
    VERIFIED
}
