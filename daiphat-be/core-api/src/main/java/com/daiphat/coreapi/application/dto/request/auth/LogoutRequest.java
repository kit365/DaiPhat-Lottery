package com.daiphat.coreapi.application.dto.request.auth;

public record LogoutRequest(
        String refreshToken
) {
}
