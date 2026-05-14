package com.daiphat.accountservice.application.event;

import lombok.Builder;

@Builder
public record UserRegisteredEvent(
    String email,
    String firstName,
    String token
) {}
