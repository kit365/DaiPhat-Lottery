package com.daiphat.accountservice.application.event;

import lombok.Builder;

@Builder
public record AdminResetPasswordOtpEvent(
    String email,
    String fullName,
    String otp
) {}
