package com.daiphat.coreapi.domain.model.auth;

public record AuthToken(
        String accessToken,
        String refreshToken,
        long expiresIn,
        long refreshExpiresIn,
        String tokenType
) {
}
