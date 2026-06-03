package com.daiphat.coreapi.infrastructure.oauth;

import com.daiphat.coreapi.application.dto.request.auth.GoogleLoginRequest;
import com.daiphat.coreapi.application.port.out.auth.GoogleOAuthPort;
import com.daiphat.coreapi.domain.exception.DomainException;
import com.daiphat.coreapi.domain.exception.ErrorCode;
import com.daiphat.coreapi.domain.model.auth.OAuthUserInfo;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;
import org.springframework.util.LinkedMultiValueMap;
import org.springframework.web.client.RestClient;
import org.springframework.web.util.UriComponentsBuilder;

import java.net.URI;
import java.nio.charset.StandardCharsets;
import java.util.UUID;

@Component
@RequiredArgsConstructor
public class GoogleOAuthAdapter implements GoogleOAuthPort {

    private static final String PROVIDER = "google";

    private final RestClient restClient = RestClient.create();

    @Value("${spring.google.client-id}")
    private String clientId;

    @Value("${spring.google.client-secret}")
    private String clientSecret;

    @Value("${spring.google.token-url}")
    private String tokenUrl;

    @Value("${spring.google.token-info-url}")
    private String tokenInfoUrl;

    @Value("${spring.google.user-info-url}")
    private String userInfoUrl;

    @Override
    public OAuthUserInfo verify(GoogleLoginRequest request) {
        if (request == null) {
            throw new DomainException(ErrorCode.INVALID_CREDENTIALS);
        }
        if (hasText(request.code())) {
            GoogleTokenResponse token = exchangeCode(request);
            return verifyIdToken(token.idToken());
        }
        if (hasText(request.idToken())) {
            return verifyIdToken(request.idToken());
        }
        if (hasText(request.accessToken())) {
            return verifyAccessToken(request.accessToken());
        }
        throw new DomainException(ErrorCode.INVALID_CREDENTIALS);
    }

    private GoogleTokenResponse exchangeCode(GoogleLoginRequest request) {
        if (!hasText(request.redirectUri())) {
            throw new DomainException(ErrorCode.INVALID_INPUT, "Google redirectUri is required");
        }

        LinkedMultiValueMap<String, String> body = new LinkedMultiValueMap<>();
        body.add("grant_type", "authorization_code");
        body.add("client_id", clientId);
        body.add("code", request.code());
        body.add("redirect_uri", request.redirectUri());
        if (hasText(clientSecret)) {
            body.add("client_secret", clientSecret);
        }
        if (hasText(request.codeVerifier())) {
            body.add("code_verifier", request.codeVerifier());
        }

        try {
            GoogleTokenResponse response = restClient.post()
                    .uri(tokenUrl)
                    .contentType(MediaType.APPLICATION_FORM_URLENCODED)
                    .body(body)
                    .retrieve()
                    .body(GoogleTokenResponse.class);
            if (response == null || !hasText(response.idToken())) {
                throw new DomainException(ErrorCode.INVALID_CREDENTIALS);
            }
            return response;
        } catch (DomainException e) {
            throw e;
        } catch (RuntimeException e) {
            throw new DomainException(ErrorCode.INVALID_CREDENTIALS, e);
        }
    }

    private OAuthUserInfo verifyIdToken(String idToken) {
        try {
            URI tokenInfoUri = UriComponentsBuilder.fromUriString(tokenInfoUrl)
                    .queryParam("id_token", idToken)
                    .build(true)
                    .toUri();

            GoogleTokenInfoResponse response = restClient.get()
                    .uri(tokenInfoUri)
                    .retrieve()
                    .body(GoogleTokenInfoResponse.class);
            if (response == null || !clientId.equals(response.aud()) || !Boolean.parseBoolean(response.emailVerified())) {
                throw new DomainException(ErrorCode.INVALID_CREDENTIALS);
            }
            return toOAuthUserInfo(response.sub(), response.email(), response.givenName(), response.familyName(), response.picture());
        } catch (DomainException e) {
            throw e;
        } catch (RuntimeException e) {
            throw new DomainException(ErrorCode.INVALID_CREDENTIALS, e);
        }
    }

    private OAuthUserInfo verifyAccessToken(String accessToken) {
        try {
            GoogleUserInfoResponse response = restClient.get()
                    .uri(userInfoUrl)
                    .headers(headers -> headers.setBearerAuth(accessToken))
                    .retrieve()
                    .body(GoogleUserInfoResponse.class);
            if (response == null || !Boolean.TRUE.equals(response.emailVerified())) {
                throw new DomainException(ErrorCode.INVALID_CREDENTIALS);
            }
            return toOAuthUserInfo(response.sub(), response.email(), response.givenName(), response.familyName(), response.picture());
        } catch (DomainException e) {
            throw e;
        } catch (RuntimeException e) {
            throw new DomainException(ErrorCode.INVALID_CREDENTIALS, e);
        }
    }

    private OAuthUserInfo toOAuthUserInfo(String sub, String email, String firstName, String lastName, String avatarUrl) {
        if (!hasText(sub) || !hasText(email)) {
            throw new DomainException(ErrorCode.INVALID_CREDENTIALS);
        }
        return new OAuthUserInfo(
                UUID.nameUUIDFromBytes((PROVIDER + ":" + sub).getBytes(StandardCharsets.UTF_8)),
                email,
                email,
                firstName,
                lastName,
                avatarUrl,
                PROVIDER
        );
    }

    private boolean hasText(String value) {
        return value != null && !value.isBlank();
    }

    private record GoogleTokenResponse(
            @com.fasterxml.jackson.annotation.JsonProperty("id_token") String idToken
    ) {
    }

    private record GoogleTokenInfoResponse(
            String sub,
            String aud,
            String email,
            @com.fasterxml.jackson.annotation.JsonProperty("email_verified") String emailVerified,
            @com.fasterxml.jackson.annotation.JsonProperty("given_name") String givenName,
            @com.fasterxml.jackson.annotation.JsonProperty("family_name") String familyName,
            String picture
    ) {
    }

    private record GoogleUserInfoResponse(
            String sub,
            String email,
            @com.fasterxml.jackson.annotation.JsonProperty("email_verified") Boolean emailVerified,
            @com.fasterxml.jackson.annotation.JsonProperty("given_name") String givenName,
            @com.fasterxml.jackson.annotation.JsonProperty("family_name") String familyName,
            String picture
    ) {
    }
}
