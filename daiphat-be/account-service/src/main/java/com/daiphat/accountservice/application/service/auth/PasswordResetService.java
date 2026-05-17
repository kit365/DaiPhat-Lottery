package com.daiphat.accountservice.application.service.auth;

import com.daiphat.accountservice.application.config.AuthProperties;
import com.daiphat.accountservice.application.dto.request.auth.ForgotPasswordRequest;
import com.daiphat.accountservice.application.dto.request.auth.ResetPasswordRequest;
import com.daiphat.accountservice.application.dto.request.auth.VerifyOtpRequest;
import com.daiphat.accountservice.application.dto.response.auth.ForgotPasswordResponse;
import com.daiphat.accountservice.application.dto.response.auth.PasswordPolicyResponse;
import com.daiphat.accountservice.application.dto.response.auth.PasswordRequirementResponse;
import com.daiphat.accountservice.application.dto.response.auth.VerifyOtpResponse;
import org.springframework.context.ApplicationEventPublisher;
import com.daiphat.accountservice.application.event.ForgotPasswordEvent;
import com.daiphat.accountservice.application.event.AdminResetPasswordOtpEvent;
import com.daiphat.accountservice.application.event.AdminResetPasswordSuccessEvent;
import com.daiphat.accountservice.application.port.in.auth.PasswordResetServicePort;
import com.daiphat.accountservice.application.port.out.auth.IdentityManagementPort;
import com.daiphat.accountservice.application.port.out.user.UserRepositoryPort;
import com.daiphat.accountservice.application.port.in.user.UserLookupServicePort;
import com.daiphat.accountservice.application.port.in.user.UserValidationServicePort;
import com.daiphat.accountservice.application.port.out.auth.cache.OtpCachePort;
import com.daiphat.accountservice.application.port.out.auth.cache.PasswordResetCachePort;
import com.daiphat.accountservice.application.port.out.auth.keys.AuthAction;
import com.daiphat.accountservice.application.port.out.auth.LoginAttemptPort;
import com.daiphat.accountservice.application.port.out.auth.RateLimiterPort;
import com.daiphat.accountservice.domain.exception.DomainException;
import com.daiphat.accountservice.domain.exception.EmailRateLimitException;
import com.daiphat.accountservice.domain.exception.ErrorCode;
import com.daiphat.accountservice.domain.model.UserModel;
import com.daiphat.accountservice.domain.model.auth.ResetTokenData;
import com.daiphat.accountservice.domain.model.enums.EmailType;
import com.daiphat.accountservice.domain.model.enums.PasswordResetStatus;
import com.daiphat.accountservice.infrastructure.util.AuthUtils;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.time.LocalDateTime;
import java.util.Map;
import java.util.UUID;

@Service
@Slf4j
@RequiredArgsConstructor
public class PasswordResetService implements PasswordResetServicePort {

    private final UserRepositoryPort userRepositoryPort;
    private final PasswordResetCachePort passwordResetCachePort;
    private final OtpCachePort otpCachePort;
    private final AuthProperties authProperties;
    private final ApplicationEventPublisher eventPublisher;
    private final RateLimiterPort rateLimiterService;
    private final IdentityManagementPort identityManagementPort;
    private final LoginAttemptPort loginAttemptService;
    private final UserLookupServicePort userLookupService;
    private final UserValidationServicePort userValidationService;

    private static final String REQ_MIN_LENGTH = "min_length";
    private static final String REQ_MAX_LENGTH = "max_length";
    private static final String REQ_UPPERCASE = "uppercase";
    private static final String REQ_LOWERCASE = "lowercase";
    private static final String REQ_DIGIT = "digit";
    private static final String REQ_SPECIAL = "special";
    private static final String REQ_NO_SPACE = "no_space";

    private static final String REGEX_UPPERCASE = "^[A-Z].*$";
    private static final String REGEX_LOWERCASE = "^(?=.*[a-z]).*$";
    private static final String REGEX_DIGIT = "^(?=.*\\d).*$";
    private static final String REGEX_SPECIAL = "^(?=.*[@$!%*?&]).*$";
    private static final String REGEX_NO_SPACE = "^\\S*$";

    private static final String PARAM_OTP = "otp";

    @Override
    @Transactional
    public ForgotPasswordResponse forgotPassword(ForgotPasswordRequest request) {
        String email = request.getEmail();
        log.info("Initiating forgot password for email: {}", email);

        // 1. Check if user exists
        try {
            userLookupService.findByEmailOrThrow(email);
        } catch (DomainException e) {
            log.warn("Security Alert: Password reset attempted for non-existent email: {}", email);
            loginAttemptService.recordFailedAttempt(email); // Anti-spam protection
            throw e;
        }

        // 2. Tier A: Burst Rate Limiting (Anti-Spam Button)
        // Chặn spam nút: 1 lần mỗi 3 giây. Nếu dính lớp này chỉ bị phạt 3s và KHÔNG làm tăng nấc phạt Resend.
        if (!rateLimiterService.checkAndRecordFixed(email, AuthAction.FORGOT_PASSWORD_SPAM, 1, 3)) {
            long retryAfter = rateLimiterService.getRemainingWaitTimeFixed(email, AuthAction.FORGOT_PASSWORD_SPAM, 3);
            throw new DomainException(ErrorCode.TOO_MANY_REQUESTS, null, String.valueOf(retryAfter));
        }

        // 3. Tier B: Progressive Rate Limiting (0s -> 0s -> 60s -> 120s... Max 10m)
        // Nấc hồi chiêu: CHỈ KIỂM TRA (Peek) để không làm tăng nấc phạt nếu chưa thực sự gửi mail.
        if (!rateLimiterService.checkRateLimit(email, AuthAction.FORGOT_PASSWORD)) {
            long retryAfter = rateLimiterService.getRemainingWaitTime(email, AuthAction.FORGOT_PASSWORD);
            throw new DomainException(ErrorCode.TOO_MANY_REQUESTS, null, String.valueOf(retryAfter));
        }

        return this.forgotPasswordInternal(email);
    }

    private ForgotPasswordResponse forgotPasswordInternal(String email) {
        // 1. Generate and Save OTP
        String otp = AuthUtils.generateOtp();
        otpCachePort.saveOtp(email, otp, authProperties.getCache().getOtpTtl());

        // 2. Fire Event (Listener will handle email after commit)
        eventPublisher.publishEvent(ForgotPasswordEvent.builder()
                .email(email)
                .otp(otp)
                .build());

        log.info("OTP sent for password reset. Email: {}", email);

        return ForgotPasswordResponse.builder()
                .email(email)
                .expiresIn(authProperties.getCache().getOtpTtl().toSeconds())
                .retryAfter(rateLimiterService.getRemainingWaitTime(email, AuthAction.FORGOT_PASSWORD))
                .build();
    }

    @Override
    @Transactional
    public ForgotPasswordResponse resendForgotPasswordOtp(ForgotPasswordRequest request) {
        log.info("Alias request: Resending OTP for password reset. Email: {}", request.getEmail());
        return this.forgotPassword(request);
    }

    @Override
    @Transactional
    public VerifyOtpResponse verifyResetOtp(VerifyOtpRequest request) {
        String email = request.getEmail();
        String otp = request.getOtp();
        log.info("Verifying OTP for email: {}", email);

        // Check OTP Attempt Count (Tier C: Failed Verification - Max 3 attempts)
        int attempts = otpCachePort.getOtpAttemptCount(email);
        if (attempts >= 3) {
            otpCachePort.deleteOtp(email);
            otpCachePort.resetOtpAttemptCount(email);
            throw new DomainException(ErrorCode.OTP_MAX_ATTEMPTS_EXCEEDED);
        }

        String cachedOtp = otpCachePort.getOtp(email)
                .orElseThrow(() -> new DomainException(ErrorCode.OTP_EXPIRED));

        if (!cachedOtp.equals(otp)) {
            otpCachePort.incrementOtpAttempt(email, authProperties.getCache().getOtpTtl());
            throw new DomainException(ErrorCode.OTP_INVALID);
        }

        // Generate secure Reset Token
        String resetToken = UUID.randomUUID().toString();
        ResetTokenData data = ResetTokenData.builder()
                .email(email)
                .status(PasswordResetStatus.VERIFIED)
                .createdAt(LocalDateTime.now())
                .build();

        passwordResetCachePort.saveResetTokenData(resetToken, data, authProperties.getCache().getResetTokenTtl());
        otpCachePort.deleteOtp(email);
        otpCachePort.resetOtpAttemptCount(email);
        rateLimiterService.resetRateLimit(email, AuthAction.FORGOT_PASSWORD);

        log.info("OTP verified. Reset session created for {}", email);
        return VerifyOtpResponse.builder()
                .resetToken(resetToken)
                .build();
    }

    @Override
    @Transactional
    public void resetPassword(ResetPasswordRequest request) {
        String resetToken = request.getResetToken();
        log.info("Processing password reset with token: {}", AuthUtils.maskToken(resetToken));

        // 1. Verify Reset Session
        ResetTokenData data = passwordResetCachePort.getResetTokenData(resetToken)
                .orElseThrow(() -> new DomainException(ErrorCode.RESET_TOKEN_INVALID));

        if (data.getStatus() != PasswordResetStatus.VERIFIED) {
            throw new DomainException(ErrorCode.RESET_TOKEN_INVALID);
        }

        // 2. Find User
        UserModel user = userLookupService.findByEmailOrThrow(data.getEmail());

        // 3. Security Check
        userValidationService.validatePasswordMatch(request.getNewPassword(), request.getConfirmPassword());

        if (request.getNewPassword().toLowerCase().contains(data.getEmail().toLowerCase())) {
            throw new DomainException(ErrorCode.PASSWORD_CONTAINS_EMAIL);
        }

        // 4. Update in Keycloak
        identityManagementPort.resetPassword(user.getId(), request.getNewPassword(), false);
        identityManagementPort.logoutUserSessions(user.getId());

        // 5. Update local state
        user.markPasswordSet();
        userRepositoryPort.save(user);

        // 6. Unlock account and reset login attempts
        loginAttemptService.recordSuccessfulAttempt(data.getEmail());

        // 6. Cleanup
        passwordResetCachePort.deleteResetTokenData(resetToken);
        log.info("Password successfully reset and account unlocked for user: {}", data.getEmail());
    }

    @Override
    public PasswordPolicyResponse getPasswordPolicy() {
        var policy = authProperties.getPasswordPolicy();
        java.util.List<PasswordRequirementResponse> requirements = new java.util.ArrayList<>();

        // 1. Length requirements
        requirements.add(new PasswordRequirementResponse(REQ_MIN_LENGTH, "Ít nhất " + policy.getMinLength() + " ký tự", null));
        requirements.add(new PasswordRequirementResponse(REQ_MAX_LENGTH, "Tối đa " + policy.getMaxLength() + " ký tự", null));

        // 2. Conditionals based on AuthProperties
        if (policy.isNoSpace()) {
            requirements.add(new PasswordRequirementResponse(REQ_NO_SPACE, "Không chứa khoảng trắng", REGEX_NO_SPACE));
        }
        if (policy.isRequireUppercase()) {
            requirements.add(new PasswordRequirementResponse(REQ_UPPERCASE, "Viết hoa chữ đầu", REGEX_UPPERCASE));
        }
        if (policy.isRequireLowercase()) {
            requirements.add(new PasswordRequirementResponse(REQ_LOWERCASE, "Ít nhất 1 chữ thường", REGEX_LOWERCASE));
        }
        if (policy.isRequireDigit()) {
            requirements.add(new PasswordRequirementResponse(REQ_DIGIT, "Ít nhất 1 chữ số", REGEX_DIGIT));
        }
        if (policy.isRequireSpecial()) {
            requirements.add(new PasswordRequirementResponse(REQ_SPECIAL, "Ít nhất 1 ký tự đặc biệt (@$!%*?&)", REGEX_SPECIAL));
        }

        return PasswordPolicyResponse.builder()
                .requirements(requirements)
                .minLength(policy.getMinLength())
                .maxLength(policy.getMaxLength())
                .build();
    }

    @Override
    @Transactional
    public void changePassword(UUID id, String newPassword) {
        UserModel user = userLookupService.findActiveByIdOrThrow(id);
        identityManagementPort.resetPassword(user.getId(), newPassword, false);
        identityManagementPort.logoutUserSessions(user.getId());
        user.markPasswordSet();
        userRepositoryPort.save(user);
    }

    @Override
    @Transactional
    public void initiatePasswordReset(UUID id) {
        UserModel user = userLookupService.findActiveByIdOrThrow(id);
        log.info("Admin initiating password reset for user: {}", user.getEmail());

        String otp = AuthUtils.generateOtp();
        otpCachePort.saveOtp(user.getEmail(), otp, authProperties.getCache().getOtpTtl());

        eventPublisher.publishEvent(AdminResetPasswordOtpEvent.builder()
                .email(user.getEmail())
                .fullName(user.getFullName())
                .otp(otp)
                .build());
    }

    @Override
    @Transactional
    public void confirmPasswordReset(UUID id, String otp) {
        UserModel user = userLookupService.findActiveByIdOrThrow(id);
        log.info("Admin confirming password reset for user: {}", user.getEmail());

        String cachedOtp = otpCachePort.getOtp(user.getEmail())
                .orElseThrow(() -> new DomainException(ErrorCode.OTP_EXPIRED));

        if (!cachedOtp.equals(otp)) {
            otpCachePort.incrementOtpAttempt(user.getEmail(), authProperties.getCache().getOtpTtl());
            throw new DomainException(ErrorCode.OTP_INVALID);
        }

        String temporaryPassword = AuthUtils.generatePassword();
        identityManagementPort.resetPassword(user.getId(), temporaryPassword, false);
        identityManagementPort.logoutUserSessions(user.getId());

        user.forcePasswordChange();
        userRepositoryPort.save(user);

        otpCachePort.deleteOtp(user.getEmail());
        otpCachePort.resetOtpAttemptCount(user.getEmail());

        eventPublisher.publishEvent(AdminResetPasswordSuccessEvent.builder()
                .email(user.getEmail())
                .fullName(user.getFullName())
                .password(temporaryPassword)
                .build());
    }
}
