package com.daiphat.accountservice.infrastructure.config.security;

import java.util.UUID;

/**
 * Principal object used to store authenticated user context from Gateway headers.
 */
public record SecurityUser(
    UUID id,
    String username,
    String email,
    String firstName,
    String lastName,
    String avatarUrl
) {
}
