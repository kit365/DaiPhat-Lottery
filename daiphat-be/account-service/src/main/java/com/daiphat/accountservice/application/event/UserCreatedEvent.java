package com.daiphat.accountservice.application.event;

import lombok.Builder;

@Builder
public record UserCreatedEvent(
    String email,
    String firstName,
    String password
) {}
