package com.daiphat.accountservice.application.port.out.auth.keys;

import lombok.Getter;
import lombok.RequiredArgsConstructor;

/**
 * Các loại hành động được kiểm soát bởi Rate Limiter.
 * Đã được nâng cấp từ Class String sang Enum Chính quy.
 */
@Getter
@RequiredArgsConstructor
public enum AuthAction {
    LOGIN("login"),
    REGISTER("register"),
    REGISTER_SPAM("register_spam"),
    FORGOT_PASSWORD("forgot_password"),
    FORGOT_PASSWORD_SPAM("forgot_password_spam"),
    RESET_PASSWORD("reset_password"),
    VERIFY_EMAIL("verify_email"),
    RESEND_VERIFICATION("resend_verification"),
    MFA_VERIFY("mfa_verify"),
    LOGIN_SPAM("login-spam"),
    STAFF_INVITE("staff_invite");

    private final String code;
}
