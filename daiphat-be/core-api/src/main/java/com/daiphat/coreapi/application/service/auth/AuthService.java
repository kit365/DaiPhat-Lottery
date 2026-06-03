package com.daiphat.coreapi.application.service.auth;

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
import com.daiphat.coreapi.application.port.in.auth.AuthServicePort;
import com.daiphat.coreapi.application.port.in.auth.LoginServicePort;
import com.daiphat.coreapi.application.port.in.auth.PasswordResetServicePort;
import com.daiphat.coreapi.application.port.in.auth.RegistrationServicePort;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.validation.annotation.Validated;
import jakarta.validation.Valid;

import java.util.UUID;

@Service
@RequiredArgsConstructor
@Validated
public class AuthService implements AuthServicePort {

    private final LoginServicePort loginService;
    private final RegistrationServicePort registrationService;
    private final PasswordResetServicePort passwordResetService;

    @Override
    @Transactional
    public AuthResponse login(LoginRequest request) {
        return loginService.login(request);
    }

    @Override
    @Transactional
    public AuthResponse loginWithGoogle(GoogleLoginRequest request) {
        return loginService.loginWithGoogle(request);
    }

    @Override
    @Transactional
    public AuthResponse refreshToken(@Valid RefreshTokenRequest request) {
        return loginService.refreshToken(request);
    }

    @Override
    public void logout(LogoutRequest request) {
        loginService.logout(request.refreshToken());
    }

    @Override
    @Transactional
    public void register(UserRegistrationRequest request) {
        registrationService.register(request);
    }

    @Override
    @Transactional
    public void verifyEmail(String token) {
        registrationService.verifyEmail(token);
    }

    @Override
    public void resendVerificationEmail(String email) {
        registrationService.resendVerificationEmail(email);
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
    @Transactional
    public void resetPassword(ResetPasswordRequest request) {
        passwordResetService.resetPassword(request);
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

    @Override
    @Transactional
    public void changePassword(UUID id, ChangePasswordRequest request) {
        passwordResetService.changePassword(id, request);
    }

    @Override
    public PasswordPolicyResponse getPasswordPolicy() {
        return passwordResetService.getPasswordPolicy();
    }
}
