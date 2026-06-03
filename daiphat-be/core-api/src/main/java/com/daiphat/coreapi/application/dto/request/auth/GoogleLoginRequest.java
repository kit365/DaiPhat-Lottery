package com.daiphat.coreapi.application.dto.request.auth;

public record GoogleLoginRequest(
        String code,
        String idToken,
        String accessToken,
        String redirectUri,
        String codeVerifier
) {
}
