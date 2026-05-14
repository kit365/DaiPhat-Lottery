package com.daiphat.accountservice.infrastructure.adapter.auth;

import com.daiphat.accountservice.application.config.AuthProperties;
import com.daiphat.accountservice.application.dto.identity.*;
import com.daiphat.accountservice.application.dto.response.auth.KeycloakTokenResponse;
import com.daiphat.accountservice.application.port.out.auth.IdentityManagementPort;
import com.daiphat.accountservice.application.port.out.auth.KeycloakPort;
import com.daiphat.accountservice.domain.exception.DomainException;
import com.daiphat.accountservice.domain.exception.ErrorCode;
import com.daiphat.accountservice.domain.model.UserModel;
import com.daiphat.accountservice.domain.model.auth.KeycloakAuthResult;
import com.daiphat.accountservice.domain.model.enums.UserRole;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.context.event.ApplicationReadyEvent;
import org.springframework.context.event.EventListener;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Component;
import org.springframework.util.LinkedMultiValueMap;
import org.springframework.util.MultiValueMap;
import org.springframework.web.client.RestClient;
import org.springframework.web.util.UriComponentsBuilder;
import com.daiphat.accountservice.application.port.out.auth.RoleRepositoryPort;
import com.daiphat.accountservice.domain.model.RoleModel;

import java.time.Instant;
import java.util.*;

import static com.daiphat.accountservice.infrastructure.adapter.auth.KeycloakConstants.*;

/**
 * Keycloak Admin Adapter - Chuyên trách cấu hình và quản lý User/Role trên Identity Provider.
 * Đã refactor triệt để: Dùng DTO, hằng số tập trung, UriComponentsBuilder và loại bỏ JsonNode manual.
 */
@Component
@Slf4j
public class AuthAdminAdapter implements IdentityManagementPort {

    // API Paths (Standard root paths for Port 8180)
    private static final String PATH_TOKEN = "/realms/{realm}/protocol/openid-connect/token";
    private static final String PATH_ADMIN_REALM = "/admin/realms/{realm}";
    private static final String PATH_USERS = "/users";
    private static final String PATH_ROLES = "/roles";
    private static final String PATH_RESET_PASSWORD = "/reset-password";
    private static final String PATH_ROLE_MAPPINGS_REALM = "/role-mappings/realm";

    // Roles that should NEVER be deleted from Keycloak
    private static final Set<String> PROTECTED_ROLES = Set.of(
        "admin", "uma_authorization", "offline_access", 
        "default-roles-daiphat", "view-realm", "manage-users",
        "query-users", "view-users", "query-groups"
    );

    private final AuthProperties authProperties;
    private final RestClient restClient;
    private final KeycloakPort keycloakPort;
    private final RoleRepositoryPort roleRepositoryPort;

    // Token Cache
    private String cachedAdminToken;
    private Instant tokenExpiry;

    public AuthAdminAdapter(AuthProperties authProperties, RestClient.Builder restClientBuilder, 
            KeycloakPort keycloakPort, RoleRepositoryPort roleRepositoryPort) {
        this.authProperties = authProperties;
        this.keycloakPort = keycloakPort;
        this.roleRepositoryPort = roleRepositoryPort;
        
        // Ưu tiên dùng URL nội bộ (internal) nếu có để tránh lỗi resolve trong mạng Docker
        String baseUrl = authProperties.getKeycloak().getInternalAuthServerUrl();
        if (baseUrl == null || baseUrl.isBlank()) {
            baseUrl = authProperties.getKeycloak().getAuthServerUrl();
        }
        
        if (baseUrl != null && !baseUrl.endsWith("/")) {
            baseUrl += "/";
        }
        
        this.restClient = restClientBuilder.baseUrl(baseUrl).build();
    }

    private String getAdminToken() {
        if (cachedAdminToken != null && tokenExpiry != null && Instant.now().isBefore(tokenExpiry)) {
            return cachedAdminToken;
        }

        log.info("Fetching new Admin Access Token from Keycloak...");
        AuthProperties.Keycloak k = authProperties.getKeycloak();
        
        MultiValueMap<String, String> formData = new LinkedMultiValueMap<>();
        formData.add(PARAM_GRANT_TYPE, GRANT_TYPE_CLIENT_CREDENTIALS);
        formData.add(PARAM_CLIENT_ID, k.getAdminClientId());
        formData.add(PARAM_CLIENT_SECRET, k.getAdminClientSecret());

        KeycloakTokenResponse response = restClient.post()
                .uri(PATH_TOKEN, k.getRealm())
                .contentType(MediaType.APPLICATION_FORM_URLENCODED)
                .body(formData)
                .retrieve()
                .body(KeycloakTokenResponse.class);

        if (response == null || response.getAccessToken() == null) {
            log.error("CRITICAL: Identity Provider failed to return Admin token for realm: {}", 
                    k.getRealm());
            throw new DomainException(ErrorCode.INTERNAL_SERVER_ERROR);
        }

        this.cachedAdminToken = response.getAccessToken();
        long expiresIn = response.getExpiresIn() != null ? response.getExpiresIn() : 60;
        this.tokenExpiry = Instant.now().plusSeconds(expiresIn - 10);
        
        return cachedAdminToken;
    }

    private RestClient.RequestBodySpec adminRequest(HttpMethod method, String... pathParts) {
        UriComponentsBuilder builder = UriComponentsBuilder.fromPath(PATH_ADMIN_REALM);
        for (String part : pathParts) {
            builder.path(part);
        }
        
        String uri = builder.buildAndExpand(authProperties.getKeycloak().getRealm()).toUriString();
        
        return restClient.method(method)
                .uri(uri)
                .header(HttpHeaders.AUTHORIZATION, BEARER_PREFIX + getAdminToken());
    }

    private UserModel toDomainModel(KeycloakUserDTO dto) {
        return UserModel.builder()
                .id(UUID.fromString(dto.getId()))
                .username(dto.getUsername())
                .email(dto.getEmail())
                .firstName(dto.getFirstName())
                .lastName(dto.getLastName())
                .build();
    }

    @Override
    public List<UserModel> getAllUsers() {
        KeycloakUserDTO[] dtos = adminRequest(HttpMethod.GET, PATH_USERS)
                .retrieve()
                .body(KeycloakUserDTO[].class);

        if (dtos == null) {
            return Collections.emptyList();
        }
        
        return Arrays.stream(dtos)
                .map(this::toDomainModel)
                .toList();
    }

    @Override
    public Optional<UserModel> getUserByUsername(String username) {
        String uri = UriComponentsBuilder.fromPath(PATH_USERS)
                .queryParam("username", username)
                .queryParam("exact", true)
                .toUriString();

        KeycloakUserDTO[] dtos = adminRequest(HttpMethod.GET, uri)
                .retrieve()
                .body(KeycloakUserDTO[].class);

        if (dtos == null || dtos.length == 0) {
            return Optional.empty();
        }
        
        return Optional.of(toDomainModel(dtos[0]));
    }

    @Override
    public UUID createUser(UserModel user, String password, boolean temporary) {
        KeycloakUserDTO payload = KeycloakUserDTO.fromModel(user, password, temporary);

        ResponseEntity<Void> response = adminRequest(HttpMethod.POST, PATH_USERS)
                .contentType(MediaType.APPLICATION_JSON)
                .body(payload)
                .retrieve()
                .onStatus(status -> status.value() == 409, (req, res) -> {
                    throw new DomainException(ErrorCode.USER_EXISTED);
                })
                .toEntity(Void.class);

        if (response.getStatusCode().is2xxSuccessful() || response.getStatusCode().value() == 201) {
            String location = Objects.requireNonNull(response.getHeaders().getLocation())
                    .toString();
            String userId = location.substring(location.lastIndexOf("/") + 1);
            return UUID.fromString(userId);
        }
        
        log.error("Failed to create user in Keycloak. Status: {}", response.getStatusCode());
        throw new DomainException(ErrorCode.INTERNAL_SERVER_ERROR);
    }

    @Override
    public void assignRole(UUID userId, String roleCode) {
        KeycloakRoleDTO role = adminRequest(HttpMethod.GET, PATH_ROLES + "/" + roleCode)
                .retrieve()
                .body(KeycloakRoleDTO.class);

        if (role == null) {
            log.error("Role {} not found in Keycloak", roleCode);
            return;
        }

        adminRequest(HttpMethod.POST, PATH_USERS + "/" + userId + PATH_ROLE_MAPPINGS_REALM)
                .contentType(MediaType.APPLICATION_JSON)
                .body(Collections.singletonList(role))
                .retrieve()
                .toBodilessEntity();
    }

    @Override
    public void resetPassword(UUID userId, String newPassword, boolean temporary) {
        KeycloakCredentialDTO payload = KeycloakCredentialDTO.password(newPassword, temporary);

        adminRequest(HttpMethod.PUT, PATH_USERS + "/" + userId + PATH_RESET_PASSWORD)
                .contentType(MediaType.APPLICATION_JSON)
                .body(payload)
                .retrieve()
                .toBodilessEntity();
    }

    @Override
    public void deleteUser(UUID userId) {
        adminRequest(HttpMethod.DELETE, PATH_USERS + "/" + userId)
                .retrieve()
                .toBodilessEntity();
        
        log.info("Rollback: Successfully deleted user ID: {} from Keycloak", userId);
    }

    @Override
    public void verifyEmail(UUID userId) {
        KeycloakUserDTO payload = KeycloakUserDTO.builder()
                .emailVerified(true)
                .build();

        adminRequest(HttpMethod.PUT, PATH_USERS + "/" + userId)
                .contentType(MediaType.APPLICATION_JSON)
                .body(payload)
                .retrieve()
                .toBodilessEntity();
        
        log.info("Sync: Successfully verified email for user ID: {} in Keycloak", userId);
    }

    @Override
    public KeycloakAuthResult authenticate(String username, String password) {
        log.info("IdentityManagement: Attempting authentication for user: {}", username);
        KeycloakAuthResult result = keycloakPort.login(username, password);

        if (result == null || result.getAccessToken() == null) {
            log.error("IdentityManagement: Authentication failed for user: {}", username);
            throw new DomainException(ErrorCode.INTERNAL_SERVER_ERROR);
        }

        return result;
    }

    @Override
    public void logout(String refreshToken) {
        log.info("IdentityManagement: Attempting logout for session");
        keycloakPort.logout(refreshToken);
    }

    @Override
    public KeycloakAuthResult refreshToken(String refreshToken) {
        log.info("IdentityManagement: Attempting token refresh");
        return keycloakPort.refreshToken(refreshToken);
    }

    @Override
    public UUID getUserIdFromToken(String token) {
        return keycloakPort.getUserIdFromToken(token);
    }

    @Override
    public KeycloakAuthResult issueToken(String username) {
        log.info("IdentityManagement: Issuing administrative token for user: {}", username);
        AuthProperties.Keycloak k = authProperties.getKeycloak();
        
        MultiValueMap<String, String> formData = new LinkedMultiValueMap<>();
        formData.add(PARAM_GRANT_TYPE, GRANT_TYPE_TOKEN_EXCHANGE);
        formData.add(PARAM_CLIENT_ID, k.getClientId());
        formData.add(PARAM_CLIENT_SECRET, k.getClientSecret());
        formData.add(PARAM_REQUESTED_SUBJECT, username);
        formData.add(PARAM_REQUESTED_TOKEN_TYPE, TOKEN_TYPE_ACCESS_TOKEN);

        KeycloakTokenResponse response = restClient.post()
                .uri(PATH_TOKEN, k.getRealm())
                .contentType(MediaType.APPLICATION_FORM_URLENCODED)
                .body(formData)
                .retrieve()
                .body(KeycloakTokenResponse.class);

        if (response == null || response.getAccessToken() == null) {
            log.error("IdentityManagement: Token exchange failed for user {}.", username);
            throw new DomainException(ErrorCode.INTERNAL_SERVER_ERROR);
        }

        return KeycloakAuthResult.builder()
                .accessToken(response.getAccessToken())
                .refreshToken(response.getRefreshToken())
                .expiresIn(response.getExpiresIn() != null ? response.getExpiresIn() : 3600L)
                .refreshExpiresIn(response.getRefreshExpiresIn() != null 
                        ? response.getRefreshExpiresIn() : 0L)
                .tokenType(response.getTokenType() != null ? response.getTokenType() : "Bearer")
                .build();
    }

    @Override
    public List<KeycloakRoleDTO> getAllRoles() {
        KeycloakRoleDTO[] roles = adminRequest(HttpMethod.GET, PATH_ROLES)
                .retrieve()
                .body(KeycloakRoleDTO[].class);
        return roles != null ? Arrays.asList(roles) : Collections.emptyList();
    }

    @Override
    public void createRole(String name, String description) {
        KeycloakRoleDTO payload = KeycloakRoleDTO.builder()
                .name(name)
                .description(description)
                .build();

        adminRequest(HttpMethod.POST, PATH_ROLES)
                .contentType(MediaType.APPLICATION_JSON)
                .body(payload)
                .retrieve()
                .toBodilessEntity();
        
        log.info("Keycloak: Successfully created role: {}", name);
    }

    @Override
    public void deleteRole(String name) {
        if (PROTECTED_ROLES.contains(name)) {
            log.warn("Keycloak: Skipping deletion of protected role: {}", name);
            return;
        }

        adminRequest(HttpMethod.DELETE, PATH_ROLES + "/" + name)
                .retrieve()
                .toBodilessEntity();
        
        log.info("Keycloak: Successfully deleted obsolete role: {}", name);
    }

    /**
     * Symmetric Role Synchronization on System Startup.
     * Ensures Keycloak realm roles perfectly match the roles in our system DB.
     */
    @EventListener(ApplicationReadyEvent.class)
    public void syncRolesWithKeycloak() {
        log.info("--- STARTING SYMMETRIC ROLE SYNC WITH KEYCLOAK ---");
        try {
            // 1. Fetch source of truth (DB)
            List<RoleModel> systemRoles = roleRepositoryPort.findAll();
            Set<String> systemRoleCodes = new HashSet<>(systemRoles.stream()
                    .map(RoleModel::getCode)
                    .toList());

            // 2. Fetch current state (Keycloak)
            List<KeycloakRoleDTO> keycloakRoles = getAllRoles();
            Set<String> keycloakRoleCodes = new HashSet<>(keycloakRoles.stream()
                    .map(KeycloakRoleDTO::getName)
                    .toList());

            log.info("Role Sync: DB roles: {}, Keycloak roles: {}", 
                    systemRoleCodes.size(), keycloakRoleCodes.size());

            // 3. Add Missing Roles (DB -> Keycloak)
            systemRoles.stream()
                    .filter(role -> !keycloakRoleCodes.contains(role.getCode()))
                    .forEach(role -> {
                        log.info("Role Sync: Found missing role in DB: {}. Creating in Keycloak...", role.getCode());
                        createRole(role.getCode(), role.getDescription());
                    });

            // 4. Delete Obsolete Roles (Keycloak -> Trash)
            keycloakRoleCodes.stream()
                    .filter(roleCode -> !systemRoleCodes.contains(roleCode))
                    .filter(roleCode -> !PROTECTED_ROLES.contains(roleCode))
                    .forEach(roleCode -> {
                        log.info("Role Sync: Found obsolete role in Keycloak: {}. Deleting...", roleCode);
                        deleteRole(roleCode);
                    });

            log.info("--- ROLE SYNC COMPLETED SUCCESSFULLY ---");
        } catch (Exception e) {
            log.warn("IDP Sync Warning: Could not synchronize roles with Keycloak on startup. " +
                    "This usually means Keycloak is still starting up or unreachable. " +
                    "Reason: {}", e.getMessage());
            // We don't rethrow to allow the application to start and handle errors during actual login attempts
        }
    }
}
