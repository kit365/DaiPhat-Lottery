package com.daiphat.accountservice.application.service;

import com.daiphat.accountservice.application.dto.request.*;
import com.daiphat.accountservice.application.dto.response.AuthResponseDTO;
import com.daiphat.accountservice.application.dto.response.ForgotPasswordResponseDTO;
import com.daiphat.accountservice.application.dto.response.VerifyOtpResponseDTO;
import com.daiphat.accountservice.application.mapper.AuthApplicationMapper;
import com.daiphat.accountservice.application.mapper.UserApplicationMapper;
import com.daiphat.accountservice.application.port.in.AuthServicePort;
import com.daiphat.accountservice.application.port.in.EmailServicePort;
import com.daiphat.accountservice.application.port.out.auth.KeycloakPort;
import com.daiphat.accountservice.application.port.out.auth.AuthCachePort;
import com.daiphat.accountservice.application.port.out.IdentityManagementPort;
import com.daiphat.accountservice.application.port.out.RoleRepositoryPort;
import com.daiphat.accountservice.application.port.out.UserRepositoryPort;
import com.daiphat.accountservice.domain.exception.ErrorCode;
import com.daiphat.accountservice.domain.model.UserModel;
import com.daiphat.accountservice.domain.model.RoleModel;
import com.daiphat.accountservice.domain.model.auth.KeycloakAuthResult;
import com.daiphat.accountservice.domain.model.auth.ResetTokenData;
import com.daiphat.accountservice.domain.model.enums.PasswordResetStatus;
import com.daiphat.accountservice.domain.exception.DomainException;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Duration;
import java.time.LocalDateTime;
import java.util.Optional;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Slf4j
public class AuthService implements AuthServicePort {

    private final KeycloakPort keycloakPort;
    private final AuthCachePort authCachePort;
    private final UserRepositoryPort userRepositoryPort;
    private final IdentityManagementPort identityManagementPort;
    private final RoleRepositoryPort roleRepositoryPort;
    private final AuthApplicationMapper authApplicationMapper;
    private final UserApplicationMapper userApplicationMapper;
    private final EmailServicePort emailServicePort;

    @Value("${daiphat.auth.cache.remember-me-ttl:2592000}") // Default 30 days
    private long rememberMeTtl;

    @Value("${daiphat.auth.cache.mfa-session-ttl:900}")
    private long mfaSessionTtl;

    @Override
    @Transactional
    public AuthResponseDTO login(LoginRequestDTO request) {
        log.info("Processing login for user: {}", request.getUsername());

        KeycloakAuthResult result = keycloakPort.login(request);

        // Validate result
        if (result == null || result.getAccessToken() == null) {
            log.error("Login failed: Invalid Keycloak response for user: {}", request.getUsername());
            throw new DomainException(ErrorCode.INVALID_CREDENTIALS);
        }

        String userId = result.getKeycloakUserId();
        String username = result.getUsername();

        // Cache tokens with dynamic TTL
        Duration tokenDuration = request.isRememberMe()
                ? Duration.ofSeconds(rememberMeTtl)
                : Duration.ofSeconds(result.getExpiresIn());

        Duration refreshDuration = request.isRememberMe()
                ? Duration.ofSeconds(rememberMeTtl)
                : Duration.ofSeconds(result.getRefreshExpiresIn());

        authCachePort.saveToken(userId, result.getAccessToken(), tokenDuration);
        authCachePort.saveRefreshToken(userId, result.getRefreshToken(), refreshDuration);
        log.info("Tokens cached successfully for user ID: {}", userId);

        // 4. Sync user
        syncAndVerifyUser(userId, username);

        // 5. Map to DTO and override expires based on our cache policy
        AuthResponseDTO response = authApplicationMapper.toResponse(result);
        response.setExpiresIn(tokenDuration.toSeconds());
        response.setRefreshExpiresIn(refreshDuration.toSeconds());

        return response;
    }

    @Override
    @Transactional
    public void logout(LogoutRequestDTO request) {
        String userId = SecurityContextHolder.getContext().getAuthentication().getName();
        log.info("Logging out user ID: {}", userId);

        // 1. Revoke in Redis
        authCachePort.revokeToken(userId);
        log.debug("Tokens revoked in Redis for user: {}", userId);

        // 2. Notify Keycloak
        keycloakPort.logout(request.getRefreshToken());
        log.info("User {} successfully logged out from Keycloak", userId);
    }

    @Override
    @Transactional
    public AuthResponseDTO refreshToken(RefreshTokenRequestDTO request) {
        log.info("Refreshing token...");

        // 1. Call Keycloak
        KeycloakAuthResult result = keycloakPort.refreshToken(request.getRefreshToken());

        String userId = result.getKeycloakUserId();

        // 2. Update Cache
        authCachePort.saveToken(
                userId,
                result.getAccessToken(),
                Duration.ofSeconds(result.getExpiresIn()));
        authCachePort.saveRefreshToken(
                userId,
                result.getRefreshToken(),
                Duration.ofSeconds(result.getRefreshExpiresIn()));

        log.info("Tokens refreshed and cached successfully for user ID: {}", userId);

        return authApplicationMapper.toResponse(result);
    }

    @Override
    @Transactional
    public void register(UserRegistrationRequestDTO request) {
        log.info("Registering user: {} with email: {}", request.username(), request.email());

        // 1. Check local DB (Early rejection)
        if (userRepositoryPort.existsByUsername(request.username())) {
            throw new DomainException(ErrorCode.USER_EXISTED);
        }
        if (userRepositoryPort.existsByEmail(request.email())) {
            throw new DomainException(ErrorCode.USER_EXISTED);
        }

        // 2. Map DTO to Domain Model
        UserModel userModel = userApplicationMapper.mapToUserModel(request);
        userModel.setStatus("ACTIVE");

        UUID keycloakId = null;
        try {
            // 3. Create in Keycloak
            keycloakId = identityManagementPort.createUser(userModel, request.password());
            userModel.updateKeycloakId(keycloakId);
            log.info("User created in Keycloak with ID: {}", keycloakId);

            // 4. Assign default role in domain model
            RoleModel role = roleRepositoryPort.findByCode(UserRole.USER.getCode())
                    .orElseThrow(() -> new DomainException(ErrorCode.ROLE_NOT_FOUND));
            userModel.setRole(role);

            // 5. Save to local DB
            userRepositoryPort.save(userModel);
            log.info("User {} successfully registered and synced to local DB", request.username());

        } catch (Exception e) {
            log.error("Failed to complete registration for user: {}. Error: {}", request.username(), e.getMessage());
            // 6. Rollback Keycloak if ID was created
            if (keycloakId != null) {
                identityManagementPort.deleteUser(keycloakId);
                log.info("Rollback: Keycloak user {} deleted due to local registration failure", keycloakId);
            }
            throw e;
        }
    }

    @Override
    @Transactional
    public ForgotPasswordResponseDTO forgotPassword(ForgotPasswordRequestDTO request) {
        String email = request.getEmail();
        log.info("Initiating forgot password for email: {}", email);

        // 1. Check if user exists
        if (!userRepositoryPort.existsByEmail(email)) {
            throw new DomainException(ErrorCode.USER_NOT_FOUND);
        }

        // 2. Handle Resend Throttling (Progressive Backoff)
        long currentTime = System.currentTimeMillis();
        long lastResendAt = authCachePort.getLastResendAt(email).orElse(0L);
        int resendCount = authCachePort.getResendCount(email);
        
        long waitTimeSeconds = calculateWaitTime(resendCount);
        long timeSinceLastResend = (currentTime - lastResendAt) / 1000;
        
        if (timeSinceLastResend < waitTimeSeconds) {
            throw new DomainException(ErrorCode.TOO_MANY_REQUESTS, "Vui lòng đợi " + (waitTimeSeconds - timeSinceLastResend) + " giây để gửi lại.");
        }

        // 3. Generate and Save OTP
        String otp = generateOtp();
        authCachePort.saveOtp(email, otp, Duration.ofMinutes(5));
        authCachePort.saveLastResendAt(email, currentTime, Duration.ofHours(24));
        authCachePort.incrementResendCount(email);

        // 4. Send "Pro Max" Email via EmailService
        emailServicePort.sendForgotPasswordEmail(email, otp);

        log.info("OTP sent for password reset. Email: {}", email);
        
        return ForgotPasswordResponseDTO.builder()
                .email(email)
                .expiresIn(300L) // 5 minutes
                .retryAfter(calculateWaitTime(resendCount + 1))
                .build();
    }

    @Override
    public ForgotPasswordResponseDTO resendForgotPasswordOtp(ForgotPasswordRequestDTO request) {
        log.info("Resending OTP for password reset. Email: {}", request.getEmail());
        return forgotPassword(request);
    }

    @Override
    public VerifyOtpResponseDTO verifyResetOtp(VerifyOtpRequestDTO request) {
        String email = request.getEmail();
        String otp = request.getOtp();
        log.info("Verifying OTP for email: {}", email);

        // 1. Check OTP
        String cachedOtp = authCachePort.getOtp(email)
                .orElseThrow(() -> new DomainException(ErrorCode.OTP_EXPIRED));

        if (!cachedOtp.equals(otp)) {
            authCachePort.incrementResetAttempt(email);
            throw new DomainException(ErrorCode.OTP_INVALID);
        }

        // 2. Generate secure Reset Token (UUID style)
        String resetToken = UUID.randomUUID().toString();
        ResetTokenData data = ResetTokenData.builder()
                .email(email)
                .status(PasswordResetStatus.VERIFIED)
                .createdAt(LocalDateTime.now())
                .build();

        // 3. Save session to Redis
        authCachePort.saveResetTokenData(resetToken, data, Duration.ofMinutes(15));
        authCachePort.deleteOtp(email);
        authCachePort.resetResendCount(email);

        log.info("OTP verified. Reset session created for {}", email);
        return VerifyOtpResponseDTO.builder()
                .resetToken(resetToken)
                .build();
    }

    @Override
    @Transactional
    public void resetPassword(ResetPasswordRequestDTO request) {
        String resetToken = request.getResetToken();
        log.info("Processing password reset with token: {}", resetToken);

        // 1. Verify Reset Session
        ResetTokenData data = authCachePort.getResetTokenData(resetToken)
                .orElseThrow(() -> new DomainException(ErrorCode.RESET_TOKEN_INVALID));

        if (data.getStatus() != PasswordResetStatus.VERIFIED) {
            throw new DomainException(ErrorCode.RESET_TOKEN_INVALID);
        }

        // 2. Find User to get Keycloak ID
        UserModel user = userRepositoryPort.findByEmail(data.getEmail())
                .orElseThrow(() -> new DomainException(ErrorCode.USER_NOT_FOUND));

        // 3. Update in Keycloak
        identityManagementPort.resetPassword(user.getId(), request.getNewPassword());

        // 4. Cleanup
        authCachePort.deleteResetToken(data.getEmail());
        log.info("Password successfully reset for user: {}", data.getEmail());
    }

    @Transactional
    protected void syncAndVerifyUser(String keycloakId, String username) {
        try {
            UUID keycloakUuid = UUID.fromString(keycloakId);
            log.info("Syncing user {} with Keycloak ID: {}", username, keycloakId);

            userRepositoryPort.findByUsername(username).ifPresent(user -> {
                if (!user.getId().equals(keycloakUuid)) {
                    log.info("Updating local user ID for {} to match Keycloak ID", username);
                    user.updateKeycloakId(keycloakUuid);
                    userRepositoryPort.updateUserId(user.getId(), keycloakUuid);
                }
            });
        } catch (Exception e) {
            log.error("Failed to sync user with Keycloak: {}", e.getMessage());
        }
    }

    private String generateOtp() {
        return String.format("%06d", new java.security.SecureRandom().nextInt(1000000));
    }

    private long calculateWaitTime(int resendCount) {
        long[] backoffSeconds = {60, 120, 300, 600}; // 1m, 2m, 5m, 10m
        return backoffSeconds[Math.min(resendCount, backoffSeconds.length - 1)];
    }
}