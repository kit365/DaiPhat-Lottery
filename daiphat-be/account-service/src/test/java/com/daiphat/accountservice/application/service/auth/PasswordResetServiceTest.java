package com.daiphat.accountservice.application.service.auth;
 
import com.daiphat.accountservice.application.dto.request.auth.ForgotPasswordRequest;
import com.daiphat.accountservice.application.dto.request.auth.ResetPasswordRequest;
import com.daiphat.accountservice.application.dto.request.auth.VerifyOtpRequest;
import com.daiphat.accountservice.application.dto.response.auth.ForgotPasswordResponse;
import com.daiphat.accountservice.application.dto.response.auth.VerifyOtpResponse;
import com.daiphat.accountservice.application.event.ForgotPasswordEvent;
import com.daiphat.accountservice.application.port.in.auth.PasswordResetServicePort;
import com.daiphat.accountservice.application.port.out.user.UserRepositoryPort;
import com.daiphat.accountservice.application.port.out.auth.cache.OtpCachePort;
import com.daiphat.accountservice.application.port.out.auth.cache.PasswordResetCachePort;
import com.daiphat.accountservice.domain.exception.DomainException;
import com.daiphat.accountservice.domain.exception.ErrorCode;
import com.daiphat.accountservice.domain.model.UserModel;
import com.daiphat.accountservice.domain.model.auth.ResetTokenData;
import jakarta.validation.ConstraintViolation;
import jakarta.validation.Validation;
import jakarta.validation.Validator;
import jakarta.validation.ValidatorFactory;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.mockito.Mock;
import org.springframework.transaction.support.TransactionTemplate;
 
import org.springframework.transaction.TransactionStatus;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;
import java.util.function.Consumer;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@DisplayName("TC-FGT-DP-27")
class PasswordResetServiceTest extends AuthTestBase {

    private PasswordResetServicePort passwordResetService;
    private Validator validator;

    @Mock private UserRepositoryPort userRepositoryPort;
    @Mock private PasswordResetCachePort passwordResetCachePort;
    @Mock private OtpCachePort otpCachePort;
    @Mock private TransactionTemplate transactionTemplate;

    @BeforeEach
    @Override
    protected void setUp() {
        super.setUp();
        try (ValidatorFactory factory = Validation.buildDefaultValidatorFactory()) {
            validator = factory.getValidator();
        }

        passwordResetService = new PasswordResetService(
                userRepositoryPort,
                passwordResetCachePort,
                otpCachePort,
                authProperties,
                eventPublisher,
                rateLimiterService,
                identityManagementPort,
                loginAttemptService,
                userLookupService,
                userValidationService
        );

        // Mock TransactionTemplate behavior (lenient because not all tests use it)
        lenient().doAnswer(invocation -> {
            Consumer<TransactionStatus> callback = invocation.getArgument(0);
            callback.accept(null);
            return null;
        }).when(transactionTemplate).executeWithoutResult(any());
    }
 
    @Test
    @DisplayName(TC_FGT_PREFIX + "001: Gửi yêu cầu reset password thành công")
    void forgotPassword_Success() {
        // GIVEN
        ForgotPasswordRequest request = ForgotPasswordRequest.builder().email(DEFAULT_EMAIL).build();
        UserModel mockUser = mock(UserModel.class);
        when(userLookupService.findByEmailOrThrow(DEFAULT_EMAIL)).thenReturn(mockUser);
 
        // WHEN
        ForgotPasswordResponse response = passwordResetService.forgotPassword(request);
 
        // THEN
        assertNotNull(response);
        assertEquals(DEFAULT_EMAIL, response.getEmail());
        verify(otpCachePort).saveOtp(eq(DEFAULT_EMAIL), anyString(), any());
        verify(eventPublisher).publishEvent(any(ForgotPasswordEvent.class));
    }
 
    @Test
    @DisplayName(TC_FGT_PREFIX + "002: Gửi yêu cầu reset - Email không tồn tại")
    void forgotPassword_Fail_EmailNotFound() {
        // GIVEN
        ForgotPasswordRequest request = ForgotPasswordRequest.builder().email(NOT_FOUND_USERNAME).build();
        when(userLookupService.findByEmailOrThrow(NOT_FOUND_USERNAME))
                .thenThrow(new DomainException(ErrorCode.USER_NOT_FOUND));
 
        // WHEN
        DomainException exception = assertThrows(DomainException.class, () -> passwordResetService.forgotPassword(request));
 
        // THEN
        assertEquals(ErrorCode.USER_NOT_FOUND, exception.getErrorCode());
        verify(loginAttemptService).recordFailedAttempt(NOT_FOUND_USERNAME);
    }
 
    @Test
    @DisplayName(TC_FGT_PREFIX + "003: Gửi yêu cầu reset - Field Email trống")
    void validation_Fail_EmailEmpty() {
        ForgotPasswordRequest request = ForgotPasswordRequest.builder().email("").build();
 
        Set<ConstraintViolation<ForgotPasswordRequest>> violations = validator.validate(request);
        assertFalse(violations.isEmpty());
        assertTrue(violations.stream().anyMatch(v -> v.getMessage().equals(ForgotPasswordRequest.MSG_EMAIL_REQUIRED)));
    }
 
    @Test
    @DisplayName(TC_FGT_PREFIX + "004: Xác minh OTP thành công")
    void verifyResetOtp_Success() {
        // GIVEN
        VerifyOtpRequest request = VerifyOtpRequest.builder().email(DEFAULT_EMAIL).otp(DEFAULT_OTP).build();
        when(otpCachePort.getOtpAttemptCount(DEFAULT_EMAIL)).thenReturn(0);
        when(otpCachePort.getOtp(DEFAULT_EMAIL)).thenReturn(Optional.of(DEFAULT_OTP));
 
        // WHEN
        VerifyOtpResponse response = passwordResetService.verifyResetOtp(request);
 
        // THEN
        assertNotNull(response.getResetToken());
        verify(passwordResetCachePort).saveResetTokenData(anyString(), any(), any());
        verify(otpCachePort).deleteOtp(DEFAULT_EMAIL);
        verify(rateLimiterService).resetRateLimit(DEFAULT_EMAIL, com.daiphat.accountservice.application.port.out.auth.keys.AuthAction.FORGOT_PASSWORD);
    }
 
    @Test
    @DisplayName(TC_FGT_PREFIX + "005: Xác minh OTP - OTP không hợp lệ")
    void verifyResetOtp_Fail_InvalidOtp() {
        // GIVEN
        VerifyOtpRequest request = VerifyOtpRequest.builder().email(DEFAULT_EMAIL).otp(WRONG_OTP).build();
        when(otpCachePort.getOtpAttemptCount(DEFAULT_EMAIL)).thenReturn(1);
        when(otpCachePort.getOtp(DEFAULT_EMAIL)).thenReturn(Optional.of(DEFAULT_OTP));
 
        // WHEN
        DomainException exception = assertThrows(DomainException.class, () -> passwordResetService.verifyResetOtp(request));
 
        // THEN
        assertEquals(ErrorCode.OTP_INVALID, exception.getErrorCode());
        verify(otpCachePort).incrementOtpAttempt(eq(DEFAULT_EMAIL), any());
    }
 
    @Test
    @DisplayName(TC_FGT_PREFIX + "006: Xác minh OTP - OTP hết hạn")
    void verifyResetOtp_Fail_OtpExpired() {
        // GIVEN
        VerifyOtpRequest request = VerifyOtpRequest.builder().email(DEFAULT_EMAIL).otp(DEFAULT_OTP).build();
        when(otpCachePort.getOtpAttemptCount(DEFAULT_EMAIL)).thenReturn(0);
        when(otpCachePort.getOtp(DEFAULT_EMAIL)).thenReturn(Optional.empty());
 
        // WHEN
        DomainException exception = assertThrows(DomainException.class, () -> passwordResetService.verifyResetOtp(request));
 
        // THEN
        assertEquals(ErrorCode.OTP_EXPIRED, exception.getErrorCode());
    }
 
    @Test
    @DisplayName(TC_FGT_PREFIX + "007: Đổi mật khẩu thành công")
    void resetPassword_Success() {
        // GIVEN
        String resetToken = UUID.randomUUID().toString();
        ResetPasswordRequest request = ResetPasswordRequest.builder()
                .resetToken(resetToken)
                .newPassword(DEFAULT_PASSWORD)
                .confirmPassword(DEFAULT_PASSWORD)
                .build();
        
        ResetTokenData data = ResetTokenData.builder()
                .email(DEFAULT_EMAIL)
                .status(com.daiphat.accountservice.domain.model.enums.PasswordResetStatus.VERIFIED)
                .build();
        
        UserModel mockUser = mock(UserModel.class);
        UUID keycloakId = UUID.randomUUID();
        when(mockUser.getId()).thenReturn(keycloakId);
        
        when(passwordResetCachePort.getResetTokenData(resetToken)).thenReturn(Optional.of(data));
        when(userLookupService.findByEmailOrThrow(DEFAULT_EMAIL)).thenReturn(mockUser);
 
        // WHEN
        assertDoesNotThrow(() -> passwordResetService.resetPassword(request));
 
        // THEN
        verify(identityManagementPort).resetPassword(keycloakId, DEFAULT_PASSWORD, false);
        verify(passwordResetCachePort).deleteResetTokenData(resetToken);
    }
 
    @Test
    @DisplayName(TC_FGT_PREFIX + "008: Đổi mật khẩu - Mật khẩu mới trống")
    void validation_Fail_PasswordEmpty() {
        ResetPasswordRequest request = ResetPasswordRequest.builder()
                .resetToken("token")
                .newPassword("")
                .confirmPassword("")
                .build();
 
        Set<ConstraintViolation<ResetPasswordRequest>> violations = validator.validate(request);
        assertFalse(violations.isEmpty());
        assertTrue(violations.stream().anyMatch(v -> v.getMessage().equals(ResetPasswordRequest.MSG_PASSWORD_REQUIRED)));
    }
 
    @Test
    @DisplayName(TC_FGT_PREFIX + "009: Đổi mật khẩu - Xác nhận mật khẩu không khớp")
    void resetPassword_Fail_PasswordMismatch() {
        // GIVEN
        String resetToken = "valid-token";
        ResetPasswordRequest request = ResetPasswordRequest.builder()
                .resetToken(resetToken)
                .newPassword(DEFAULT_PASSWORD)
                .confirmPassword("Mismatch123!")
                .build();
        
        ResetTokenData data = ResetTokenData.builder()
                .email(DEFAULT_EMAIL)
                .status(com.daiphat.accountservice.domain.model.enums.PasswordResetStatus.VERIFIED)
                .build();
        
        when(passwordResetCachePort.getResetTokenData(resetToken)).thenReturn(Optional.of(data));
        UserModel mockUser = mock(UserModel.class);
        when(userLookupService.findByEmailOrThrow(DEFAULT_EMAIL)).thenReturn(mockUser);
        doThrow(new DomainException(ErrorCode.PASSWORD_CONFIRM_MISMATCH, "Xác nhận mật khẩu không khớp"))
                .when(userValidationService).validatePasswordMatch(DEFAULT_PASSWORD, "Mismatch123!");
 
        // WHEN
        DomainException exception = assertThrows(DomainException.class, () -> passwordResetService.resetPassword(request));
 
        // THEN
        assertEquals(ErrorCode.PASSWORD_CONFIRM_MISMATCH, exception.getErrorCode());
        assertEquals("Xác nhận mật khẩu không khớp", exception.getMessage());
    }
 
    @Test
    @DisplayName(TC_FGT_PREFIX + "010: Tái sử dụng OTP đã xác minh")
    void verifyResetOtp_Fail_OtpAlreadyDeleted() {
        // GIVEN
        VerifyOtpRequest request = VerifyOtpRequest.builder().email(DEFAULT_EMAIL).otp(DEFAULT_OTP).build();
        when(otpCachePort.getOtpAttemptCount(DEFAULT_EMAIL)).thenReturn(0);
        when(otpCachePort.getOtp(DEFAULT_EMAIL)).thenReturn(Optional.empty()); // Deleted or expired
 
        // WHEN
        DomainException exception = assertThrows(DomainException.class, () -> passwordResetService.verifyResetOtp(request));
 
        // THEN
        assertEquals(ErrorCode.OTP_EXPIRED, exception.getErrorCode());
    }
 
    @Test
    @DisplayName(TC_FGT_PREFIX + "011: Token format sai (OTP format)")
    void validation_Fail_OtpFormatInvalid() {
        VerifyOtpRequest request = VerifyOtpRequest.builder()
                .email(DEFAULT_EMAIL)
                .otp(MALFORMED_OTP)
                .build();
 
        Set<ConstraintViolation<VerifyOtpRequest>> violations = validator.validate(request);
        assertFalse(violations.isEmpty());
        assertTrue(violations.stream().anyMatch(v -> v.getMessage().equals(VerifyOtpRequest.MSG_OTP_FORMAT)));
    }
}
