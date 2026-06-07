package com.daiphat.coreapi.application.event;

import lombok.Builder;

import java.util.UUID;

@Builder
public record AdminResetPasswordSuccessEvent(
        UUID userId,
        String email,
        String fullName,
        String password
) {
}
