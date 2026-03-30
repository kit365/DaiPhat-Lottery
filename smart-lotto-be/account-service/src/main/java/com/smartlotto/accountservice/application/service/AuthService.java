package com.smartlotto.accountservice.application.service;

import com.smartlotto.accountservice.application.dto.request.LoginRequestDTO;
import com.smartlotto.accountservice.application.dto.request.LogoutRequestDTO;
import com.smartlotto.accountservice.application.dto.request.RefreshTokenRequestDTO;
import com.smartlotto.accountservice.application.dto.response.AuthResponseDTO;
import com.smartlotto.accountservice.application.mapper.AuthApplicationMapper;
import com.smartlotto.accountservice.application.port.in.AuthServicePort;
import com.smartlotto.accountservice.application.port.out.auth.KeycloakPort;
import com.smartlotto.accountservice.application.port.out.auth.AuthCachePort;
import com.smartlotto.accountservice.application.port.out.UserRepositoryPort;
import com.smartlotto.accountservice.domain.exception.ErrorCode;
import com.smartlotto.accountservice.domain.model.auth.KeycloakAuthResult;
import com.smartlotto.accountservice.domain.exception.DomainException;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.time.Duration;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Slf4j
public class AuthService implements AuthServicePort {

    private final KeycloakPort keycloakPort;
    private final AuthCachePort authCachePort;
    private final UserRepositoryPort userRepositoryPort;
    private final AuthApplicationMapper authApplicationMapper;

    @Value("${smartlotto.auth.cache.remember-me-ttl:86400}")
    private long rememberMeTtl;

    @Value("${smartlotto.auth.cache.mfa-session-ttl:900}")
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

        // Sync user
        syncAndVerifyUser(userId, username);

        // Map to DTO
        return authApplicationMapper.toResponse(result);
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
                Duration.ofSeconds(result.getExpiresIn())
        );
        authCachePort.saveRefreshToken(
                userId,
                result.getRefreshToken(),
                Duration.ofSeconds(result.getRefreshExpiresIn())
        );

        log.info("Tokens refreshed and cached successfully for user ID: {}", userId);

        return authApplicationMapper.toResponse(result);
    }

    @Transactional  // ✅ Add
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
}