package com.daiphat.accountservice.application.port.in.auth;
import com.daiphat.accountservice.application.dto.request.auth.*;
import com.daiphat.accountservice.application.dto.request.user.UserRegistrationRequest;
import com.daiphat.accountservice.application.dto.response.auth.AuthResponse;
import com.daiphat.accountservice.application.dto.response.auth.ForgotPasswordResponse;
import com.daiphat.accountservice.application.dto.response.auth.PasswordPolicyResponse;
import com.daiphat.accountservice.application.dto.response.auth.VerifyOtpResponse;


public interface AuthServicePort {
    PasswordPolicyResponse getPasswordPolicy();
    AuthResponse login(LoginRequest request);
    void logout(LogoutRequest request);
    AuthResponse refreshToken(RefreshTokenRequest request);
    void register(UserRegistrationRequest request);
    void verifyEmail(String token);
    void resendVerificationEmail(String email);

    ForgotPasswordResponse forgotPassword(ForgotPasswordRequest request);
    ForgotPasswordResponse resendForgotPasswordOtp(ForgotPasswordRequest request);
    VerifyOtpResponse verifyResetOtp(VerifyOtpRequest request);
    void resetPassword(ResetPasswordRequest request);

    // Admin initiated password actions
    void changePassword(java.util.UUID id, String newPassword);
    void initiatePasswordReset(java.util.UUID id);
    void confirmPasswordReset(java.util.UUID id, String otp);
}
