package com.daiphat.coreapi.application.service.auth;

import com.daiphat.coreapi.application.dto.request.auth.ChangePasswordRequest;
import com.daiphat.coreapi.application.dto.request.auth.ForgotPasswordRequest;
import com.daiphat.coreapi.application.dto.request.auth.GoogleLoginRequest;
import com.daiphat.coreapi.application.dto.request.auth.LoginRequest;
import com.daiphat.coreapi.application.dto.request.auth.LogoutRequest;
import com.daiphat.coreapi.application.dto.request.auth.RefreshTokenRequest;
import com.daiphat.coreapi.application.dto.request.auth.ResetPasswordRequest;
import com.daiphat.coreapi.application.dto.request.auth.VerifyOtpRequest;
import com.daiphat.coreapi.application.dto.request.user.UserRegistrationRequest;
import com.daiphat.coreapi.application.dto.response.auth.AuthResponse;
import com.daiphat.coreapi.application.dto.response.auth.ForgotPasswordResponse;
import com.daiphat.coreapi.application.dto.response.auth.VerifyOtpResponse;
import com.daiphat.coreapi.application.port.in.auth.AuthServicePort;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@DisplayName("Core AuthService facade")
class AuthServiceTest extends AuthTestBase {

    private AuthServicePort authService;

    @BeforeEach
    void setUp() {
        authService = new AuthService(loginServicePort, registrationServicePort, passwordResetServicePort);
    }

    @Test
    void login_delegatesToLoginService() {
        LoginRequest request = new LoginRequest(DEFAULT_USERNAME, DEFAULT_PASSWORD);
        AuthResponse expected = AuthResponse.builder().accessToken(ACCESS_TOKEN).build();
        when(loginServicePort.login(request)).thenReturn(expected);

        AuthResponse response = authService.login(request);

        assertThat(response).isSameAs(expected);
    }

    @Test
    void loginWithGoogle_delegatesToLoginService() {
        GoogleLoginRequest request = new GoogleLoginRequest("code", null, null, "redirect", null);
        AuthResponse expected = AuthResponse.builder().accessToken(ACCESS_TOKEN).build();
        when(loginServicePort.loginWithGoogle(request)).thenReturn(expected);

        AuthResponse response = authService.loginWithGoogle(request);

        assertThat(response).isSameAs(expected);
    }

    @Test
    void refreshAndLogout_delegateToLoginService() {
        RefreshTokenRequest refreshRequest = new RefreshTokenRequest(REFRESH_TOKEN);
        AuthResponse expected = AuthResponse.builder().refreshToken(NEW_REFRESH_TOKEN).build();
        when(loginServicePort.refreshToken(refreshRequest)).thenReturn(expected);

        assertThat(authService.refreshToken(refreshRequest)).isSameAs(expected);

        authService.logout(new LogoutRequest(REFRESH_TOKEN));
        verify(loginServicePort).logout(REFRESH_TOKEN);
    }

    @Test
    void registrationMethods_delegateToRegistrationService() {
        UserRegistrationRequest registerRequest = UserRegistrationRequest.builder()
                .username(DEFAULT_USERNAME)
                .email(DEFAULT_EMAIL)
                .password(DEFAULT_PASSWORD)
                .firstName("Kiet")
                .lastName("Ngo")
                .phone("0901234567")
                .agreedToTerms(true)
                .build();

        authService.register(registerRequest);
        authService.verifyEmail(RESET_TOKEN);
        authService.resendVerificationEmail(DEFAULT_EMAIL);

        verify(registrationServicePort).register(registerRequest);
        verify(registrationServicePort).verifyEmail(RESET_TOKEN);
        verify(registrationServicePort).resendVerificationEmail(DEFAULT_EMAIL);
    }

    @Test
    void passwordResetMethods_delegateToPasswordResetService() {
        ForgotPasswordRequest forgotRequest = ForgotPasswordRequest.builder().email(DEFAULT_EMAIL).build();
        VerifyOtpRequest verifyRequest = VerifyOtpRequest.builder().email(DEFAULT_EMAIL).otp(DEFAULT_OTP).build();
        ResetPasswordRequest resetRequest = ResetPasswordRequest.builder()
                .resetToken(RESET_TOKEN)
                .newPassword("Newpass1")
                .confirmPassword("Newpass1")
                .build();
        ChangePasswordRequest changeRequest = ChangePasswordRequest.builder()
                .currentPassword(DEFAULT_PASSWORD)
                .newPassword("Newpass1")
                .confirmPassword("Newpass1")
                .build();
        ForgotPasswordResponse forgotResponse = ForgotPasswordResponse.builder().email(DEFAULT_EMAIL).build();
        VerifyOtpResponse verifyResponse = VerifyOtpResponse.builder().resetToken(RESET_TOKEN).build();

        when(passwordResetServicePort.forgotPassword(forgotRequest)).thenReturn(forgotResponse);
        when(passwordResetServicePort.resendForgotPasswordOtp(forgotRequest)).thenReturn(forgotResponse);
        when(passwordResetServicePort.verifyResetOtp(verifyRequest)).thenReturn(verifyResponse);

        assertThat(authService.forgotPassword(forgotRequest)).isSameAs(forgotResponse);
        assertThat(authService.resendForgotPasswordOtp(forgotRequest)).isSameAs(forgotResponse);
        assertThat(authService.verifyResetOtp(verifyRequest)).isSameAs(verifyResponse);
        authService.resetPassword(resetRequest);
        authService.initiatePasswordReset(DEFAULT_USER_ID);
        authService.confirmPasswordReset(DEFAULT_USER_ID, DEFAULT_OTP);
        authService.changePassword(DEFAULT_USER_ID, changeRequest);

        verify(passwordResetServicePort).resetPassword(resetRequest);
        verify(passwordResetServicePort).initiatePasswordReset(DEFAULT_USER_ID);
        verify(passwordResetServicePort).confirmPasswordReset(DEFAULT_USER_ID, DEFAULT_OTP);
        verify(passwordResetServicePort).changePassword(DEFAULT_USER_ID, changeRequest);
    }

    @Test
    void getPasswordPolicy_delegatesToPasswordResetService() {
        com.daiphat.coreapi.application.dto.response.auth.PasswordPolicyResponse expected = com.daiphat.coreapi.application.dto.response.auth.PasswordPolicyResponse.builder().minLength(8).maxLength(20).build();
        when(passwordResetServicePort.getPasswordPolicy()).thenReturn(expected);

        com.daiphat.coreapi.application.dto.response.auth.PasswordPolicyResponse actual = authService.getPasswordPolicy();

        assertThat(actual).isSameAs(expected);
        verify(passwordResetServicePort).getPasswordPolicy();
    }
}
