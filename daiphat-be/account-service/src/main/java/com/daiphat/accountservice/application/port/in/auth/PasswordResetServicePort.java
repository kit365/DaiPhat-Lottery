package com.daiphat.accountservice.application.port.in.auth;

import com.daiphat.accountservice.application.dto.request.ForgotPasswordRequestDTO;
import com.daiphat.accountservice.application.dto.request.ResetPasswordRequestDTO;
import com.daiphat.accountservice.application.dto.request.VerifyOtpRequestDTO;
import com.daiphat.accountservice.application.dto.response.ForgotPasswordResponseDTO;
import com.daiphat.accountservice.application.dto.response.VerifyOtpResponseDTO;

/**
 * Port chuyên trách khâu Quên/Đổi mật khẩu.
 */
public interface PasswordResetServicePort {
    /**
     * Yêu cầu quên mật khẩu (Gửi OTP).
     */
    ForgotPasswordResponseDTO forgotPassword(ForgotPasswordRequestDTO request);

    /**
     * Gửi lại mã OTP.
     */
    ForgotPasswordResponseDTO resendForgotPasswordOtp(ForgotPasswordRequestDTO request);

    /**
     * Xác thực mã OTP để tạo Reset Session.
     */
    VerifyOtpResponseDTO verifyResetOtp(VerifyOtpRequestDTO request);

    /**
     * Thực hiện đổi mật khẩu mới bằng Reset Token.
     */
    void resetPassword(ResetPasswordRequestDTO request);

    /**
     * Lấy chính sách mật khẩu hiện tại của hệ thống.
     */
    com.daiphat.accountservice.application.dto.response.PasswordPolicyResponseDTO getPasswordPolicy();
}
