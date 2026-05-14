package com.daiphat.accountservice.application.event;

import lombok.Builder;

@Builder
public record ForgotPasswordEvent(
    String email,
    String otp
) {}
