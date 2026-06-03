package com.daiphat.coreapi.application.event;

import lombok.Builder;

@Builder
public record AdminResetPasswordSuccessEvent(
        String email,
        String fullName,
        String password
) {
}
