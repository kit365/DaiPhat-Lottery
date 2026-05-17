package com.daiphat.accountservice.application.service.auth;

import com.daiphat.accountservice.application.config.AuthProperties;
import com.daiphat.accountservice.application.dto.request.auth.LoginRequest;
import com.daiphat.accountservice.application.dto.request.auth.RefreshTokenRequest;
import com.daiphat.accountservice.application.dto.response.auth.AuthResponse;
import com.daiphat.accountservice.application.mapper.AuthApplicationMapper;
import com.daiphat.accountservice.application.port.in.auth.LoginServicePort;
import com.daiphat.accountservice.application.port.in.user.UserServicePort;
import com.daiphat.accountservice.application.port.out.auth.IdentityManagementPort;
import com.daiphat.accountservice.application.port.out.auth.LoginAttemptPort;
import com.daiphat.accountservice.application.port.out.auth.RateLimiterPort;
import com.daiphat.accountservice.application.port.out.auth.keys.AuthAction;
import com.daiphat.accountservice.application.port.in.user.UserLookupServicePort;
import com.daiphat.accountservice.application.port.out.auth.cache.TokenCachePort;
import com.daiphat.accountservice.domain.exception.DomainException;
import com.daiphat.accountservice.domain.exception.ErrorCode;
import com.daiphat.accountservice.domain.model.UserModel;
import com.daiphat.accountservice.domain.model.auth.KeycloakAuthResult;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Duration;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Slf4j
public class LoginService implements LoginServicePort {
    private final UserLookupServicePort userLookupService;
    private final IdentityManagementPort identityManagementPort;
    private final TokenCachePort tokenCachePort;
    private final AuthApplicationMapper authApplicationMapper;
    private final AuthProperties authProperties;
    private final LoginAttemptPort loginAttemptService;
    private final RateLimiterPort rateLimiterService;

    @Transactional
    @Override
    public AuthResponse login(LoginRequest request) {
        validateRequest(request);
        checkRateLimits(request.getUsername());

        return loginAttemptService.executeSecurely(request.getUsername(), () -> {
            UserModel user = userLookupService.findActiveByUsernameOrThrow(request.getUsername());

            KeycloakAuthResult result = authenticateWithIdp(request.getUsername(), request.getPassword());
            verifyIdpIdentity(user, result.getKeycloakUserId());

            return handleSuccess(user, result, request.isRememberMe());
        });
    }

    private void checkRateLimits(String username) {
        if (!rateLimiterService.checkAndRecordFixed(username, AuthAction.LOGIN_SPAM, 3, 5)) {
            long retryAfter = rateLimiterService.getRemainingWaitTimeFixed(username, AuthAction.LOGIN_SPAM, 5);
            throw new DomainException(ErrorCode.TOO_MANY_REQUESTS, null, String.valueOf(retryAfter));
        }

        AuthProperties.Lockout.Spam spamConfig = authProperties.getLockout().getSpam();
        if (!rateLimiterService.checkAndRecordFixed(
                username,
                AuthAction.LOGIN,
                spamConfig.getMaxAttempts(),
                spamConfig.getWindowSeconds()
        )) {
            long retryAfter = rateLimiterService.getRemainingWaitTimeFixed(
                    username, AuthAction.LOGIN, spamConfig.getWindowSeconds());
            throw new DomainException(ErrorCode.TOO_MANY_REQUESTS, null, String.valueOf(retryAfter));
        }
    }

    private KeycloakAuthResult authenticateWithIdp(String username, String password) {
        try {
            KeycloakAuthResult result = identityManagementPort.authenticate(username, password);
            if (result == null || result.getAccessToken() == null) {
                throw new DomainException(ErrorCode.INVALID_CREDENTIALS);
            }
            return result;
        } catch (DomainException e) {
            throw e;
        } catch (Exception e) {
            log.warn("Authentication failed for user: {} - Error: {}", username, e.getMessage());
            throw new DomainException(ErrorCode.INVALID_CREDENTIALS);
        }


    }

    private void verifyIdpIdentity(UserModel user, String idpUserId) {
        UUID keycloakUuid;
        try {
            keycloakUuid = UUID.fromString(idpUserId);
        } catch (IllegalArgumentException | NullPointerException e) {
            log.error("CRITICAL SECURITY: Malformed UUID from IDP - Raw ID: '{}'", idpUserId);
            throw new DomainException(ErrorCode.INVALID_CREDENTIALS);
        }

        if (!user.getId().equals(keycloakUuid)) {
            log.error("CRITICAL SECURITY: ID mismatch for user: {} (Local: {}, IDP: {})",
                    user.getUsername(), user.getId(), idpUserId);
            throw new DomainException(ErrorCode.USER_ID_MISMATCH);
        }
    }

    private AuthResponse handleSuccess(UserModel user, KeycloakAuthResult result, boolean rememberMe) {
        String userId = user.getId().toString();

        processTokenSecurityAndCaching(userId, result, rememberMe);

        // Reset rate limit (Burst counter) khi đăng nhập thành công
        rateLimiterService.resetRateLimit(user.getUsername(), AuthAction.LOGIN);

        return buildAuthResponse(result, user, rememberMe);
    }

    @Transactional
    @Override
    public AuthResponse refreshToken(RefreshTokenRequest request) {
        log.info("Refreshing token via internal login service");
        
        KeycloakAuthResult result = identityManagementPort.refreshToken(request.getRefreshToken());
        
        if (result == null || result.getAccessToken() == null) {
            throw new DomainException(ErrorCode.REFRESH_TOKEN_EXPIRED);
        }

        String userId = result.getKeycloakUserId();
        
        // Chốt chặn định danh: Kiểm tra UUID hợp lệ cho luồng Refresh.
        UUID keycloakUuid;
        try {
            keycloakUuid = UUID.fromString(userId);
        } catch (IllegalArgumentException | NullPointerException e) {
            log.error("CRITICAL SECURITY: Malformed UUID from IDP during Refresh - Raw ID: '{}'", 
                    userId);
            throw new DomainException(ErrorCode.REFRESH_TOKEN_EXPIRED); // Treat as invalid session
        }

        // Kiểm tra nhất quán & trạng thái: Truyền trọng trách cho UserService thẩm định.
        UserModel user = userLookupService.findActiveByIdOrThrow(keycloakUuid);

        // Cập nhật Cache và hoàn tất quy trình
        processTokenSecurityAndCaching(userId, result, false);

        return buildAuthResponse(result, user, false);
    }

    @Transactional
    @Override
    public void logout(String refreshToken) {
        log.info("REST request to logout");

        if (refreshToken == null || refreshToken.isBlank()) {
            log.warn("Logout attempt without refresh token. Proceeding with clear state only.");
            return;
        }

        // 1. Invalidate local session by extracting userId from token
        try {
            UUID userId = identityManagementPort.getUserIdFromToken(refreshToken);
            tokenCachePort.revokeToken(userId.toString());
            log.info("Local session revoked in Redis for user ID: {}", userId);
        } catch (Exception e) {
            log.warn("Security: Could not extract userId from token for local revocation. "
                    + "Reason: {}. Proceeding to IDP logout.", e.getMessage());
        }

        // 2. Invalidate IDP session
        try {
            identityManagementPort.logout(refreshToken);
            log.info("Successfully requested IDP logout for provided token.");
        } catch (Exception e) {
            log.warn("Security: IDP logout failed or token already invalid. "
                    + "Reason: {}. Continuing...", e.getMessage());
        }
    }

    private void validateRequest(LoginRequest request) {
        if (request.getUsername() == null || request.getUsername().isBlank()) {
            throw new DomainException(ErrorCode.USERNAME_REQUIRED);
        }
        if (request.getPassword() == null || request.getPassword().isBlank()) {
            throw new DomainException(ErrorCode.PASSWORD_REQUIRED);
        }
    }

    private void processTokenSecurityAndCaching(String userId, KeycloakAuthResult result, boolean isRememberMe) {
        Duration tokenTtl = isRememberMe 
                ? authProperties.getToken().getRememberMeTtl() 
                : Duration.ofSeconds(result.getExpiresIn());
        
        Duration refreshTtl = isRememberMe 
                ? authProperties.getToken().getRememberMeTtl() 
                : Duration.ofSeconds(result.getRefreshExpiresIn());

        tokenCachePort.saveToken(userId, result.getAccessToken(), tokenTtl);
        tokenCachePort.saveRefreshToken(userId, result.getRefreshToken(), refreshTtl);
        log.info("Tokens cached successfully for user ID: {}", userId);
    }

    private AuthResponse buildAuthResponse(KeycloakAuthResult result, UserModel userModel, boolean isRememberMe) {
        AuthResponse response = authApplicationMapper.toResponse(result, userModel);
        response.setExpiresIn(isRememberMe 
                ? authProperties.getToken().getRememberMeTtl().toSeconds() 
                : result.getExpiresIn());
        response.setRefreshExpiresIn(isRememberMe 
                ? authProperties.getToken().getRememberMeTtl().toSeconds() 
                : result.getRefreshExpiresIn());
        return response;
    }
}
