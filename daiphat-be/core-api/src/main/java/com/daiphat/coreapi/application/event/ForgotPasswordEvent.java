package com.daiphat.coreapi.application.event;

import lombok.Builder;

import java.util.UUID;

@Builder
public record ForgotPasswordEvent(
    UUID userId,
    String email,
    String otp
) {}
