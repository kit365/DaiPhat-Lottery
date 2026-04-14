package com.daiphat.accountservice.infrastructure.adapter.auth;
import com.fasterxml.jackson.databind.JsonNode;
import com.daiphat.accountservice.application.port.out.IdentityManagementPort;
import com.daiphat.accountservice.application.port.out.auth.KeycloakPort;
import com.daiphat.accountservice.domain.exception.DomainException;
import com.daiphat.accountservice.domain.exception.ErrorCode;
import com.daiphat.accountservice.domain.model.UserModel;
import com.daiphat.accountservice.domain.model.auth.KeycloakAuthResult;
import com.daiphat.accountservice.domain.model.enums.UserRole;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.oauth2.core.endpoint.OAuth2ParameterNames;
import org.springframework.stereotype.Component;
import org.springframework.util.LinkedMultiValueMap;
import org.springframework.util.MultiValueMap;
import org.springframework.web.client.RestClient;
import java.util.*;

/**
 * Dùng Client Credentials (Admin)
 * Chuyên trách: Tạo User, Gán Role, Reset mật khẩu trên Identity Provider (Keycloak).
 */
@Component
@Slf4j
public class AuthAdminAdapter implements IdentityManagementPort {

    private final String realm;
    private final String clientId;
    private final String clientSecret;
    private final RestClient restClient;
    private final KeycloakPort keycloakPort;

    public AuthAdminAdapter(
            @Value("${daiphat.auth.keycloak.auth-server-url}") String authServerUrl,
            @Value("${daiphat.auth.keycloak.realm}") String realm,
            @Value("${daiphat.auth.keycloak.client-id}") String clientId,
            @Value("${daiphat.auth.keycloak.client-secret}") String clientSecret,
            RestClient.Builder restClientBuilder,
            KeycloakPort keycloakPort) {
        this.realm = realm;
        this.clientId = clientId;
        this.clientSecret = clientSecret;
        this.restClient = restClientBuilder.baseUrl(authServerUrl).build();
        this.keycloakPort = keycloakPort;
    }

    private String getAdminBaseUrl() {
        return String.format("/admin/realms/%s", realm);
    }

    private String getRealmBaseUrl() {
        return String.format("/realms/%s", realm);
    }

    private String getAdminToken() {
        String tokenUrl = getRealmBaseUrl() + "/protocol/openid-connect/token";
        
        MultiValueMap<String, String> formData = new LinkedMultiValueMap<>();
        formData.add(OAuth2ParameterNames.GRANT_TYPE, "client_credentials");
        formData.add(OAuth2ParameterNames.CLIENT_ID, clientId);
        formData.add(OAuth2ParameterNames.CLIENT_SECRET, clientSecret);

        JsonNode response = restClient.post()
                .uri(tokenUrl)
                .contentType(MediaType.APPLICATION_FORM_URLENCODED)
                .body(formData)
                .retrieve()
                .body(JsonNode.class);

        if (response == null || !response.has("access_token")) {
            throw new DomainException(ErrorCode.INTERNAL_SERVER_ERROR);
        }

        return response.get("access_token").asText();
    }

    @Override
    public List<UserModel> getAllUsers() {
        String adminToken = getAdminToken();
        String getUsersUrl = getAdminBaseUrl() + "/users";

        JsonNode response = restClient.get()
                .uri(getUsersUrl)
                .header("Authorization", "Bearer " + adminToken)
                .retrieve()
                .body(JsonNode.class);

        if (response == null || !response.isArray()) {
            return Collections.emptyList();
        }

        List<UserModel> users = new ArrayList<>();
        for (JsonNode userNode : response) {
            UserModel user = UserModel.builder()
                    .id(UUID.fromString(userNode.get("id").asText()))
                    .username(userNode.get("username").asText())
                    .email(userNode.has("email") ? userNode.get("email").asText() : null)
                    .firstName(userNode.has("firstName") ? userNode.get("firstName").asText() : null)
                    .lastName(userNode.has("lastName") ? userNode.get("lastName").asText() : null)
                    .build();
            users.add(user);
        }

        return users;
    }

    @Override
    public Optional<UserModel> getUserByUsername(String username) {
        String adminToken = getAdminToken();
        String getUsersUrl = getAdminBaseUrl() + "/users?username=" + username + "&exact=true";

        JsonNode response = restClient.get()
                .uri(getUsersUrl)
                .header("Authorization", "Bearer " + adminToken)
                .retrieve()
                .body(JsonNode.class);

        if (response == null || !response.isArray() || response.isEmpty()) {
            return Optional.empty();
        }

        JsonNode userNode = response.get(0);
        return Optional.of(UserModel.builder()
                .id(UUID.fromString(userNode.get("id").asText()))
                .username(userNode.get("username").asText())
                .email(userNode.has("email") ? userNode.get("email").asText() : null)
                .firstName(userNode.has("firstName") ? userNode.get("firstName").asText() : null)
                .lastName(userNode.has("lastName") ? userNode.get("lastName").asText() : null)
                .build());
    }

    @Override
    public UUID createUser(UserModel user, String password) {
        String adminToken = getAdminToken();
        String createUserUrl = getAdminBaseUrl() + "/users";

        Map<String, Object> userPayload = new HashMap<>();
        userPayload.put("username", user.getUsername());
        userPayload.put("email", user.getEmail());
        userPayload.put("firstName", user.getFirstName());
        userPayload.put("lastName", user.getLastName());
        userPayload.put("enabled", true);

        ResponseEntity<Void> response = restClient.post()
                .uri(createUserUrl)
                .header("Authorization", "Bearer " + adminToken)
                .contentType(MediaType.APPLICATION_JSON)
                .body(userPayload)
                .retrieve()
                .onStatus(status -> status.value() == 409, (req, res) -> {
                    throw new DomainException(ErrorCode.USER_EXISTED);
                })
                .toEntity(Void.class);

        if (response.getStatusCode().is2xxSuccessful() || response.getStatusCode().value() == 201) {
            String location = Objects.requireNonNull(response.getHeaders().getLocation()).toString();
            String userId = location.substring(location.lastIndexOf("/") + 1);
            UUID keycloakUuid = UUID.fromString(userId);
            
            resetPassword(keycloakUuid, password);
            assignRole(keycloakUuid, UserRole.MEMBER.getCode());
            
            return keycloakUuid;

        } else {
            log.error("Failed to create user in Keycloak. Status: {}", response.getStatusCode());
            throw new DomainException(ErrorCode.INTERNAL_SERVER_ERROR, "Identity provider error during user creation");
        }
    }

    @Override
    public void assignRole(UUID userId, String roleCode) {
        String adminToken = getAdminToken();
        
        String getRoleUrl = getAdminBaseUrl() + "/roles/" + roleCode;
        JsonNode roleNode = restClient.get()
                .uri(getRoleUrl)
                .header("Authorization", "Bearer " + adminToken)
                .retrieve()
                .body(JsonNode.class);

        if (roleNode == null) {
            log.error("Role {} not found in Keycloak", roleCode);
            return;
        }

        String assignRoleUrl = getAdminBaseUrl() + "/users/" + userId + "/role-mappings/realm";
        restClient.post()
                .uri(assignRoleUrl)
                .header("Authorization", "Bearer " + adminToken)
                .contentType(MediaType.APPLICATION_JSON)
                .body(Collections.singletonList(roleNode))
                .retrieve()
                .toBodilessEntity();
    }

    @Override
    public void resetPassword(UUID userId, String newPassword) {
        String adminToken = getAdminToken();
        String resetPasswordUrl = getAdminBaseUrl() + "/users/" + userId + "/reset-password";

        Map<String, Object> passwordPayload = new HashMap<>();
        passwordPayload.put("type", "password");
        passwordPayload.put("value", newPassword);
        passwordPayload.put("temporary", false);

        restClient.put()
                .uri(resetPasswordUrl)
                .header("Authorization", "Bearer " + adminToken)
                .contentType(MediaType.APPLICATION_JSON)
                .body(passwordPayload)
                .retrieve()
                .toBodilessEntity();
    }

    @Override
    public void deleteUser(UUID userId) {
        String adminToken = getAdminToken();
        String deleteUserUrl = getAdminBaseUrl() + "/users/" + userId;

        restClient.delete()
                .uri(deleteUserUrl)
                .header("Authorization", "Bearer " + adminToken)
                .retrieve()
                .toBodilessEntity();
        
        log.info("Rollback: Successfully deleted user ID: {} from Keycloak", userId);
    }

    @Override
    public void verifyEmail(UUID userId) {
        String adminToken = getAdminToken();
        String url = getAdminBaseUrl() + "/users/" + userId;

        Map<String, Object> payload = new HashMap<>();
        payload.put("emailVerified", true);

        restClient.put()
                .uri(url)
                .header("Authorization", "Bearer " + adminToken)
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

        // Validate result - If null, it means an infrastructure/IDP failure occurred
        if (result == null || result.getAccessToken() == null) {
            log.error("IdentityManagement: Authentication failed - Identity Provider returned an empty response for user: {}", username);
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
        
        String tokenUrl = getRealmBaseUrl() + "/protocol/openid-connect/token";
        
        MultiValueMap<String, String> formData = new LinkedMultiValueMap<>();
        // Using Token Exchange (RFC 8693)
        formData.add(OAuth2ParameterNames.GRANT_TYPE, "urn:ietf:params:oauth:grant-type:token-exchange");
        formData.add(OAuth2ParameterNames.CLIENT_ID, clientId);
        formData.add(OAuth2ParameterNames.CLIENT_SECRET, clientSecret);
        formData.add("requested_subject", username);
        formData.add("requested_token_type", "urn:ietf:params:oauth:token-type:access_token");

        try {
            JsonNode response = restClient.post()
                    .uri(tokenUrl)
                    .contentType(MediaType.APPLICATION_FORM_URLENCODED)
                    .body(formData)
                    .retrieve()
                    .body(JsonNode.class);

            if (response == null || !response.has("access_token")) {
                log.error("IdentityManagement: Token exchange failed for user {}. Response: {}", username, response);
                throw new DomainException(ErrorCode.INTERNAL_SERVER_ERROR, "Could not issue auto-login token");
            }

            return KeycloakAuthResult.builder()
                    .accessToken(response.get("access_token").asText())
                    .refreshToken(response.has("refresh_token") ? response.get("refresh_token").asText() : null)
                    .expiresIn(response.has("expires_in") ? response.get("expires_in").asLong() : 3600L)
                    .refreshExpiresIn(response.has("refresh_expires_in") ? response.get("refresh_expires_in").asLong() : 0L)
                    .tokenType(response.has("token_type") ? response.get("token_type").asText() : "Bearer")
                    .build();
        } catch (Exception e) {
            log.error("IdentityManagement: Error during token exchange for user {}: {}", username, e.getMessage());
            throw new DomainException(ErrorCode.INTERNAL_SERVER_ERROR, "Identity provider error during auto-login");
        }
    }
}
