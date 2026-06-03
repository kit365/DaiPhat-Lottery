package com.daiphat.coreapi.application.service.auth;

import com.daiphat.coreapi.application.dto.request.auth.ChangePasswordRequest;
import com.daiphat.coreapi.application.dto.request.auth.ForgotPasswordRequest;
import com.daiphat.coreapi.application.dto.request.auth.ResetPasswordRequest;
import com.daiphat.coreapi.application.dto.request.auth.VerifyOtpRequest;
import com.daiphat.coreapi.application.dto.response.auth.ForgotPasswordResponse;
import com.daiphat.coreapi.application.dto.response.auth.VerifyOtpResponse;
import com.daiphat.coreapi.application.event.AdminResetPasswordOtpEvent;
import com.daiphat.coreapi.application.event.AdminResetPasswordSuccessEvent;
import com.daiphat.coreapi.application.event.ForgotPasswordEvent;
import com.daiphat.coreapi.domain.exception.DomainException;
import com.daiphat.coreapi.domain.exception.ErrorCode;
import com.daiphat.coreapi.domain.model.UserModel;
import com.daiphat.coreapi.domain.model.auth.ResetTokenData;
import com.daiphat.coreapi.domain.model.enums.PasswordResetStatus;
import com.daiphat.coreapi.application.port.in.auth.PasswordResetServicePort;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.test.util.ReflectionTestUtils;

import java.time.Duration;
import java.time.LocalDateTime;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@DisplayName("Core PasswordResetService")
class PasswordResetServiceTest extends AuthTestBase {

    private PasswordResetServicePort passwordResetService;

    @BeforeEach
    void setUp() {
        passwordResetService = new PasswordResetService(
                userRepositoryPort,
                userLookupService,
                passwordResetCachePort,
                otpCachePort,
                eventPublisher,
                passwordHashPort,
                refreshTokenStorePort
        );
        ReflectionTestUtils.setField(passwordResetService, "otpTtlSeconds", 300L);
        ReflectionTestUtils.setField(passwordResetService, "resetTokenTtlSeconds", 600L);
        ReflectionTestUtils.setField(passwordResetService, "minPasswordLength", 6);
        ReflectionTestUtils.setField(passwordResetService, "maxPasswordLength", 100);
    }

    @Test
    void forgotPassword_success_savesOtpAndPublishesEvent() {
        when(userRepositoryPort.findByEmail(DEFAULT_EMAIL)).thenReturn(Optional.of(activeUser()));

        ForgotPasswordResponse response = passwordResetService.forgotPassword(
                ForgotPasswordRequest.builder().email(DEFAULT_EMAIL).build()
        );

        assertThat(response.getEmail()).isEqualTo(DEFAULT_EMAIL);
        assertThat(response.getExpiresIn()).isEqualTo(300L);
        verify(otpCachePort).saveOtp(eq(DEFAULT_EMAIL), any(), eq(Duration.ofSeconds(300)));
        verify(eventPublisher).publishEvent(any(ForgotPasswordEvent.class));
    }

    @Test
    void forgotPassword_unknownEmail_throwsEmailNotFound() {
        when(userRepositoryPort.findByEmail(DEFAULT_EMAIL)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> passwordResetService.forgotPassword(
                ForgotPasswordRequest.builder().email(DEFAULT_EMAIL).build()
        ))
                .isInstanceOf(DomainException.class)
                .extracting("errorCode")
                .isEqualTo(ErrorCode.EMAIL_NOT_FOUND);
    }

    @Test
    void verifyResetOtp_success_createsResetTokenAndClearsOtp() {
        VerifyOtpRequest request = VerifyOtpRequest.builder().email(DEFAULT_EMAIL).otp(DEFAULT_OTP).build();
        when(otpCachePort.getOtpAttemptCount(DEFAULT_EMAIL)).thenReturn(0);
        when(otpCachePort.getOtp(DEFAULT_EMAIL)).thenReturn(Optional.of(DEFAULT_OTP));

        VerifyOtpResponse response = passwordResetService.verifyResetOtp(request);

        assertThat(response.getResetToken()).isNotBlank();
        verify(passwordResetCachePort).saveResetTokenData(eq(response.getResetToken()), any(ResetTokenData.class), eq(Duration.ofSeconds(600)));
        verify(otpCachePort).deleteOtp(DEFAULT_EMAIL);
        verify(otpCachePort).resetOtpAttemptCount(DEFAULT_EMAIL);
    }

    @Test
    void verifyResetOtp_wrongOtp_incrementsAttemptAndThrows() {
        VerifyOtpRequest request = VerifyOtpRequest.builder().email(DEFAULT_EMAIL).otp("999999").build();
        when(otpCachePort.getOtpAttemptCount(DEFAULT_EMAIL)).thenReturn(0);
        when(otpCachePort.getOtp(DEFAULT_EMAIL)).thenReturn(Optional.of(DEFAULT_OTP));

        assertThatThrownBy(() -> passwordResetService.verifyResetOtp(request))
                .isInstanceOf(DomainException.class)
                .extracting("errorCode")
                .isEqualTo(ErrorCode.OTP_INVALID);

        verify(otpCachePort).incrementOtpAttempt(DEFAULT_EMAIL, Duration.ofSeconds(300));
    }

    @Test
    void resetPassword_success_updatesPasswordAndDeletesResetToken() {
        UserModel user = activeUser();
        ResetPasswordRequest request = ResetPasswordRequest.builder()
                .resetToken(RESET_TOKEN)
                .newPassword("Newpass1")
                .confirmPassword("Newpass1")
                .build();
        ResetTokenData data = ResetTokenData.builder()
                .email(DEFAULT_EMAIL)
                .status(PasswordResetStatus.VERIFIED)
                .createdAt(LocalDateTime.now())
                .build();

        when(passwordResetCachePort.getResetTokenData(RESET_TOKEN)).thenReturn(Optional.of(data));
        when(userRepositoryPort.findByEmail(DEFAULT_EMAIL)).thenReturn(Optional.of(user));
        when(passwordHashPort.encode("Newpass1")).thenReturn("encoded-new");

        passwordResetService.resetPassword(request);

        assertThat(user.getPassword()).isEqualTo("encoded-new");
        verify(userRepositoryPort).save(user);
        verify(refreshTokenStorePort).delete(DEFAULT_USER_ID);
        verify(passwordResetCachePort).deleteResetTokenData(RESET_TOKEN);
    }

    @Test
    void resetPassword_confirmMismatch_throws() {
        ResetPasswordRequest request = ResetPasswordRequest.builder()
                .resetToken(RESET_TOKEN)
                .newPassword("Newpass1")
                .confirmPassword("Otherpass1")
                .build();
        when(passwordResetCachePort.getResetTokenData(RESET_TOKEN)).thenReturn(Optional.of(verifiedResetToken()));

        assertThatThrownBy(() -> passwordResetService.resetPassword(request))
                .isInstanceOf(DomainException.class)
                .extracting("errorCode")
                .isEqualTo(ErrorCode.PASSWORD_CONFIRM_MISMATCH);

        verify(userRepositoryPort, never()).save(any());
    }

    @Test
    void initiatePasswordReset_success_savesOtpForActiveUser() {
        UserModel user = activeUser();
        when(userLookupService.findActiveByIdOrThrow(DEFAULT_USER_ID)).thenReturn(user);

        passwordResetService.initiatePasswordReset(DEFAULT_USER_ID);

        verify(otpCachePort).saveOtp(eq(DEFAULT_EMAIL), any(), eq(Duration.ofSeconds(300)));
        verify(eventPublisher).publishEvent(any(AdminResetPasswordOtpEvent.class));
    }

    @Test
    void confirmPasswordReset_success_generatesTemporaryPasswordAndForcesChange() {
        UserModel user = activeUser();
        when(userLookupService.findActiveByIdOrThrow(DEFAULT_USER_ID)).thenReturn(user);
        when(otpCachePort.getOtpAttemptCount(DEFAULT_EMAIL)).thenReturn(0);
        when(otpCachePort.getOtp(DEFAULT_EMAIL)).thenReturn(Optional.of(DEFAULT_OTP));
        when(passwordHashPort.encode(any())).thenReturn("encoded-temporary");

        passwordResetService.confirmPasswordReset(DEFAULT_USER_ID, DEFAULT_OTP);

        assertThat(user.getPassword()).isEqualTo("encoded-temporary");
        assertThat(ReflectionTestUtils.getField(user, "hasPassword")).isEqualTo(false);
        verify(userRepositoryPort).save(user);
        verify(refreshTokenStorePort).delete(DEFAULT_USER_ID);
        verify(eventPublisher).publishEvent(any(AdminResetPasswordSuccessEvent.class));
    }

    @Test
    void changePassword_success_requiresCurrentPassword() {
        UserModel user = activeUser();
        ChangePasswordRequest request = ChangePasswordRequest.builder()
                .currentPassword(DEFAULT_PASSWORD)
                .newPassword("Newpass1")
                .confirmPassword("Newpass1")
                .build();

        when(userLookupService.findActiveByIdOrThrow(DEFAULT_USER_ID)).thenReturn(user);
        when(passwordHashPort.matches(DEFAULT_PASSWORD, ENCODED_PASSWORD)).thenReturn(true);
        when(passwordHashPort.encode("Newpass1")).thenReturn("encoded-new");

        passwordResetService.changePassword(DEFAULT_USER_ID, request);

        assertThat(user.getPassword()).isEqualTo("encoded-new");
        verify(userRepositoryPort).save(user);
        verify(refreshTokenStorePort).delete(DEFAULT_USER_ID);
    }

    @Test
    void changePassword_wrongCurrentPassword_throwsInvalidCredentials() {
        UserModel user = activeUser();
        ChangePasswordRequest request = ChangePasswordRequest.builder()
                .currentPassword("wrong")
                .newPassword("Newpass1")
                .confirmPassword("Newpass1")
                .build();

        when(userLookupService.findActiveByIdOrThrow(DEFAULT_USER_ID)).thenReturn(user);
        when(passwordHashPort.matches("wrong", ENCODED_PASSWORD)).thenReturn(false);

        assertThatThrownBy(() -> passwordResetService.changePassword(DEFAULT_USER_ID, request))
                .isInstanceOf(DomainException.class)
                .extracting("errorCode")
                .isEqualTo(ErrorCode.INVALID_CREDENTIALS);
    }

    private ResetTokenData verifiedResetToken() {
        return ResetTokenData.builder()
                .email(DEFAULT_EMAIL)
                .status(PasswordResetStatus.VERIFIED)
                .createdAt(LocalDateTime.now())
                .build();
    }
}
