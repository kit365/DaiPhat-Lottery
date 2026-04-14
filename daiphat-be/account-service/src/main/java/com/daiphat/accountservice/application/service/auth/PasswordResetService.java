package com.daiphat.accountservice.application.service.auth;

import com.daiphat.accountservice.application.config.AuthProperties;
import com.daiphat.accountservice.application.dto.request.ForgotPasswordRequestDTO;
import com.daiphat.accountservice.application.dto.request.ResetPasswordRequestDTO;
import com.daiphat.accountservice.application.dto.request.VerifyOtpRequestDTO;
import com.daiphat.accountservice.application.dto.response.ForgotPasswordResponseDTO;
import com.daiphat.accountservice.application.dto.response.PasswordPolicyResponseDTO;
import com.daiphat.accountservice.application.dto.response.PasswordRequirementDTO;
import com.daiphat.accountservice.application.dto.response.VerifyOtpResponseDTO;
import com.daiphat.accountservice.application.port.in.EmailServicePort;
import com.daiphat.accountservice.application.port.in.auth.PasswordResetServicePort;
import com.daiphat.accountservice.application.port.out.IdentityManagementPort;
import com.daiphat.accountservice.application.port.out.UserRepositoryPort;
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
    private final EmailServicePort emailServicePort;
    private final RateLimiterPort rateLimiterService;
    private final IdentityManagementPort identityManagementPort;
    private final LoginAttemptPort loginAttemptService;
    
    // Password Requirement Constants
    private static final String REQ_MIN_LENGTH = "min_length";
    private static final String REQ_UPPERCASE = "uppercase";
    private static final String REQ_LOWERCASE = "lowercase";
    private static final String REQ_DIGIT = "digit";
    private static final String REQ_SPECIAL = "special";

    private static final String REGEX_UPPERCASE = "^(?=.*[A-Z]).*$";
    private static final String REGEX_LOWERCASE = "^(?=.*[a-z]).*$";
    private static final String REGEX_DIGIT = "^(?=.*\\d).*$";
    private static final String REGEX_SPECIAL = "^(?=.*[@$!%*?&]).*$";

    private static final String PARAM_OTP = "otp";

    @Override
    @Transactional
    public ForgotPasswordResponseDTO forgotPassword(ForgotPasswordRequestDTO request) {
        String email = request.getEmail();
        log.info("Initiating forgot password for email: {}", email);

        // 1. Check if user exists
        validateUserPresence(email);

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

        // 3. Delegate to internal logic
        return this.forgotPasswordInternal(email);
    }

    private ForgotPasswordResponseDTO forgotPasswordInternal(String email) {
        // 1. Generate and Save OTP
        String otp = AuthUtils.generateOtp();
        otpCachePort.saveOtp(email, otp, authProperties.getCache().getOtpTtl());

        // 2. Send Forgot Password OTP (Strict Dispatch)
        try {
            emailServicePort.sendEmail(EmailType.FORGOT_PW_OTP, email, Map.of(PARAM_OTP, otp));
        } catch (EmailRateLimitException e) {
            long retryAfter = rateLimiterService.getRemainingWaitTime(email, AuthAction.FORGOT_PASSWORD);
            throw new DomainException(ErrorCode.TOO_MANY_REQUESTS, null, String.valueOf(retryAfter));
        }

        log.info("OTP sent for password reset. Email: {}", email);

        return ForgotPasswordResponseDTO.builder()
                .email(email)
                .expiresIn(authProperties.getCache().getOtpTtl().toSeconds())
                .retryAfter(rateLimiterService.getRemainingWaitTime(email, AuthAction.FORGOT_PASSWORD))
                .build();
    }

    @Override
    @Transactional
    public ForgotPasswordResponseDTO resendForgotPasswordOtp(ForgotPasswordRequestDTO request) {
        log.info("Alias request: Resending OTP for password reset. Email: {}", request.getEmail());
        return this.forgotPassword(request);
    }

    @Override
    @Transactional
    public VerifyOtpResponseDTO verifyResetOtp(VerifyOtpRequestDTO request) {
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
        return VerifyOtpResponseDTO.builder()
                .resetToken(resetToken)
                .build();
    }

    @Override
    @Transactional
    public void resetPassword(ResetPasswordRequestDTO request) {
        String resetToken = request.getResetToken();
        log.info("Processing password reset with token: {}", AuthUtils.maskToken(resetToken));

        // 1. Verify Reset Session
        ResetTokenData data = passwordResetCachePort.getResetTokenData(resetToken)
                .orElseThrow(() -> new DomainException(ErrorCode.RESET_TOKEN_INVALID));

        if (data.getStatus() != PasswordResetStatus.VERIFIED) {
            throw new DomainException(ErrorCode.RESET_TOKEN_INVALID);
        }

        // 2. Find User
        UserModel user = userRepositoryPort.findByEmail(data.getEmail())
                .orElseThrow(() -> new DomainException(ErrorCode.USER_NOT_FOUND));

        // 3. Security Check
        if (!request.getNewPassword().equals(request.getConfirmPassword())) {
            throw new DomainException(ErrorCode.PASSWORD_CONFIRM_MISMATCH);
        }

        if (request.getNewPassword().toLowerCase().contains(data.getEmail().toLowerCase())) {
            throw new DomainException(ErrorCode.PASSWORD_CONTAINS_EMAIL);
        }

        // 4. Update in Keycloak
        identityManagementPort.resetPassword(user.getId(), request.getNewPassword());

        // 5. Unlock account and reset login attempts
        loginAttemptService.recordSuccessfulAttempt(data.getEmail());

        // 6. Cleanup
        passwordResetCachePort.deleteResetTokenData(resetToken);
        log.info("Password successfully reset and account unlocked for user: {}", data.getEmail());
    }

    @Override
    public PasswordPolicyResponseDTO getPasswordPolicy() {
        var policy = authProperties.getPasswordPolicy();
        var requirements = java.util.Arrays.asList(
                new PasswordRequirementDTO(REQ_MIN_LENGTH, "Ít nhất " + policy.getMinLength() + " ký tự", null),
                new PasswordRequirementDTO(REQ_UPPERCASE, "Ít nhất 1 chữ hoa", REGEX_UPPERCASE),
                new PasswordRequirementDTO(REQ_LOWERCASE, "Ít nhất 1 chữ thường", REGEX_LOWERCASE),
                new PasswordRequirementDTO(REQ_DIGIT, "Ít nhất 1 chữ số", REGEX_DIGIT),
                new PasswordRequirementDTO(REQ_SPECIAL, "Ít nhất 1 ký tự đặc biệt (@$!%*?&)", REGEX_SPECIAL)
        );

        return PasswordPolicyResponseDTO.builder()
                .requirements(requirements)
                .minLength(policy.getMinLength())
                .maxLength(policy.getMaxLength())
                .build();
    }

    private void validateUserPresence(String email) {
        if (!userRepositoryPort.existsByEmail(email)) {
            log.warn("Security Alert: Password reset attempted for non-existent email: {}", email);
            loginAttemptService.recordFailedAttempt(email); // Anti-spam protection
            throw new DomainException(ErrorCode.USER_NOT_FOUND);
        }
    }
}
