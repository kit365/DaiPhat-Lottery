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
import com.daiphat.coreapi.domain.model.enums.auth.PasswordResetStatus;
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

@DisplayName("Core PasswordResetService - Test Suite")
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
    @DisplayName("TC-FGT-001: Gửi yêu cầu reset password thành công và lưu OTP")
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
    @DisplayName("TC-FGT-002: Gửi yêu cầu reset thất bại - Email không tồn tại")
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
    @DisplayName("TC-FGT-004: Xác minh OTP thành công, tạo reset token và xóa OTP")
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
    @DisplayName("TC-FGT-005: Xác minh OTP thất bại - OTP không chính xác")
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
    @DisplayName("TC-FGT-006 & 010: Xác minh OTP thất bại - OTP đã hết hạn hoặc bị xóa")
    void verifyResetOtp_fail_otpExpired() {
        VerifyOtpRequest request = VerifyOtpRequest.builder().email(DEFAULT_EMAIL).otp(DEFAULT_OTP).build();
        when(otpCachePort.getOtpAttemptCount(DEFAULT_EMAIL)).thenReturn(0);
        when(otpCachePort.getOtp(DEFAULT_EMAIL)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> passwordResetService.verifyResetOtp(request))
                .isInstanceOf(DomainException.class)
                .extracting("errorCode")
                .isEqualTo(ErrorCode.OTP_EXPIRED);
    }

    @Test
    @DisplayName("TC-FGT-007: Đổi mật khẩu thành công và thu hồi tất cả refresh token cũ")
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
    @DisplayName("TC-FGT-009: Đổi mật khẩu thất bại - Xác nhận mật khẩu không khớp")
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
    @DisplayName("ADMIN: Khởi tạo reset mật khẩu bởi Admin thành công")
    void initiatePasswordReset_success_savesOtpForActiveUser() {
        UserModel user = activeUser();
        when(userLookupService.findActiveByIdOrThrow(DEFAULT_USER_ID)).thenReturn(user);

        passwordResetService.initiatePasswordReset(DEFAULT_USER_ID);

        verify(otpCachePort).saveOtp(eq(DEFAULT_EMAIL), any(), eq(Duration.ofSeconds(300)));
        verify(eventPublisher).publishEvent(any(AdminResetPasswordOtpEvent.class));
    }

    @Test
    @DisplayName("ADMIN: Xác nhận reset mật khẩu bởi Admin, sinh mật khẩu tạm thời")
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
    @DisplayName("USER: Đổi mật khẩu trong trang cá nhân thành công")
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
    @DisplayName("USER: Đổi mật khẩu cá nhân thất bại - Mật khẩu hiện tại sai")
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


    /* =========================================================================
     * COMMENTED OUT TESTS: Các tính năng cũ chưa có hoặc đã thay đổi trong Monolith
     * (Giữ lại làm tài liệu tham khảo cho tương lai)
     * ========================================================================= */

    /*
    @Test
    @DisplayName("TC-FGT-003: Gửi yêu cầu reset - Field Email trống (JSR-380 Validation)")
    // Được kiểm thử ở Controller Layer thông qua DTO Validation Annotations (@NotBlank, @Email)

    @Test
    @DisplayName("TC-FGT-008: Đổi mật khẩu - Mật khẩu mới trống (JSR-380 Validation)")
    // Được kiểm thử ở Controller Layer thông qua DTO Validation Annotations

    @Test
    @DisplayName("TC-FGT-011: Token format sai (JSR-380 Validation trên OTP field)")
    // Được kiểm thử ở Controller Layer thông qua DTO Validation Annotations

    @Test
    @DisplayName("TC-FGT-002-ALT: Tăng loginAttemptService khi email không tồn tại")
    void forgotPassword_Fail_EmailNotFound_loginAttempt() {
        // Monolith không còn tiêm loginAttemptService vào PasswordResetService
    }

    @Test
    @DisplayName("TC-FGT-004-ALT: Reset rate limit khi OTP đúng")
    void verifyResetOtp_Success_rateLimit() {
        // Monolith không còn RateLimiterPort tiêm vào PasswordResetService
    }

    @Test
    @DisplayName("TC-FGT-007-ALT: Reset password qua Keycloak IDP")
    void resetPassword_Success_keycloak() {
        // Monolith lưu trữ thông tin mật khẩu local qua local DB, không đồng bộ sang Keycloak IDP
    }
    */

    private ResetTokenData verifiedResetToken() {
        return ResetTokenData.builder()
                .email(DEFAULT_EMAIL)
                .status(PasswordResetStatus.VERIFIED)
                .createdAt(LocalDateTime.now())
                .build();
    }
}
