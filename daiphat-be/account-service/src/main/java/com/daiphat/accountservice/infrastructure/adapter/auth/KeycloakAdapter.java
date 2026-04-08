package com.daiphat.accountservice.infrastructure.adapter.auth;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.daiphat.accountservice.application.dto.request.LoginRequestDTO;
import com.daiphat.accountservice.application.dto.response.AuthResponseDTO;
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

@Component
@RequiredArgsConstructor
@Slf4j
public class KeycloakAdapter implements KeycloakPort {

    private final RestClient restClient;
    private final ObjectMapper objectMapper;

    @Value("${spring.security.oauth2.client.registration.keycloak.client-id}")
    private String clientId;

    @Value("${spring.security.oauth2.client.registration.keycloak.client-secret}")
    private String clientSecret;

    @Value("${spring.security.oauth2.resourceserver.jwt.issuer-uri}")
    private String issuerUri;

    @Override
    public KeycloakAuthResult login(LoginRequestDTO request) {
        String tokenUrl = UriComponentsBuilder.fromUriString(issuerUri)
                .path("/protocol/openid-connect/token")
                .toUriString();

        MultiValueMap<String, String> formData = new LinkedMultiValueMap<>();
        formData.add(OAuth2ParameterNames.GRANT_TYPE, "password");
        formData.add(OAuth2ParameterNames.CLIENT_ID, clientId);
        formData.add(OAuth2ParameterNames.CLIENT_SECRET, clientSecret);
        formData.add(OAuth2ParameterNames.USERNAME, request.getUsername());
        formData.add(OAuth2ParameterNames.PASSWORD, request.getPassword());
        formData.add(OAuth2ParameterNames.SCOPE, "openid profile email");

        AuthResponseDTO response = restClient.post()
                .uri(tokenUrl)
                .contentType(MediaType.APPLICATION_FORM_URLENCODED)
                .body(formData)
                .retrieve()
                .onStatus(HttpStatusCode::is4xxClientError, (req, resp) -> {
                    String errorBody = objectMapper.readTree(resp.getBody()).toString();
                    log.error("Login failed for user: {}. Status: {}. Details: {}", 
                        request.getUsername(), resp.getStatusCode(), errorBody);
                    throw new DomainException(ErrorCode.INVALID_CREDENTIALS);
                })
                .body(AuthResponseDTO.class);

        return decodeResult(response);
    }

    @Override
    public void logout(String refreshToken) {
        String logoutUrl = UriComponentsBuilder.fromUriString(issuerUri)
                .path("/protocol/openid-connect/logout")
                .toUriString();

        MultiValueMap<String, String> formData = new LinkedMultiValueMap<>();
        formData.add(OAuth2ParameterNames.CLIENT_ID, clientId);
        formData.add(OAuth2ParameterNames.CLIENT_SECRET, clientSecret);
        formData.add(OAuth2ParameterNames.REFRESH_TOKEN, refreshToken);

        restClient.post()
                .uri(logoutUrl)
                .contentType(MediaType.APPLICATION_FORM_URLENCODED)
                .body(formData)
                .retrieve()
                .onStatus(HttpStatusCode::isError, (req, resp) -> {
                    log.error("Logout failed at Keycloak. Status: {}", resp.getStatusCode());
                    throw new DomainException(ErrorCode.INTERNAL_SERVER_ERROR);
                })
                .toBodilessEntity();
    }

    @Override
    public KeycloakAuthResult refreshToken(String refreshToken) {
        String tokenUrl = UriComponentsBuilder.fromUriString(issuerUri)
                .path("/protocol/openid-connect/token")
                .toUriString();

        MultiValueMap<String, String> formData = new LinkedMultiValueMap<>();
        formData.add(OAuth2ParameterNames.GRANT_TYPE, OAuth2ParameterNames.REFRESH_TOKEN);
        formData.add(OAuth2ParameterNames.CLIENT_ID, clientId);
        formData.add(OAuth2ParameterNames.CLIENT_SECRET, clientSecret);
        formData.add(OAuth2ParameterNames.REFRESH_TOKEN, refreshToken);

        AuthResponseDTO response = restClient.post()
                .uri(tokenUrl)
                .contentType(MediaType.APPLICATION_FORM_URLENCODED)
                .body(formData)
                .retrieve()
                .onStatus(HttpStatusCode::isError, (req, resp) -> {
                    log.error("Token refresh failed at Keycloak. Status: {}", resp.getStatusCode());
                    throw new DomainException(ErrorCode.UNAUTHORIZED);
                })
                .body(AuthResponseDTO.class);

        return decodeResult(response);
    }

    private KeycloakAuthResult decodeResult(AuthResponseDTO response) {
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
