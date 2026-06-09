package com.daiphat.coreapi.application.event;

import lombok.Builder;

import java.util.UUID;

@Builder
public record UserEmailVerifiedEvent(
        UUID userId,
        String email,
        String fullName,
        String token
) {
}
