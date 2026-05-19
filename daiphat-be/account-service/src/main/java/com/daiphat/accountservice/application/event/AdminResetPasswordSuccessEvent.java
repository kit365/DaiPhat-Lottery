package com.daiphat.accountservice.application.event;

import lombok.Builder;

@Builder
public record AdminResetPasswordSuccessEvent(
    String email,
    String fullName,
    String password
) {}
