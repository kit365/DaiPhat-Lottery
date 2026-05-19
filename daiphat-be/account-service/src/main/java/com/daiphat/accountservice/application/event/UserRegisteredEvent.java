package com.daiphat.accountservice.application.event;

import lombok.Builder;

@Builder
public record UserRegisteredEvent(
    String email,
    String fullName,
    String token
) {}
