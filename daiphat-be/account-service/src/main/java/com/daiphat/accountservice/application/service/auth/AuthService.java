package com.daiphat.accountservice.application.service.auth;
import com.daiphat.accountservice.application.dto.request.*;
import com.daiphat.accountservice.application.dto.response.AuthResponseDTO;
import com.daiphat.accountservice.application.dto.response.ForgotPasswordResponseDTO;
import com.daiphat.accountservice.application.dto.response.PasswordPolicyResponseDTO;
import com.daiphat.accountservice.application.dto.response.VerifyOtpResponseDTO;
import com.daiphat.accountservice.application.port.in.AuthServicePort;
import com.daiphat.accountservice.application.port.in.auth.LoginServicePort;
import com.daiphat.accountservice.application.port.in.auth.PasswordResetServicePort;
import com.daiphat.accountservice.application.port.in.auth.RegistrationServicePort;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;


@Service
@Slf4j
@RequiredArgsConstructor
public class AuthService implements AuthServicePort {

    private final LoginServicePort loginService;
    private final RegistrationServicePort registrationService;
    private final PasswordResetServicePort passwordResetService;
 
    @Override
    public PasswordPolicyResponseDTO getPasswordPolicy() {
        return passwordResetService.getPasswordPolicy();
    }

    @Override
    @Transactional
    public AuthResponseDTO login(LoginRequestDTO request) {
        return loginService.login(request);
    }

    @Override
    public void logout(LogoutRequestDTO request) {
        loginService.logout(request.getRefreshToken());
    }

    @Override
    @Transactional
    public AuthResponseDTO refreshToken(RefreshTokenRequestDTO request) {
        return loginService.refreshToken(request);
    }

    @Override
    @Transactional
    public void register(UserRegistrationRequestDTO request) {
        registrationService.register(request);
    }

    @Override
    @Transactional
    public ForgotPasswordResponseDTO forgotPassword(ForgotPasswordRequestDTO request) {
        return passwordResetService.forgotPassword(request);
    }

    @Override
    public ForgotPasswordResponseDTO resendForgotPasswordOtp(ForgotPasswordRequestDTO request) {
        return passwordResetService.resendForgotPasswordOtp(request);
    }

    @Override
    public VerifyOtpResponseDTO verifyResetOtp(VerifyOtpRequestDTO request) {
        return passwordResetService.verifyResetOtp(request);
    }

    @Override
    public void resetPassword(ResetPasswordRequestDTO request) {
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


}