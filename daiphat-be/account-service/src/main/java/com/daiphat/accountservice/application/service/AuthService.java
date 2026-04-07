package com.daiphat.accountservice.application.service;

import com.daiphat.accountservice.application.dto.request.LoginRequestDTO;
import com.daiphat.accountservice.application.dto.request.LogoutRequestDTO;
import com.daiphat.accountservice.application.dto.request.RefreshTokenRequestDTO;
import com.daiphat.accountservice.application.dto.request.UserRegistrationRequestDTO;
import com.daiphat.accountservice.application.dto.response.AuthResponseDTO;
import com.daiphat.accountservice.application.mapper.AuthApplicationMapper;
import com.daiphat.accountservice.application.mapper.UserApplicationMapper;
import com.daiphat.accountservice.application.port.in.AuthServicePort;
import com.daiphat.accountservice.application.port.out.auth.KeycloakPort;
import com.daiphat.accountservice.application.port.out.auth.AuthCachePort;
import com.daiphat.accountservice.application.port.out.IdentityManagementPort;
import com.daiphat.accountservice.application.port.out.RoleRepositoryPort;
import com.daiphat.accountservice.application.port.out.UserRepositoryPort;
import com.daiphat.accountservice.domain.exception.ErrorCode;
import com.daiphat.accountservice.domain.model.UserModel;
import com.daiphat.accountservice.domain.model.RoleModel;
import com.daiphat.accountservice.domain.model.auth.KeycloakAuthResult;
import com.daiphat.accountservice.domain.exception.DomainException;
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
    private final IdentityManagementPort identityManagementPort;
    private final RoleRepositoryPort roleRepositoryPort;
    private final AuthApplicationMapper authApplicationMapper;
    private final UserApplicationMapper userApplicationMapper;

    @Value("${daiphat.auth.cache.remember-me-ttl:86400}")
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
            RoleModel role = roleRepositoryPort.findByCode("USER")
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
}