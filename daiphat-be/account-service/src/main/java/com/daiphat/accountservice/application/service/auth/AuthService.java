package com.daiphat.accountservice.application.service.auth;

import com.daiphat.accountservice.application.dto.request.auth.*;
import com.daiphat.accountservice.application.dto.request.user.UserRegistrationRequest;
import com.daiphat.accountservice.application.dto.response.auth.AuthResponse;
import com.daiphat.accountservice.application.dto.response.auth.ForgotPasswordResponse;
import com.daiphat.accountservice.application.dto.response.auth.PasswordPolicyResponse;
import com.daiphat.accountservice.application.dto.response.auth.VerifyOtpResponse;
import com.daiphat.accountservice.application.port.in.auth.*;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.UUID;

@Service
@Slf4j
@RequiredArgsConstructor
public class AuthService implements AuthServicePort {

    private final LoginServicePort loginService;
    private final RegistrationServicePort registrationService;
    private final PasswordResetServicePort passwordResetService;
    private final OAuthProvisioningPort oAuthProvisioningPort;
 
    @Override
    public PasswordPolicyResponse getPasswordPolicy() {
        return passwordResetService.getPasswordPolicy();
    }

    @Override
    @Transactional
    public AuthResponse login(LoginRequest request) {
        return loginService.login(request);
    }

    @Override
    public void logout(LogoutRequest request) {
        loginService.logout(request.getRefreshToken());
    }

    @Override
    @Transactional
    public AuthResponse refreshToken(RefreshTokenRequest request) {
        return loginService.refreshToken(request);
    }

    @Override
    @Transactional
    public void register(UserRegistrationRequest request) {
        registrationService.register(request);
    }

    @Override
    @Transactional
    public ForgotPasswordResponse forgotPassword(ForgotPasswordRequest request) {
        return passwordResetService.forgotPassword(request);
    }

    @Override
    public ForgotPasswordResponse resendForgotPasswordOtp(ForgotPasswordRequest request) {
        return passwordResetService.resendForgotPasswordOtp(request);
    }

    @Override
    public VerifyOtpResponse verifyResetOtp(VerifyOtpRequest request) {
        return passwordResetService.verifyResetOtp(request);
    }

    @Override
    public void resetPassword(ResetPasswordRequest request) {
        passwordResetService.resetPassword(request);
    }

    @Override
    @Transactional
    public void verifyEmail(String token) {
        registrationService.verifyEmail(token);
    }

    @Override
    @Transactional
    public void resendVerificationEmail(String email) {
        registrationService.resendVerificationEmail(email);
    }

    @Override
    @Transactional
    public void changePassword(UUID id, String newPassword) {
        passwordResetService.changePassword(id, newPassword);
    }

    @Override
    @Transactional
    public void initiatePasswordReset(UUID id) {
        passwordResetService.initiatePasswordReset(id);
    }

    @Override
    @Transactional
    public void confirmPasswordReset(UUID id, String otp) {
        passwordResetService.confirmPasswordReset(id, otp);
    }
}
