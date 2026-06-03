package com.daiphat.coreapi.application.event;

import lombok.Builder;

@Builder
public record AdminResetPasswordOtpEvent(
        String email,
        String fullName,
        String otp
) {
}
