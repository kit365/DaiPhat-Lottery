package com.daiphat.accountservice.application.port.in;
import com.daiphat.accountservice.application.dto.request.*;
import com.daiphat.accountservice.application.dto.response.AuthResponseDTO;
import com.daiphat.accountservice.application.dto.response.ForgotPasswordResponseDTO;
import com.daiphat.accountservice.application.dto.response.PasswordPolicyResponseDTO;
import com.daiphat.accountservice.application.dto.response.VerifyOtpResponseDTO;


public interface AuthServicePort {
    PasswordPolicyResponseDTO getPasswordPolicy();
    AuthResponseDTO login(LoginRequestDTO request);
    void logout(LogoutRequestDTO request);
    AuthResponseDTO refreshToken(RefreshTokenRequestDTO request);
    void register(UserRegistrationRequestDTO request);
    void verifyEmail(String token);
    void resendVerificationEmail(String email);

    ForgotPasswordResponseDTO forgotPassword(ForgotPasswordRequestDTO request);
    ForgotPasswordResponseDTO resendForgotPasswordOtp(ForgotPasswordRequestDTO request);
    VerifyOtpResponseDTO verifyResetOtp(VerifyOtpRequestDTO request);
    void resetPassword(ResetPasswordRequestDTO request);

}
