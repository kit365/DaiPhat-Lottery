package com.daiphat.accountservice.application.port.in.auth;

import com.daiphat.accountservice.application.dto.request.auth.ForgotPasswordRequest;
import com.daiphat.accountservice.application.dto.request.auth.ResetPasswordRequest;
import com.daiphat.accountservice.application.dto.request.auth.VerifyOtpRequest;
import com.daiphat.accountservice.application.dto.response.auth.ForgotPasswordResponse;
import com.daiphat.accountservice.application.dto.response.auth.PasswordPolicyResponse;
import com.daiphat.accountservice.application.dto.response.auth.VerifyOtpResponse;

/**
 * Port chuyên trách khâu Quên/Đổi mật khẩu.
 */
public interface PasswordResetServicePort {
    /**
     * Yêu cầu quên mật khẩu (Gửi OTP).
     */
    ForgotPasswordResponse forgotPassword(ForgotPasswordRequest request);

    /**
     * Gửi lại mã OTP.
     */
    ForgotPasswordResponse resendForgotPasswordOtp(ForgotPasswordRequest request);

    /**
     * Xác thực mã OTP để tạo Reset Session.
     */
    VerifyOtpResponse verifyResetOtp(VerifyOtpRequest request);

    /**
     * Thực hiện đổi mật khẩu mới bằng Reset Token.
     */
    void resetPassword(ResetPasswordRequest request);

    /**
     * Lấy chính sách mật khẩu hiện tại của hệ thống.
     */
    PasswordPolicyResponse getPasswordPolicy();
}
