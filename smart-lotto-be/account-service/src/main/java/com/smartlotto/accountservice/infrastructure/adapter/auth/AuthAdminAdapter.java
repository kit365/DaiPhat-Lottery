package com.smartlotto.accountservice.infrastructure.adapter.auth;

import com.fasterxml.jackson.databind.JsonNode;
import com.smartlotto.accountservice.application.port.out.IdentityManagementPort;
import com.smartlotto.accountservice.domain.exception.DomainException;
import com.smartlotto.accountservice.domain.exception.ErrorCode;
import com.smartlotto.accountservice.domain.model.UserModel;
import com.smartlotto.accountservice.domain.model.enums.UserRole;
import lombok.RequiredArgsConstructor;
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
 * Adapter quản lý định danh (Identity Management) - Dùng Client Credentials (Admin)
 * Chuyên trách: Tạo User, Gán Role, Reset mật khẩu trên Identity Provider (Keycloak).
 */
@Component
@RequiredArgsConstructor
@Slf4j
public class AuthAdminAdapter implements IdentityManagementPort {

    @Value("${smartlotto.auth.keycloak.auth-server-url}")
    private String authServerUrl;

    @Value("${smartlotto.auth.keycloak.realm}")
    private String realm;

    @Value("${smartlotto.auth.keycloak.client-id}")
    private String clientId;

    @Value("${smartlotto.auth.keycloak.client-secret}")
    private String clientSecret;

    private final RestClient.Builder restClientBuilder;

    private String getAdminToken() {
        String tokenUrl = String.format("%s/realms/%s/protocol/openid-connect/token", authServerUrl, realm);
        
        MultiValueMap<String, String> formData = new LinkedMultiValueMap<>();
        formData.add(OAuth2ParameterNames.GRANT_TYPE, "client_credentials");
        formData.add(OAuth2ParameterNames.CLIENT_ID, clientId);
        formData.add(OAuth2ParameterNames.CLIENT_SECRET, clientSecret);

        JsonNode response = restClientBuilder.build()
                .post()
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
        String getUsersUrl = String.format("%s/admin/realms/%s/users", authServerUrl, realm);

        JsonNode response = restClientBuilder.build()
                .get()
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
    public UUID createUser(UserModel user, String password) {
        String adminToken = getAdminToken();
        String createUserUrl = String.format("%s/admin/realms/%s/users", authServerUrl, realm);

        Map<String, Object> userPayload = new HashMap<>();
        userPayload.put("username", user.getUsername());
        userPayload.put("email", user.getEmail());
        userPayload.put("firstName", user.getFirstName());
        userPayload.put("lastName", user.getLastName());
        userPayload.put("enabled", true);

        ResponseEntity<Void> response = restClientBuilder.build()
                .post()
                .uri(createUserUrl)
                .header("Authorization", "Bearer " + adminToken)
                .contentType(MediaType.APPLICATION_JSON)
                .body(userPayload)
                .retrieve()
                .toEntity(Void.class);

        if (response.getStatusCode().is2xxSuccessful() || response.getStatusCode().value() == 201) {
            String location = Objects.requireNonNull(response.getHeaders().getLocation()).toString();
            String userId = location.substring(location.lastIndexOf("/") + 1);
            UUID keycloakUuid = UUID.fromString(userId);
            
            resetPassword(keycloakUuid, password);
            assignRole(keycloakUuid, UserRole.USER.getCode());
            
            return keycloakUuid;

        } else {
            log.error("Failed to create user in Keycloak. Status: {}", response.getStatusCode());
            throw new DomainException(ErrorCode.USER_EXISTED);
        }
    }

    @Override
    public void assignRole(UUID userId, String roleCode) {
        String adminToken = getAdminToken();
        
        String getRoleUrl = String.format("%s/admin/realms/%s/roles/%s", authServerUrl, realm, roleCode);
        JsonNode roleNode = restClientBuilder.build()
                .get()
                .uri(getRoleUrl)
                .header("Authorization", "Bearer " + adminToken)
                .retrieve()
                .body(JsonNode.class);

        if (roleNode == null) {
            log.error("Role {} not found in Keycloak", roleCode);
            return;
        }

        String assignRoleUrl = String.format("%s/admin/realms/%s/users/%s/role-mappings/realm", authServerUrl, realm, userId);
        restClientBuilder.build()
                .post()
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
        String resetPasswordUrl = String.format("%s/admin/realms/%s/users/%s/reset-password", authServerUrl, realm, userId);

        Map<String, Object> passwordPayload = new HashMap<>();
        passwordPayload.put("type", "password");
        passwordPayload.put("value", newPassword);
        passwordPayload.put("temporary", false);

        restClientBuilder.build()
                .put()
                .uri(resetPasswordUrl)
                .header("Authorization", "Bearer " + adminToken)
                .contentType(MediaType.APPLICATION_JSON)
                .body(passwordPayload)
                .retrieve()
                .toBodilessEntity();
    }
}
