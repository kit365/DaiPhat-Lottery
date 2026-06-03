package com.daiphat.coreapi.domain.model.auth;

import java.util.UUID;


public record OAuthUserInfo(
    UUID externalId,    // sub/id from the OAuth provider
    String username,
    String email,
    String firstName,
    String lastName,
    String avatarUrl,
    String provider     // "google", etc.
) {
}
