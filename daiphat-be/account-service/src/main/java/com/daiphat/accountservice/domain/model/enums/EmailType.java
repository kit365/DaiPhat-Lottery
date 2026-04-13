package com.daiphat.accountservice.domain.model.enums;

import lombok.Getter;
import lombok.RequiredArgsConstructor;

/**
 * Định nghĩa các loại email nghiệp vụ trong hệ thống.
 * Cực kỳ tinh gọn, chỉ giữ lại các sự kiện ACTION-ORIENTED.
 */
@Getter
@RequiredArgsConstructor
public enum EmailType {
    /**
     * Email chào mừng kèm link xác thực tài khoản.
     */
    WELCOME_VERIFY("WELCOME_VERIFY"),

    /**
     * Email gửi mã OTP khôi phục mật khẩu.
     */
    FORGOT_PW_OTP("FORGOT_PW_OTP");

    private final String value;
}
