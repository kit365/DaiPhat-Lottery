package com.daiphat.coreapi.application.service.auth;

import com.daiphat.coreapi.application.dto.request.auth.ForgotPasswordRequest;
import com.daiphat.coreapi.application.dto.request.auth.ChangePasswordRequest;
import com.daiphat.coreapi.application.dto.request.auth.ResetPasswordRequest;
import com.daiphat.coreapi.application.dto.request.auth.VerifyOtpRequest;
import com.daiphat.coreapi.application.dto.response.auth.ForgotPasswordResponse;
import com.daiphat.coreapi.application.dto.response.auth.PasswordPolicyResponse;
import com.daiphat.coreapi.application.dto.response.auth.PasswordRequirementResponse;
import com.daiphat.coreapi.application.dto.response.auth.VerifyOtpResponse;
import com.daiphat.coreapi.application.event.AdminResetPasswordOtpEvent;
import com.daiphat.coreapi.application.event.AdminResetPasswordSuccessEvent;
import com.daiphat.coreapi.application.event.ForgotPasswordEvent;
import com.daiphat.coreapi.application.event.UserPasswordChangedEvent;
import com.daiphat.coreapi.application.port.in.auth.PasswordResetServicePort;
import com.daiphat.coreapi.application.port.in.user.UserLookupServicePort;
import com.daiphat.coreapi.application.port.out.auth.PasswordHashPort;
import com.daiphat.coreapi.application.port.out.auth.RefreshTokenStorePort;
import com.daiphat.coreapi.application.port.out.auth.OtpCachePort;
import com.daiphat.coreapi.application.port.out.auth.PasswordResetCachePort;
import com.daiphat.coreapi.application.port.out.user.UserRepositoryPort;
import com.daiphat.coreapi.domain.exception.DomainException;
import com.daiphat.coreapi.domain.exception.ErrorCode;
import com.daiphat.coreapi.domain.model.UserModel;
import com.daiphat.coreapi.domain.model.auth.ResetTokenData;
import com.daiphat.coreapi.domain.model.enums.auth.PasswordResetStatus;
import com.daiphat.coreapi.shared.util.AuthUtils;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.security.SecureRandom;
import java.time.Duration;
import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class PasswordResetService implements PasswordResetServicePort {

    private static final SecureRandom RANDOM = new SecureRandom();

    private final UserRepositoryPort userRepositoryPort;
    private final UserLookupServicePort userLookupService;
    private final PasswordResetCachePort passwordResetCachePort;
    private final OtpCachePort otpCachePort;
    private final ApplicationEventPublisher eventPublisher;
    private final PasswordHashPort passwordHashPort;
    private final RefreshTokenStorePort refreshTokenStorePort;

    @Value("${daiphat.auth.cache.otp-ttl-seconds}")
    private long otpTtlSeconds;

    @Value("${daiphat.auth.cache.reset-token-ttl-seconds}")
    private long resetTokenTtlSeconds;

    @Value("${daiphat.auth.password-policy.min-length}")
    private int minPasswordLength;

    @Value("${daiphat.auth.password-policy.max-length}")
    private int maxPasswordLength;

    @Override
    @Transactional
    public ForgotPasswordResponse forgotPassword(ForgotPasswordRequest request) {
        String email = request.getEmail();
        UserModel user = userRepositoryPort.findByEmail(email)
                .orElseThrow(() -> new DomainException(ErrorCode.EMAIL_NOT_FOUND));

        String otp = generateOtp();
        otpCachePort.saveOtp(email, otp, Duration.ofSeconds(otpTtlSeconds));
        
        eventPublisher.publishEvent(ForgotPasswordEvent.builder()
                .userId(user.getId())
                .email(email)
                .otp(otp)
                .build());

        return ForgotPasswordResponse.builder()
                .email(email)
                .expiresIn(otpTtlSeconds)
                .retryAfter(0)
                .build();
    }

    @Override
    @Transactional
    public ForgotPasswordResponse resendForgotPasswordOtp(ForgotPasswordRequest request) {
        return forgotPassword(request);
    }

    @Override
    @Transactional
    public VerifyOtpResponse verifyResetOtp(VerifyOtpRequest request) {
        String email = request.getEmail();
        int attempts = otpCachePort.getOtpAttemptCount(email);
        if (attempts >= 3) {
            otpCachePort.deleteOtp(email);
            otpCachePort.resetOtpAttemptCount(email);
            throw new DomainException(ErrorCode.OTP_MAX_ATTEMPTS_EXCEEDED);
        }

        String cachedOtp = otpCachePort.getOtp(email)
                .orElseThrow(() -> new DomainException(ErrorCode.OTP_EXPIRED));
        if (!cachedOtp.equals(request.getOtp())) {
            otpCachePort.incrementOtpAttempt(email, Duration.ofSeconds(otpTtlSeconds));
            throw new DomainException(ErrorCode.OTP_INVALID);
        }

        String resetToken = UUID.randomUUID().toString();
        ResetTokenData data = ResetTokenData.builder()
                .email(email)
                .status(PasswordResetStatus.VERIFIED)
                .createdAt(LocalDateTime.now())
                .build();
        passwordResetCachePort.saveResetTokenData(
                resetToken,
                data,
                Duration.ofSeconds(resetTokenTtlSeconds)
        );
        otpCachePort.deleteOtp(email);
        otpCachePort.resetOtpAttemptCount(email);

        return VerifyOtpResponse.builder()
                .resetToken(resetToken)
                .build();
    }

    @Override
    @Transactional
    public void resetPassword(ResetPasswordRequest request) {
        ResetTokenData data = passwordResetCachePort.getResetTokenData(request.getResetToken())
                .orElseThrow(() -> new DomainException(ErrorCode.RESET_TOKEN_INVALID));
        if (data.getStatus() != PasswordResetStatus.VERIFIED) {
            throw new DomainException(ErrorCode.RESET_TOKEN_INVALID);
        }
        if (!request.getNewPassword().equals(request.getConfirmPassword())) {
            throw new DomainException(ErrorCode.PASSWORD_CONFIRM_MISMATCH);
        }
        if (request.getNewPassword().toLowerCase().contains(data.getEmail().toLowerCase())) {
            throw new DomainException(ErrorCode.PASSWORD_CONTAINS_EMAIL);
        }

        UserModel user = userRepositoryPort.findByEmail(data.getEmail())
                .orElseThrow(() -> new DomainException(ErrorCode.EMAIL_NOT_FOUND));
        user.setLocalPassword(passwordHashPort.encode(request.getNewPassword()));
        user.unlockAccount();
        userRepositoryPort.save(user);
        refreshTokenStorePort.delete(user.getId());
        passwordResetCachePort.deleteResetTokenData(request.getResetToken());
        eventPublisher.publishEvent(UserPasswordChangedEvent.builder()
                .userId(user.getId())
                .email(user.getEmail())
                .build());
    }

    @Override
    @Transactional
    public void initiatePasswordReset(UUID id) {
        UserModel user = userLookupService.findActiveByIdOrThrow(id);

        String otp = generateOtp();
        otpCachePort.saveOtp(user.getEmail(), otp, Duration.ofSeconds(otpTtlSeconds));

        eventPublisher.publishEvent(AdminResetPasswordOtpEvent.builder()
                .userId(user.getId())
                .email(user.getEmail())
                .fullName(user.getFullName())
                .otp(otp)
                .build());
    }

    @Override
    @Transactional
    public void confirmPasswordReset(UUID id, String otp) {
        UserModel user = userLookupService.findActiveByIdOrThrow(id);

        int attempts = otpCachePort.getOtpAttemptCount(user.getEmail());
        if (attempts >= 3) {
            otpCachePort.deleteOtp(user.getEmail());
            otpCachePort.resetOtpAttemptCount(user.getEmail());
            throw new DomainException(ErrorCode.OTP_MAX_ATTEMPTS_EXCEEDED);
        }

        String cachedOtp = otpCachePort.getOtp(user.getEmail())
                .orElseThrow(() -> new DomainException(ErrorCode.OTP_EXPIRED));

        if (!cachedOtp.equals(otp)) {
            otpCachePort.incrementOtpAttempt(user.getEmail(), Duration.ofSeconds(otpTtlSeconds));
            throw new DomainException(ErrorCode.OTP_INVALID);
        }

        String temporaryPassword = AuthUtils.generatePassword();
        user.setLocalPassword(passwordHashPort.encode(temporaryPassword));
        user.unlockAccount();
        user.forcePasswordChange();
        userRepositoryPort.save(user);
        refreshTokenStorePort.delete(user.getId());

        otpCachePort.deleteOtp(user.getEmail());
        otpCachePort.resetOtpAttemptCount(user.getEmail());

        eventPublisher.publishEvent(AdminResetPasswordSuccessEvent.builder()
                .userId(user.getId())
                .email(user.getEmail())
                .fullName(user.getFullName())
                .password(temporaryPassword)
                .build());
    }

    @Override
    @Transactional
    public void changePassword(UUID id, ChangePasswordRequest request) {
        UserModel user = userLookupService.findActiveByIdOrThrow(id);

        if (request.getNewPassword() == null || !request.getNewPassword().equals(request.getConfirmPassword())) {
            throw new DomainException(ErrorCode.PASSWORD_CONFIRM_MISMATCH);
        }
        if (user.getPassword() == null || !passwordHashPort.matches(request.getCurrentPassword(), user.getPassword())) {
            throw new DomainException(ErrorCode.INVALID_CREDENTIALS);
        }
        String lowerPassword = request.getNewPassword().toLowerCase();
        String email = user.getEmail() == null ? "" : user.getEmail().toLowerCase();
        String username = user.getUsername() == null ? "" : user.getUsername().toLowerCase();
        if ((!email.isBlank() && lowerPassword.contains(email))
                || (!username.isBlank() && lowerPassword.contains(username))) {
            throw new DomainException(ErrorCode.PASSWORD_CONTAINS_EMAIL);
        }

        user.setLocalPassword(passwordHashPort.encode(request.getNewPassword()));
        user.unlockAccount();
        userRepositoryPort.save(user);
        refreshTokenStorePort.delete(user.getId());
        eventPublisher.publishEvent(UserPasswordChangedEvent.builder()
                .userId(user.getId())
                .email(user.getEmail())
                .build());
    }

    @Override
    public PasswordPolicyResponse getPasswordPolicy() {
        return PasswordPolicyResponse.builder()
                .minLength(minPasswordLength)
                .maxLength(maxPasswordLength)
                .requirements(List.of(
                        new PasswordRequirementResponse("min_length", "Ít nhất " + minPasswordLength + " ký tự", null),
                        new PasswordRequirementResponse("max_length", "Tối đa " + maxPasswordLength + " ký tự", null),
                        new PasswordRequirementResponse("uppercase", "Viết hoa chữ đầu", "^[A-Z].*$"),
                        new PasswordRequirementResponse("no_space", "Không chứa khoảng trắng", "^\\S*$")
                ))
                .build();
    }

    private String generateOtp() {
        return String.format("%06d", RANDOM.nextInt(1_000_000));
    }
}
