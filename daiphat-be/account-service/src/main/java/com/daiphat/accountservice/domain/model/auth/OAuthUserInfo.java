package com.daiphat.accountservice.domain.model.auth;

import java.util.UUID;

/**
 * Domain object representing user information normalized from any OAuth provider.
 * This is used for JIT Provisioning without leaking DTOs to the domain layer.
 */
public record OAuthUserInfo(
    UUID externalId,    // sub/id from the provider (e.g., Keycloak UUID)
    String username,
    String email,
    String firstName,
    String lastName,
    String avatarUrl,
    String provider     // "keycloak", "google", etc.
) {
}

