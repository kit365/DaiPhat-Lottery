package com.daiphat.coreapi.application.event;

import lombok.Builder;

import java.util.UUID;

@Builder
public record UserWelcomeEvent(
        UUID userId,
        String email,
        String fullName
) {
}
