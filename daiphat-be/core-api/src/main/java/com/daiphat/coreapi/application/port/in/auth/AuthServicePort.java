package com.daiphat.coreapi.application.port.in.auth;

import com.daiphat.coreapi.application.dto.request.auth.LoginRequest;
import com.daiphat.coreapi.application.dto.request.auth.ChangePasswordRequest;
import com.daiphat.coreapi.application.dto.request.auth.GoogleLoginRequest;
import com.daiphat.coreapi.application.dto.request.auth.LogoutRequest;
import com.daiphat.coreapi.application.dto.request.auth.RefreshTokenRequest;
import com.daiphat.coreapi.application.dto.request.auth.ForgotPasswordRequest;
import com.daiphat.coreapi.application.dto.request.auth.ResetPasswordRequest;
import com.daiphat.coreapi.application.dto.request.auth.VerifyOtpRequest;
import com.daiphat.coreapi.application.dto.request.user.UserRegistrationRequest;
import com.daiphat.coreapi.application.dto.response.auth.AuthResponse;
import com.daiphat.coreapi.application.dto.response.auth.ForgotPasswordResponse;
import com.daiphat.coreapi.application.dto.response.auth.PasswordPolicyResponse;
import com.daiphat.coreapi.application.dto.response.auth.VerifyOtpResponse;

import jakarta.validation.Valid;

import java.util.UUID;

public interface AuthServicePort {
    AuthResponse login(LoginRequest request);

    AuthResponse loginWithGoogle(GoogleLoginRequest request);

    AuthResponse refreshToken(@Valid RefreshTokenRequest request);

    void logout(LogoutRequest request);

    void register(UserRegistrationRequest request);

    void verifyEmail(String token);

    void resendVerificationEmail(String email);

    ForgotPasswordResponse forgotPassword(ForgotPasswordRequest request);

    ForgotPasswordResponse resendForgotPasswordOtp(ForgotPasswordRequest request);

    VerifyOtpResponse verifyResetOtp(VerifyOtpRequest request);

    void resetPassword(ResetPasswordRequest request);

    void initiatePasswordReset(UUID id);

    void confirmPasswordReset(UUID id, String otp);

    void changePassword(UUID id, ChangePasswordRequest request);

    PasswordPolicyResponse getPasswordPolicy();
}
