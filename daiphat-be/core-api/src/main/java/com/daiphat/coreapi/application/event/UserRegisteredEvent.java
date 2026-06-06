package com.daiphat.coreapi.application.event;

import lombok.Builder;

import java.util.UUID;

@Builder
public record UserRegisteredEvent(
    UUID userId,
    String email,
    String fullName,
    String token
) {}
