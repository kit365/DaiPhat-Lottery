package com.daiphat.accountservice.infrastructure.adapter.auth;

import com.daiphat.accountservice.application.dto.response.auth.AuthResponse;
import com.daiphat.accountservice.application.config.AuthProperties;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.daiphat.accountservice.application.port.out.auth.KeycloakPort;
import com.daiphat.accountservice.domain.exception.DomainException;
import com.daiphat.accountservice.domain.exception.ErrorCode;
import com.daiphat.accountservice.domain.model.auth.KeycloakAuthResult;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatusCode;
import org.springframework.http.MediaType;
import org.springframework.security.oauth2.core.endpoint.OAuth2ParameterNames;
import org.springframework.stereotype.Component;
import org.springframework.util.LinkedMultiValueMap;
import org.springframework.util.MultiValueMap;
import org.springframework.web.client.RestClient;
import org.springframework.web.util.UriComponentsBuilder;

import java.util.Base64;
import java.util.UUID;

@Component
@RequiredArgsConstructor
@Slf4j
public class KeycloakAdapter implements KeycloakPort {

    private final RestClient restClient;
    private final ObjectMapper objectMapper;

    private final AuthProperties authProperties;

    private String getBaseUrlForApi() {
        String internalUrl = authProperties.getKeycloak().getInternalAuthServerUrl();
        String realm = authProperties.getKeycloak().getRealm();
        
        // Construct the full realm URL
        if (internalUrl != null && !internalUrl.isBlank()) {
            return internalUrl.endsWith("/") ? internalUrl + "realms/" + realm : internalUrl + "/realms/" + realm;
        }
        
        String authServerUrl = authProperties.getKeycloak().getAuthServerUrl();
        return authServerUrl.endsWith("/") ? authServerUrl + "realms/" + realm : authServerUrl + "/realms/" + realm;
    }

    @Override
    public KeycloakAuthResult login(String username, String password) {
        String tokenUrl = UriComponentsBuilder.fromUriString(getBaseUrlForApi())
                .path("/protocol/openid-connect/token")
                .toUriString();

        MultiValueMap<String, String> formData = new LinkedMultiValueMap<>();
        formData.add(OAuth2ParameterNames.GRANT_TYPE, "password");
        formData.add(OAuth2ParameterNames.CLIENT_ID, authProperties.getKeycloak().getClientId());
        formData.add(OAuth2ParameterNames.CLIENT_SECRET, authProperties.getKeycloak().getClientSecret());
        formData.add(OAuth2ParameterNames.USERNAME, username);
        formData.add(OAuth2ParameterNames.PASSWORD, password);
        formData.add(OAuth2ParameterNames.SCOPE, "openid profile email");

        AuthResponse response = restClient.post()
                .uri(tokenUrl)
                .contentType(MediaType.APPLICATION_FORM_URLENCODED)
                .body(formData)
                .retrieve()
                .onStatus(status -> status.value() == 400 || status.value() == 401, (req, resp) -> {
                    log.warn("IdentityManagement: Invalid credentials for user: {}", username);
                    throw new DomainException(ErrorCode.INVALID_CREDENTIALS);
                })
                .onStatus(HttpStatusCode::isError, (req, resp) -> {
                    log.error("IdentityManagement: Keycloak infrastructure error. Status: {}", resp.getStatusCode());
                    throw new DomainException(ErrorCode.INTERNAL_SERVER_ERROR);
                })
                .body(AuthResponse.class);

        return decodeResult(response);
    }

    @Override
    public void logout(String refreshToken) {
        MultiValueMap<String, String> formData = new LinkedMultiValueMap<>();
        formData.add(OAuth2ParameterNames.CLIENT_ID, authProperties.getKeycloak().getClientId());
        formData.add(OAuth2ParameterNames.CLIENT_SECRET, authProperties.getKeycloak().getClientSecret());
        formData.add(OAuth2ParameterNames.REFRESH_TOKEN, refreshToken);

        String logoutUrl = UriComponentsBuilder.fromUriString(getBaseUrlForApi())
                .path("/protocol/openid-connect/logout")
                .toUriString();

        restClient.post()
                .uri(logoutUrl)
                .contentType(MediaType.APPLICATION_FORM_URLENCODED)
                .body(formData)
                .retrieve()
                .onStatus(HttpStatusCode::isError, (req, resp) -> {
                    log.error("IdentityManagement: Logout failed at Keycloak. Status: {}", resp.getStatusCode());
                    throw new DomainException(ErrorCode.INTERNAL_SERVER_ERROR);
                })
                .toBodilessEntity();
    }

    @Override
    public KeycloakAuthResult refreshToken(String refreshToken) {
        String tokenUrl = UriComponentsBuilder.fromUriString(getBaseUrlForApi())
                .path("/protocol/openid-connect/token")
                .toUriString();

        MultiValueMap<String, String> formData = new LinkedMultiValueMap<>();
        formData.add(OAuth2ParameterNames.GRANT_TYPE, OAuth2ParameterNames.REFRESH_TOKEN);
        formData.add(OAuth2ParameterNames.CLIENT_ID, authProperties.getKeycloak().getClientId());
        formData.add(OAuth2ParameterNames.CLIENT_SECRET, authProperties.getKeycloak().getClientSecret());
        formData.add(OAuth2ParameterNames.REFRESH_TOKEN, refreshToken);

        AuthResponse response = restClient.post()
                .uri(tokenUrl)
                .contentType(MediaType.APPLICATION_FORM_URLENCODED)
                .body(formData)
                .retrieve()
                .onStatus(status -> status.value() == 400 || status.value() == 401, (req, resp) -> {
                    log.warn("IdentityManagement: Token refresh failed - invalid or expired token.");
                    throw new DomainException(ErrorCode.REFRESH_TOKEN_EXPIRED);
                })
                .onStatus(HttpStatusCode::isError, (req, resp) -> {
                    log.error("IdentityManagement: Token refresh failed at Keycloak infrastructure. Status: {}", 
                            resp.getStatusCode());
                    throw new DomainException(ErrorCode.INTERNAL_SERVER_ERROR);
                })
                .body(AuthResponse.class);

        return decodeResult(response);
    }

    @Override
    public UUID getUserIdFromToken(String token) {
        try {
            String[] chunks = token.split("\\.");
            if (chunks.length < 2) {
                throw new DomainException(ErrorCode.INTERNAL_SERVER_ERROR);
            }
            String payload = new String(Base64.getUrlDecoder().decode(chunks[1]));
            JsonNode payloadNode = objectMapper.readTree(payload);
            return UUID.fromString(payloadNode.get("sub").asText());
        } catch (Exception e) {
            log.error("Failed to extract userId from token in KeycloakAdapter: {}", e.getMessage());
            throw new DomainException(ErrorCode.INTERNAL_SERVER_ERROR);
        }
    }

    private KeycloakAuthResult decodeResult(AuthResponse response) {
        try {
            String[] chunks = response.getAccessToken().split("\\.");
            String payload = new String(Base64.getUrlDecoder().decode(chunks[1]));
            JsonNode payloadNode = objectMapper.readTree(payload);

            return KeycloakAuthResult.builder()
                    .keycloakUserId(payloadNode.get("sub").asText())
                    .username(payloadNode.get("preferred_username").asText())
                    .accessToken(response.getAccessToken())
                    .refreshToken(response.getRefreshToken())
                    .expiresIn(response.getExpiresIn())
                    .refreshExpiresIn(response.getRefreshExpiresIn())
                    .tokenType(response.getTokenType())
                    .scope(response.getScope())
                    .build();
        } catch (Exception e) {
            log.error("Failed to decode token in KeycloakAdapter: {}", e.getMessage());
            throw new DomainException(ErrorCode.INTERNAL_SERVER_ERROR);
        }
    }
}
