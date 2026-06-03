package com.daiphat.coreapi.application.port.in.auth;

import com.daiphat.coreapi.application.dto.request.auth.ForgotPasswordRequest;
import com.daiphat.coreapi.application.dto.request.auth.ChangePasswordRequest;
import com.daiphat.coreapi.application.dto.request.auth.ResetPasswordRequest;
import com.daiphat.coreapi.application.dto.request.auth.VerifyOtpRequest;
import com.daiphat.coreapi.application.dto.response.auth.ForgotPasswordResponse;
import com.daiphat.coreapi.application.dto.response.auth.PasswordPolicyResponse;
import com.daiphat.coreapi.application.dto.response.auth.VerifyOtpResponse;

import java.util.UUID;

public interface PasswordResetServicePort {
    ForgotPasswordResponse forgotPassword(ForgotPasswordRequest request);

    ForgotPasswordResponse resendForgotPasswordOtp(ForgotPasswordRequest request);

    VerifyOtpResponse verifyResetOtp(VerifyOtpRequest request);

    void resetPassword(ResetPasswordRequest request);

    void initiatePasswordReset(UUID id);

    void confirmPasswordReset(UUID id, String otp);

    void changePassword(UUID id, ChangePasswordRequest request);

    PasswordPolicyResponse getPasswordPolicy();
}
